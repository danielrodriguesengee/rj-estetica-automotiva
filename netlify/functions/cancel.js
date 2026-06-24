// netlify/functions/cancel.js
// POST /api/cancel
// Body: { name, phone }

const { getCalendarClient, ok, err, CORS_HEADERS } = require('./_gcal');
const { normalizePhone } = require('./_phone');
const { sendTelegramMessage } = require('./_telegram');

const TZ = 'America/Sao_Paulo';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return err('Método não permitido.', 405);
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('JSON inválido.', 400); }

  const { name, phone } = body;
  if (!name || !phone) return err('Nome e WhatsApp são obrigatórios.', 400);

  // Normaliza e gera todas as variações possíveis para busca
  const normalizedPhone = normalizePhone(phone);   // +5537984243487
  const digitsOnly      = normalizedPhone.replace(/\D/g, ''); // 5537984243487
  const noCountry       = digitsOnly.slice(2);     // 37984243487
  const noNine          = noCountry.replace(/^(\d{2})9(\d{8})$/, '$1$2'); // 3784243487

  try {
    const { calendar, calendarId } = getCalendarClient();

    const now = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId,
      q           : name,
      timeMin     : now,
      singleEvents: true,
      orderBy     : 'startTime',
      maxResults  : 20,
    });

    const events = response.data.items || [];

    // Busca pelo número em qualquer uma das variações
    const match = events.find(ev => {
      const desc = (ev.description || '').replace(/\D/g, '');
      return (
        desc.includes(digitsOnly) ||
        desc.includes(noCountry)  ||
        desc.includes(noNine)
      );
    });

    if (!match) {
      return ok({ success: false, message: 'Nenhum agendamento futuro encontrado com esses dados.' });
    }

    // Extrai info do evento antes de deletar
    const evSummary = match.summary || 'Agendamento';
    const evStart   = match.start?.dateTime
      ? new Date(match.start.dateTime).toLocaleString('pt-BR', { timeZone: TZ })
      : 'data desconhecida';

    await calendar.events.delete({ calendarId, eventId: match.id });

    // Notifica o dono — AWAIT obrigatório em serverless (WhatsApp)
    try {
      await notifyCancel({ name, normalizedPhone, evSummary, evStart });
      console.log('[CallMeBot] Notificação de cancelamento enviada.');
    } catch (waErr) {
      console.error('[CallMeBot] Falha no cancelamento:', waErr.message);
    }

    // Notifica o dono — AWAIT obrigatório em serverless (Telegram)
    try {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      // Sanitiza caracteres que possam quebrar a formatação do Markdown clássico
      const cleanSummary = evSummary.replace(/[_*`\[]/g, '');
      
      const text =
        `❌ *AGENDAMENTO CANCELADO*\n\n` +
        `👤 *Cliente:* ${name}\n` +
        `📞 *WhatsApp:* ${normalizedPhone}\n` +
        `📋 *Serviço:* ${cleanSummary}\n` +
        `📅 *Era:* ${evStart}\n\n` +
        `RJ Estética Automotiva`;

      await sendTelegramMessage(chatId, text);
      console.log('[Telegram] Notificação de cancelamento enviada.');
    } catch (tgErr) {
      console.error('[Telegram] Falha ao notificar cancelamento:', tgErr.message);
    }

    return ok({ success: true, message: `Agendamento "${evSummary}" cancelado com sucesso.` });

  } catch (e) {
    console.error('[cancel] Erro:', e.message);
    return err(`Erro ao cancelar: ${e.message}`);
  }
};

async function notifyCancel({ name, normalizedPhone, evSummary, evStart }) {
  const ownerPhone = process.env.CALLMEBOT_PHONE;
  const apikey     = process.env.CALLMEBOT_APIKEY;
  if (!ownerPhone || !apikey) { console.warn('[CallMeBot] Variáveis não definidas.'); return; }

  const text =
    `❌ *AGENDAMENTO CANCELADO*\n\n` +
    `👤 Cliente: ${name}\n` +
    `📞 WhatsApp: ${normalizedPhone}\n` +
    `📋 Serviço: ${evSummary}\n` +
    `📅 Era: ${evStart}\n\n` +
    `RJ Estética Automotiva`;

  const url = `https://callmebot.com{ownerPhone}&text=${encodeURIComponent(text)}&apikey=${apikey}`;
  console.log('[CallMeBot] Notificando cancelamento para:', ownerPhone);

  const res  = await fetch(url);
  const resp = await res.text();
  console.log('[CallMeBot] Resposta cancelamento:', res.status, resp.slice(0, 80));
}
