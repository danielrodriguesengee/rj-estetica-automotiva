// netlify/functions/book.js
// POST /api/book
// Body: { name, vehicle, vtype, phone, date, time, service, extras, total }

const { getCalendarClient, ok, err, CORS_HEADERS } = require('./_gcal');

const TZ = 'America/Sao_Paulo';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return err('Método não permitido.', 405);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return err('JSON inválido.', 400);
  }

  const { name, vehicle, vtype, phone, date, time, service, extras = [], total } = body;

  if (!name || !vehicle || !phone || !date || !time || !service?.name) {
    return err('Campos obrigatórios ausentes.', 400);
  }

  try {
    const { calendar, calendarId } = getCalendarClient();

    const [y, mo, d]  = date.split('-').map(Number);
    const [hour, min] = time.split(':').map(Number);

    const extraDuration = (extras || []).reduce((acc, ex) => acc + (ex.durationMinutes || 0), 0);
    const totalMinutes  = (service.durationMinutes || 60) + extraDuration;

    const startDate = new Date(y, mo - 1, d, hour, min);
    const endDate   = new Date(startDate.getTime() + totalMinutes * 60_000);

    const extrasStr = extras.length
      ? `\n➕ Extras: ${extras.map(e => e.name).join(', ')}`
      : '';

    const fmtPrice = (n) => Number(n).toFixed(2).replace('.', ',');

    const calEvent = {
      summary    : `${service.name} — ${name}`,
      description: [
        `🚘 Veículo: ${vehicle} (${vtype})`,
        `📞 WhatsApp: ${phone}`,
        `🔧 Serviço: ${service.name}${extrasStr}`,
        `💰 Total: R$ ${fmtPrice(total)}`,
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

    const response = await calendar.events.insert({
      calendarId,
      resource: calEvent,
    });

    const created = response.data;

    // AWAIT obrigatório em serverless — o processo encerra ao retornar,
    // chamadas fire-and-forget nunca completam em Netlify Functions.
    try {
      await notifyWhatsApp({ name, vehicle, vtype, phone, date, time, service, extras, total });
      console.log('[CallMeBot] Notificação enviada.');
    } catch (waErr) {
      console.error('[CallMeBot] Falha:', waErr.message);
    }

    return ok({
      success : true,
      eventId : created.id,
      htmlLink: created.htmlLink,
      message : 'Agendamento criado com sucesso!',
    });

  } catch (e) {
    console.error('[book] Erro:', e.message, e.stack);
    return err(`Erro ao criar agendamento: ${e.message}`);
  }
};

// ── Helpers ──────────────────────────────────────────

function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

async function notifyWhatsApp(b) {
  const waPhone = process.env.CALLMEBOT_PHONE;
  const apikey  = process.env.CALLMEBOT_APIKEY;

  if (!waPhone || !apikey) {
    console.warn('[CallMeBot] Variáveis CALLMEBOT_PHONE ou CALLMEBOT_APIKEY não definidas.');
    return;
  }

  const fmtPrice  = (n) => Number(n).toFixed(2).replace('.', ',');
  const dateStr   = b.date.split('-').reverse().join('/');
  const extrasStr = b.extras.length
    ? `\n➕ Extras: ${b.extras.map(e => e.name).join(', ')}`
    : '';

  const text = 
    `🚗 *NOVO AGENDAMENTO*\n\n` +
    `👤 Cliente: ${b.name}\n` +
    `📞 WhatsApp: ${b.phone}\n` +
    `🚘 Veículo: ${b.vehicle} (${b.vtype})\n` +
    `🔧 Serviço: ${b.service.name}${extrasStr}\n` +
    `📅 Data: ${dateStr} às ${b.time}\n` +
    `💰 Total: R$ ${fmtPrice(b.total)}\n\n` +
    `RJ Estética Automotiva`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${waPhone}&text=${encodeURIComponent(text)}&apikey=${apikey}`;

  console.log('[CallMeBot] Chamando:', url.replace(apikey, '***'));

  const res = await fetch(url);
  const body = await res.text();
  console.log('[CallMeBot] Resposta:', res.status, body.slice(0, 120));

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 80)}`);
}