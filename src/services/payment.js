const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { google } = require('googleapis');
const { logPayment } = require('../utils/logger');

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function createPaymentLink(chatId, amount, currency = 'uah') {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: 'Premium Access',
          },
          unit_amount: amount * 100, // amount in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://t.me/${process.env.BOT_USERNAME}?start=payment_success`,
      cancel_url: `https://t.me/${process.env.BOT_USERNAME}?start=payment_cancel`,
      metadata: {
        chatId: chatId.toString(),
      },
    });

    return session.url;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

async function handleWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const chatId = session.metadata.chatId;
    
    // Log payment to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Payments!A:D',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toISOString(),
          chatId,
          session.amount_total / 100,
          session.payment_status
        ]],
      },
    });

    // Log payment
    logPayment(chatId, session.amount_total / 100, session.payment_status);
  }
}

module.exports = {
  createPaymentLink,
  handleWebhook,
}; 