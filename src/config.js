require('dotenv').config();

module.exports = {
  tgBotToken: process.env.TG_BOT_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  stabilityApiKey: process.env.STABILITY_API_KEY,
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleServiceEmail: process.env.GOOGLE_SERVICE_EMAIL,
  googleServicePassword: process.env.GOOGLE_SERVICE_PASSWORD
}; 