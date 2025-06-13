require('dotenv').config();
const axios = require('axios');

const VOICES = {
  uk_female: 'EXAVITQu4vr4xnSDxMaL', // Rachel (может не поддерживать стиль)
  uk_male: 'ErXwobaYiN019PkySvjV',   // Adam
  en_female: 'MF3mGyEYCl7XYWbV9V6O', // Nicole
  en_male: 'pNInz6obpgDQGcFmaJgB'    // Adam
};

const storyText = `Жив собі хлопчик на ім'я Олексійко, який дуже любив гратися на природі. Одного разу... [и т.д.]`;

const lang = 'uk';
const voice = 'female';
const style = 'narration'; // попробуй также 'emotional' или 'default'

const voiceKey = `${lang}_${voice}`;
const voiceId = VOICES[voiceKey];

if (!voiceId) {
  console.error(`❌ Voice ID not found for ${voiceKey}`);
  process.exit(1);
}

const voiceSettings = {
  stability: 0.5,
  similarity_boost: 0.5
};

// Только если стиль реально применим
if (style !== 'default' && voiceId !== 'EXAVITQu4vr4xnSDxMaL') {
  voiceSettings.style = style;
}

const payload = {
  text: storyText,
  model_id: 'eleven_multilingual_v2',
  voice_settings: voiceSettings
};

console.log('🎤 Request payload:', JSON.stringify(payload, null, 2));
console.log('🎤 Voice ID:', voiceId);

axios.post(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  payload,
  {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    responseType: 'arraybuffer'
  }
).then((res) => {
  console.log('✅ Audio buffer received. Size:', res.data.length);

  // Сохраним как файл
  const fs = require('fs');
  fs.writeFileSync('test-output.mp3', res.data);
  console.log('🎧 Saved as test-output.mp3');
}).catch((err) => {
  console.error('❌ Request failed:', err.response?.status || err.message);
  if (err.response?.data) {
    try {
      const json = JSON.parse(Buffer.from(err.response.data).toString('utf8'));
      console.error('🧾 Error response:', json);
    } catch {
      console.error('🧾 Raw error response:', err.response.data.toString('utf8').slice(0, 500));
    }
  }
});
