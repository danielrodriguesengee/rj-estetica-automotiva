// netlify/functions/book.js
// POST /api/book
// Body: { name, vehicle, vtype, phone, date, time, service, extras, total }

const { getCalendarClient, ok, err, CORS_HEADERS } = require('./_gcal');

const TZ = 'America/Sao_Paulo';

exports.handler = async (event) => {
  // Preflight CORS
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

  // Validação mínima
  if (!name || !vehicle || !phone || !date || !time || !service?.name) {
    return err('Campos obrigatórios ausentes.', 400);
  }

  try {
    const { calendar, calendarId } = getCalendarClient();

    // Monta data/hora de início e fim
    const [y, mo, d]   = date.split('-').map(Number);
    const [hour, min]  = time.split(':').map(Number);

    // Duração total = serviço principal + extras
    const extraDuration = (extras || []).reduce((acc, ex) => acc + (ex.durationMinutes || 0), 0);
    const totalMinutes  = (service.durationMinutes || 60) + extraDuration;

    const startDate = new Date(y, mo - 1, d, hour, min);
    const endDate   = new Date(startDate.getTime() + totalMinutes * 60_000);

    const extrasStr = extras.length
      ? `\n➕ Extras: ${extras.map(e => e.name).join(', ')}`
      : '';

    const fmtPrice = (n) => Number(n).toFixed(2).replace('.', ',');

    const event = {
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
      colorId: '2', // verde
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
      resource: event,
    });

    const created = response.data;

    // Dispara notificação WhatsApp (CallMeBot) de forma assíncrona
    // Não aguardamos — se falhar não bloqueia o agendamento
    notifyWhatsApp({ name, vehicle, vtype, phone, date, time, service, extras, total })
      .catch(e => console.error('[CallMeBot]', e.message));

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

/** Converte Date local para string ISO sem converter para UTC */
function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

/** Notifica o dono via CallMeBot (HTTP GET) */
async function notifyWhatsApp(b) {
  const phone  = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;

  const fmtPrice = (n) => Number(n).toFixed(2).replace('.', ',');
  const dateStr  = b.date.split('-').reverse().join('/');
  const extrasStr = b.extras.length
    ? `\n➕ Extras: ${b.extras.map(e => e.name).join(', ')}`
    : '';

  const msg = encodeURIComponent(
    `🚗 *NOVO AGENDAMENTO*\n\n` +
    `👤 Cliente: ${b.name}\n` +
    `📞 WhatsApp: ${b.phone}\n` +
    `🚘 Veículo: ${b.vehicle} (${b.vtype})\n` +
    `🔧 Serviço: ${b.service.name}${extrasStr}\n` +
    `📅 Data: ${dateStr} às ${b.time}\n` +
    `💰 Total: R$ ${fmtPrice(b.total)}\n\n` +
    `RJ Estética Automotiva`
  );

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${msg}&apikey=${apikey}`;

  // Node 18+ tem fetch nativo
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}`);
}
