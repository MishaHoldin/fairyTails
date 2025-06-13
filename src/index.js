require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { InputFile } = require('node-telegram-bot-api');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const { 
  logStoryGeneration, 
  logImageGeneration, 
  logAudioGeneration, 
  logRiddleGeneration, 
  logPhraseGeneration,
  logError 
} = require('./utils/logger');

const { generateStory, generateRiddles, generatePhrases } = require('./services/openai');
const { generateImage } = require('./services/dalle');
const { generateAudio } = require('./services/elevenlabs');
const { checkLimit, incrementUsage } = require('./utils/limiter');

const bot = new TelegramBot(process.env.TG_BOT_TOKEN, { polling: true });

// i18n init
i18next.use(Backend).init({
  lng: 'uk',
  fallbackLng: 'uk',
  backend: {
    loadPath: path.join(__dirname, 'localization/{{lng}}.json')
  }
});

const LANGS = {
  uk: 'Українська',
  en: 'English'
};

const getMainMenu = (lang) => ({
  reply_markup: {
    keyboard: [
      [{ text: lang === 'uk' ? 'Казка' : 'Story' }],
      [{ text: lang === 'uk' ? 'Загадки' : 'Riddles' }, { text: lang === 'uk' ? 'Креатив' : 'Creativity' }],
      [{ text: lang === 'uk' ? 'Візуальний креатив' : 'Visual Creativity' }],
      [
        { text: lang === 'uk' ? '📊 Мої ліміти' : '📊 My Limits' },
        { text: lang === 'uk' ? '💳 Оплата' : '💳 Payment' }
      ],
      [{ text: lang === 'uk' ? '🎁 Запросити друга' : '🎁 Invite Friend' }]
    ],
    resize_keyboard: true
  }
});

