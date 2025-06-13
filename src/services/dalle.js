const axios = require('axios');
const FormData = require('form-data');
const { stabilityApiKey, openaiApiKey } = require('../config');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: openaiApiKey });

async function translateToEnglish(text) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Translate the following text to English, keep it short and suitable for an image generation prompt.' },
      { role: 'user', content: text }
    ],
    max_tokens: 100
  });
  return completion.choices[0].message.content.trim();
}

async function generateImage(prompt) {
  console.log('🟡 [generateImage] Original prompt:', prompt);

  const isCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(prompt);
  let promptEn = prompt;
  if (isCyrillic) {
    promptEn = await translateToEnglish(prompt);
    console.log('🔠 [generateImage] Translated prompt:', promptEn);

    promptEn = promptEn.replace(/[^\w\s.,!?'"-]/g, '');
    if (promptEn.length > 300) {
      promptEn = promptEn.slice(0, 300);
    }
    console.log('🧹 [generateImage] Cleaned prompt:', promptEn);
  }

  const form = new FormData();
  form.append('model', 'sd3.5-large-turbo');
  form.append('prompt', promptEn);
  form.append('output_format', 'png');

  try {
    console.log('📤 [generateImage] Sending request to Stability...');
    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/sd3',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${stabilityApiKey}`
        },
        responseType: 'arraybuffer'
      }
    );

    const contentType = response.headers['content-type'];
    console.log('📥 [generateImage] Response Content-Type:', contentType);

    if (contentType.startsWith('image/')) {
      console.log('✅ [generateImage] Received binary image.');
      return response.data;
    }

    // Возможно JSON с base64
    const json = JSON.parse(response.data.toString('utf8'));
    if (json.image) {
      console.log('🧩 [generateImage] Decoding base64 image from JSON.');
      return Buffer.from(json.image, 'base64');
    }

    throw new Error(`JSON response without image field`);

  } catch (error) {
    console.error('🔥 [generateImage] Error occurred:', error.message);

    if (error.response?.status) {
      console.error('📛 [generateImage] Status Code:', error.response.status);
    }

    const previewData = error.response?.data?.toString?.('utf8', 0, 300);
    if (previewData) {
      console.error('🧾 [generateImage] Response preview:\n', previewData);
    }

    throw new Error(`Image generation failed: ${error.message}`);
  }
}

module.exports = { generateImage };
