const { OpenAI } = require('openai');
const { openaiApiKey } = require('../config');

const openai = new OpenAI({ apiKey: openaiApiKey });

async function generateStory(topic, lang = 'uk') {
  const systemPrompt = lang === 'uk'
    ? `Ти — професійний дитячий казкар. Напиши унікальну казку на тему "${topic}" у художньому стилі з цікавою метафорою, грою слів і легким гумором.

Казка повинна бути **від 1450 до 1650 символів включно**. Пиши живо, з діалогами. Без заголовку.

Поверни строго JSON-об'єкт такого формату:

{
  "story": "<основний текст казки. Без слова 'Казка'.>",
  "moral": "<мораль одним абзацом. Не додавай 'Мораль:' або емодзі.>",
  "questions": ["<1-е питання>", "<2-е питання>", "<3-є питання>", "<4-е питання>"]
}

❗ Поверни тільки JSON. Нічого зайвого.`
    : `You are a professional children's storyteller. Write a unique fairy tale on the topic "${topic}" in a rich and imaginative style, with metaphors, vivid language, and a light touch of humor.

The story must be **between 1450 and 1650 characters**, written in a vivid, narrative tone with dialogue. No title.

Return a strict JSON object in the following format:

{
  "story": "<main story text>",
  "moral": "<the moral in one paragraph. Do NOT include 'Moral:' or emojis.>",
  "questions": ["<1st question>", "<2nd question>", "<3rd question>", "<4th question>"]
}

❗ Return only valid JSON. No explanation, no formatting outside JSON.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt }
    ],
    max_tokens: 1200,
    temperature: 0.85,
    presence_penalty: 0.3,
    frequency_penalty: 0.2
  });

  const raw = completion.choices[0].message.content.trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`GPT returned invalid JSON:\n\n${raw}`);
  }

  const storyText = parsed.story?.trim() || '';
  const storyLength = storyText.length;

  if (storyLength > 1650) {
    throw new Error(`Story is too long: ${storyLength}`);
  }
  
  const moral = parsed.moral?.trim() || '';
  const questions = parsed.questions || [];

  const formatted = [
    storyText,
    '⸻',
    `🧠 Мораль:\n${moral}`,
    '⸻',
    '💬 Питання для розмови з дитиною:',
    ...questions.map((q, i) => ` ${i + 1}. ${q}`)
  ].join('\n\n');

  return formatted;
}


async function generateRiddles(age = '3-4', lang = 'uk') {
  const systemPrompt = lang === 'uk'
    ? `Згенеруй 5 загадок для дітей віком ${age} на логіку, кмітливість і гумор.`
    : `Generate 5 riddles for children aged ${age} about logic, wit, and humor.`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt }
    ],
    max_tokens: 400
  });
  return completion.choices[0].message.content;
}

async function generatePhrases(lang = 'uk') {
  const systemPrompt = lang === 'uk'
    ? 'Згенеруй 5 незавершених креативних фраз для дітей.'
    : 'Generate 5 unfinished creative phrases for children.';
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt }
    ],
    max_tokens: 200
  });
  return completion.choices[0].message.content;
}

module.exports = { generateStory, generateRiddles, generatePhrases }; 