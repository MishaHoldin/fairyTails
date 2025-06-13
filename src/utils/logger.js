const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'dream-bot' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Створюємо функції для логування різних етапів
const logStoryGeneration = (chatId, topic, lang) => {
  logger.info('Story generation started', {
    chatId,
    topic,
    lang,
    timestamp: new Date().toISOString()
  });
};

const logImageGeneration = (chatId, prompt) => {
  logger.info('Image generation started', {
    chatId,
    prompt,
    timestamp: new Date().toISOString()
  });
};

const logAudioGeneration = (chatId, voice, style) => {
  logger.info('Audio generation started', {
    chatId,
    voice,
    style,
    timestamp: new Date().toISOString()
  });
};

const logRiddleGeneration = (chatId, age, lang) => {
  logger.info('Riddle generation started', {
    chatId,
    age,
    lang,
    timestamp: new Date().toISOString()
  });
};

const logPhraseGeneration = (chatId, lang) => {
  logger.info('Phrase generation started', {
    chatId,
    lang,
    timestamp: new Date().toISOString()
  });
};

const logError = (error, context) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

function logPayment(chatId, amount, status) {
  console.log(`[PAYMENT] Chat ID: ${chatId}, Amount: ${amount}, Status: ${status}`);
}

function logInvite(referrerId, newUserId) {
  console.log(`[INVITE] Referrer: ${referrerId}, New User: ${newUserId}`);
}

module.exports = {
  logger,
  logStoryGeneration,
  logImageGeneration,
  logAudioGeneration,
  logRiddleGeneration,
  logPhraseGeneration,
  logError,
  logPayment,
  logInvite
}; 