const userLang = {};
const userState = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = null;
  bot.sendMessage(chatId, i18next.t('choose_language'), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Українська', callback_data: 'lang_uk' },
          { text: 'English', callback_data: 'lang_en' }
        ]
      ]
    }
  });
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  if (query.data.startsWith('lang_')) {
    const lang = query.data.split('_')[1];
    userLang[chatId] = lang;
    userState[chatId] = null;
    i18next.changeLanguage(lang);
    bot.sendMessage(chatId, i18next.t('start'), getMainMenu(lang));
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const lang = userLang[chatId] || 'uk';
  const text = msg.text;

  try {
    if (userState[chatId]?.step === 'awaiting_story_topic') {
      const topic = text;
      logStoryGeneration(chatId, topic, lang);
    
      if (!(await checkLimit(chatId))) {
        userState[chatId] = null;
        return bot.sendMessage(chatId, lang === 'uk' ? 'Вичерпано ліміт генерацій.' : 'Generation limit reached.');
      }
    
      await bot.sendMessage(chatId, lang === 'uk' ? '⏳ Генерація триває...' : '⏳ Generating...');
    
      try {
        const storyText = await generateStory(topic, lang);
        await incrementUsage(chatId);
    
        const output = `${i18next.t('story_ready', { lng: lang })}\n\n${storyText}`;
        await bot.sendMessage(chatId, output);
      } catch (err) {
        logError(err, { chatId, text, step: 'awaiting_story_topic' });
        userState[chatId] = null;
        return bot.sendMessage(chatId, lang === 'uk'
          ? 'Не вдалося згенерувати правильну казку. Спробуйте іншу тему.'
          : 'Failed to generate a valid story. Please try another topic.');
      }
    
      // Картинка (с fallback)
      try {
        logImageGeneration(chatId, topic);
        await bot.sendMessage(chatId, lang === 'uk' ? 'Генерую зображення...' : 'Generating image...');
        const image = await generateImage(topic);
        console.log('📦 [sendPhoto] Sending image buffer to Telegram. Size:', image.length);
        await bot.sendPhoto(chatId, image, {
          filename: 'story.png',
          contentType: 'image/png'
        });
      } catch (err) {
        logError(err, { chatId, step: 'image_generation' });
        await bot.sendMessage(chatId, lang === 'uk'
          ? '⚠️ Не вдалося згенерувати зображення. Але казка вже готова!'
          : '⚠️ Failed to generate image. But the story is ready!');
      }
    
      // Озвучка (без генерации на этом этапе — только предложение)
      try {
        await bot.sendMessage(chatId, lang === 'uk'
          ? 'Озвучити казку? (жіночий/чоловічий/нейтральний голос)'
          : 'Voice the story? (female/male/neutral voice)');
        userState[chatId] = { step: 'awaiting_voice', storyText, lang };
      } catch (err) {
        logError(err, { chatId, step: 'voice_suggestion' });
        await bot.sendMessage(chatId, lang === 'uk'
          ? '⚠️ Не вдалося перейти до озвучки.'
          : '⚠️ Failed to continue to voicing step.');
        userState[chatId] = null;
      }
    
      return;
    }
    
    
    // Якщо очікуємо вибір голосу
    if (userState[chatId]?.step === 'awaiting_voice') {
      const voice = text.toLowerCase().includes('чол') || text.toLowerCase().includes('male') ? 'male' :
                    text.toLowerCase().includes('нейтр') || text.toLowerCase().includes('neutral') ? 'neutral' : 'female';
      bot.sendMessage(chatId, lang === 'uk' ? 'Оберіть інтонацію: звичайна, емоційна, казкова' : 'Choose intonation: normal, emotional, fairy-tale');
      userState[chatId] = { ...userState[chatId], step: 'awaiting_style', voice };
      return;
    }

    // Якщо очікуємо вибір інтонації
    if (userState[chatId]?.step === 'awaiting_style') {
      let style = 'default';
      if (text.toLowerCase().includes('емоц') || text.toLowerCase().includes('emot')) style = 'emotional';
      else if (text.toLowerCase().includes('казк') || text.toLowerCase().includes('fairy')) style = 'narration';
      
      logAudioGeneration(chatId, userState[chatId].voice, style);
      bot.sendMessage(chatId, lang === 'uk' ? 'Генерую аудіо...' : 'Generating audio...');
      
      const { storyText, voice, lang: userLangVal } = userState[chatId];
      const audio = await generateAudio(storyText, voice, userLangVal, style);
      bot.sendAudio(chatId, audio, {}, { filename: 'story.mp3', contentType: 'audio/mpeg' });
      userState[chatId] = null;
      return;
    }

    // Головне меню
    if (text === 'Казка' || text === 'Story') {
      bot.sendMessage(chatId, lang === 'uk' ? 'Введіть тему казки:' : 'Enter a story topic:');
      userState[chatId] = { step: 'awaiting_story_topic' };
      return;
    } else if (text === 'Загадки' || text === 'Riddles') {
      bot.sendMessage(chatId, lang === 'uk' ? 'Оберіть вік: 3-4 або 5-6' : 'Choose age: 3-4 or 5-6');
      userState[chatId] = { step: 'awaiting_riddle_age' };
      return;
    } else if (userState[chatId]?.step === 'awaiting_riddle_age') {
      const age = text.includes('5') ? '5-6' : '3-4';
      logRiddleGeneration(chatId, age, lang);
      const riddles = await generateRiddles(age, lang);
      bot.sendMessage(chatId, `${i18next.t('riddles_ready', { lng: lang })}\n\n${riddles}`);
      userState[chatId] = null;
      return;
    } else if (text === 'Креатив' || text === 'Creativity') {
      logPhraseGeneration(chatId, lang);
      const phrases = await generatePhrases(lang);
      bot.sendMessage(chatId, `${i18next.t('phrases_ready', { lng: lang })}\n\n${phrases}`);
      userState[chatId] = null;
      return;
    } else if (text === 'Візуальний креатив' || text === 'Visual Creativity') {
      logImageGeneration(chatId, 'abstract lines and objects, children creativity');
      bot.sendMessage(chatId, lang === 'uk' ? 'Генерую креативне зображення...' : 'Generating creative image...');
      const image = await generateImage('abstract lines and objects, children creativity');
      bot.sendPhoto(chatId, image, {}, { filename: 'creative.png', contentType: 'image/png' });
      bot.sendMessage(chatId, i18next.t('visual_creativity', { lng: lang }));
      userState[chatId] = null;
      return;
    } else if (text === '📊 Мої ліміти' || text === '📊 My Limits') {
      // TODO: Implement limit checking
      const limits = await checkLimit(chatId);
      const message = lang === 'uk' 
        ? `Ваші поточні ліміти:\n\nЗалишилось генерацій: ${limits.remaining}\nЗагальний ліміт: ${limits.total}`
        : `Your current limits:\n\nRemaining generations: ${limits.remaining}\nTotal limit: ${limits.total}`;
      bot.sendMessage(chatId, message);
      return;
    } else if (text === '💳 Оплата' || text === '💳 Payment') {
      // TODO: Implement Stripe payment
      const paymentMessage = lang === 'uk'
        ? 'Для оплати перейдіть за посиланням: [Stripe Payment Link]'
        : 'To make a payment, follow the link: [Stripe Payment Link]';
      bot.sendMessage(chatId, paymentMessage);
      return;
    } else if (text === '🎁 Запросити друга' || text === '🎁 Invite Friend') {
      // TODO: Implement invite link generation
      const inviteLink = `https://t.me/${process.env.BOT_USERNAME}?start=invite_${chatId}`;
      const inviteMessage = lang === 'uk'
        ? `Ваше запрошувальне посилання:\n${inviteLink}\n\nЗапрошуйте друзів та отримуйте бонуси!`
        : `Your invite link:\n${inviteLink}\n\nInvite friends and get bonuses!`;
      bot.sendMessage(chatId, inviteMessage);
      return;
    }
  } catch (error) {
    logError(error, { chatId, text, state: userState[chatId] });
    bot.sendMessage(chatId, lang === 'uk' ? 'Сталася помилка. Спробуйте ще раз.' : 'An error occurred. Please try again.');
    userState[chatId] = null;
  }
});

// TODO: Додати обробку генерації казок, зображень, аудіо, креативних кнопок 