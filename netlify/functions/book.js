// netlify/functions/book.js
// POST /api/book

const { getCalendarClient, ok, err, CORS_HEADERS } = require('./_gcal');
const { normalizePhone, waLink } = require('./_phone');

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

  const { name, vehicle, vtype, phone, date, time, service, extras = [], total } = body;

  if (!name || !vehicle || !phone || !date || !time || !service?.name) {
    return err('Campos obrigatórios ausentes.', 400);
  }

  // Normaliza o número do cliente
  const clientPhone    = normalizePhone(phone);
  const clientWaLink   = waLink(phone, `Olá ${name.split(' ')[0]}! Confirmando seu agendamento de ${service.name} em ${date.split('-').reverse().join('/')} às ${time}. Qualquer dúvida estamos à disposição! 😊`);

  try {
    const { calendar, calendarId } = getCalendarClient();

    const [y, mo, d]  = date.split('-').map(Number);
    const [hour, min] = time.split(':').map(Number);

    const extraDuration = extras.reduce((acc, ex) => acc + (ex.durationMinutes || 0), 0);
    const totalMinutes  = (service.durationMinutes || 60) + extraDuration;

    const startDate = new Date(y, mo - 1, d, hour, min);
    const endDate   = new Date(startDate.getTime() + totalMinutes * 60_000);

    const fmtPrice  = (n) => Number(n).toFixed(2).replace('.', ',');
    const extrasStr = extras.length ? `\n➕ Extras: ${extras.map(e => e.name).join(', ')}` : '';
    const dateStr   = date.split('-').reverse().join('/');

    const calEvent = {
      summary    : `${service.name} — ${name}`,
      description: [
        `🚘 Veículo: ${vehicle} (${vtype})`,
        `📞 WhatsApp: ${clientPhone}`,
        `🔧 Serviço: ${service.name}${extrasStr}`,
        `💰 Total: R$ ${fmtPrice(total)}`,

        `💬 Abrir conversa: ${clientWaLink}`,
        ``,
        `Agendado via site RJ Estética Automotiva`,
      ].join('\n'),
      start: { dateTime: toISOLocal(startDate), timeZone: TZ },
      end  : { dateTime: toISOLocal(endDate),   timeZone: TZ },
      colorId: '2',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 60 * 24 },
        ],
      },
    };

    const response = await calendar.events.insert({ calendarId, resource: calEvent });
    const created  = response.data;

    // AWAIT obrigatório em serverless
    try {
      await notifyOwner({ name, vehicle, vtype, clientPhone, clientWaLink, date: dateStr, time, service, extras, total, fmtPrice });
      console.log('[CallMeBot] Notificação enviada.');
    } catch (waErr) {
      console.error('[CallMeBot] Falha:', waErr.message);
    }

    return ok({ success: true, eventId: created.id, htmlLink: created.htmlLink, message: 'Agendamento criado com sucesso!' });

  } catch (e) {
    console.error('[book] Erro:', e.message);
    return err(`Erro ao criar agendamento: ${e.message}`);
  }
};

// ── Helpers ──────────────────────────────────────────

function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

async function notifyOwner({ name, vehicle, vtype, clientPhone, clientWaLink, date, time, service, extras, total, fmtPrice }) {
  const ownerPhone = process.env.CALLMEBOT_PHONE;
  const apikey     = process.env.CALLMEBOT_APIKEY;
  if (!ownerPhone || !apikey) { console.warn('[CallMeBot] Variáveis não definidas.'); return; }

  const extrasStr = extras.length ? `\n➕ Extras: ${extras.map(e => e.name).join(', ')}` : '';

  const text =
    `🚗 *NOVO AGENDAMENTO*\n\n` +
    `👤 Cliente: ${name}\n` +
    `📞 WhatsApp: ${clientPhone}\n` +
    `🚘 Veículo: ${vehicle} (${vtype})\n` +
    `🔧 Serviço: ${service.name}${extrasStr}\n` +
    `📅 Data: ${date} às ${time}\n` +
    `💰 Total: R$ ${fmtPrice(total)}\n\n\n` +
    `💬 Falar com cliente: ${clientWaLink}\n\n` +
    `RJ Estética Automotiva`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${ownerPhone}&text=${encodeURIComponent(text)}&apikey=${apikey}`;
  console.log('[CallMeBot] Chamando para:', ownerPhone);

  const res  = await fetch(url);
  const resp = await res.text();
  console.log('[CallMeBot] Resposta:', res.status, resp.slice(0, 120));
}