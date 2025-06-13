// Простий ліміт за допомогою Google Sheets (заготовка)
const { getSheet } = require('../services/sheets');

async function checkLimit(userId) {
  // TODO: Реалізувати перевірку ліміту для userId
  return true;
}

async function incrementUsage(userId) {
  // TODO: Реалізувати інкремент генерацій для userId
}

module.exports = { checkLimit, incrementUsage }; 