const { google } = require('googleapis');
const { logInvite } = require('../utils/logger');

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function generateInviteLink(chatId) {
  return `https://t.me/${process.env.BOT_USERNAME}?start=invite_${chatId}`;
}

async function handleInvite(chatId, referrerId) {
  try {
    // Log invite to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Invites!A:C',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          referrerId,
          chatId
        ]],
      },
    });

    // Log invite
    logInvite(referrerId, chatId);

    // TODO: Implement bonus logic here
    // For example, add extra generations to both users
    return {
      referrerBonus: 5, // Extra generations for referrer
      newUserBonus: 3,  // Extra generations for new user
    };
  } catch (error) {
    console.error('Error handling invite:', error);
    throw error;
  }
}

module.exports = {
  generateInviteLink,
  handleInvite,
}; 