// netlify/functions/_gcal.js
// Módulo compartilhado: autentica via Service Account e retorna o cliente Calendar

const { google } = require('googleapis');

const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
const SCOPES      = ['https://www.googleapis.com/auth/calendar.events'];

/**
 * Retorna { auth, calendar, calendarId }
 * Lê GOOGLE_CREDENTIALS do env do Netlify (conteúdo do credentials.json em JSON string)
 */
function getCalendarClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error('Variável GOOGLE_CREDENTIALS não encontrada no ambiente.');

  const creds = JSON.parse(raw);

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: SCOPES,
  });

  const calendar = google.calendar({ version: 'v3', auth });

  return { auth, calendar, calendarId: CALENDAR_ID };
}

/**
 * Cabeçalhos CORS padrão para todas as functions
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type'                 : 'application/json',
};

function ok(body, status = 200) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function err(message, status = 500) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
}

module.exports = { getCalendarClient, ok, err, CORS_HEADERS };
