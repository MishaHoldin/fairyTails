const { GoogleSpreadsheet } = require('google-spreadsheet');
const { googleSheetId, googleServiceEmail, googleServicePassword } = require('../config');

async function getSheet() {
  const doc = new GoogleSpreadsheet(googleSheetId);
  await doc.useServiceAccountAuth({
    client_email: googleServiceEmail,
    private_key: googleServicePassword.replace(/\\n/g, '\n')
  });
  await doc.loadInfo();
  return doc.sheetsByIndex[0];
}

// Додати функції для обліку генерацій, підписок

module.exports = { getSheet }; 