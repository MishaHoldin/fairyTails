const axios = require('axios');
const { elevenlabsApiKey } = require('../config');

const VOICES = {
  uk_female: 'EXAVITQu4vr4xnSDxMaL',
  uk_male: 'ErXwobaYiN019PkySvjV',
  en_female: 'MF3mGyEYCl7XYWbV9V6O',
  en_male: 'pNInz6obpgDQGcFmaJgB'
};

async function generateAudio(text, voice = 'female', lang = 'uk', style = 'default') {
  const voiceKey = `${lang}_${voice}`;
  const voiceId = VOICES[voiceKey];

  if (!voiceId) {
    throw new Error(`Voice not found for ${voiceKey}`);
  }

  const voiceSettings = {
    stability: 0.5,
    similarity_boost: 0.5
  };

  // Не добавляем style для украинских голосов (они его не поддерживают)
  if (lang !== 'uk' && style !== 'default' && ['emotional', 'narration'].includes(style)) {
    voiceSettings.style = style;
  }

  const payload = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: voiceSettings
  };

  console.log('🎤 [generateAudio] Request payload:', JSON.stringify(payload, null, 2));
  console.log('🎤 [generateAudio] Voice ID:', voiceId);
  console.log('🎤 [generateAudio] Text length:', text.length);

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      payload,
      {
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    console.log('✅ [generateAudio] Audio buffer received:', response.data.length, 'bytes');
    return response.data;

  } catch (error) {
    console.error('❌ [generateAudio] Request failed:', error.response?.status || error.message);
    if (error.response?.data) {
      try {
        const json = JSON.parse(Buffer.from(error.response.data).toString('utf8'));
        console.error('🧾 Error response:', json);
      } catch {
        console.error('🧾 Raw error response:', error.response.data.toString('utf8').slice(0, 300));
      }
    }
    throw new Error(`Audio generation failed: ${error.message}`);
  }
}

module.exports = { generateAudio };
