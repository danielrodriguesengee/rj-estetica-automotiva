// netlify/functions/cancel.js
// POST /api/cancel
// Body: { name, phone }
// Busca eventos que contenham o nome + telefone na descrição e remove o mais próximo futuro

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

  const { name, phone } = body;
  if (!name || !phone) {
    return err('Nome e WhatsApp são obrigatórios.', 400);
  }

  try {
    const { calendar, calendarId } = getCalendarClient();

    // Busca eventos futuros com o nome do cliente
    const now = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId,
      q          : name,           // busca no summary e description
      timeMin    : now,
      singleEvents: true,
      orderBy    : 'startTime',
      maxResults : 10,
    });

    const events = response.data.items || [];

    // Filtra pelo telefone na descrição para garantir correspondência
    const phoneClean = phone.replace(/\D/g, ''); // apenas dígitos
    const match = events.find(ev => {
      const desc = (ev.description || '').replace(/\D/g, '');
      return desc.includes(phoneClean);
    });

    if (!match) {
      return ok({
        success: false,
        message: 'Nenhum agendamento futuro encontrado com esses dados.',
      });
    }

    // Deleta o evento encontrado
    await calendar.events.delete({
      calendarId,
      eventId: match.id,
    });

    // Notifica o dono via WhatsApp
    notifyCancel(name, phone, match).catch(e => console.error('[cancel WA]', e.message));

    return ok({
      success: true,
      message: `Agendamento "${match.summary}" cancelado com sucesso.`,
    });

  } catch (e) {
    console.error('[cancel] Erro:', e.message);
    return err(`Erro ao cancelar: ${e.message}`);
  }
};

async function notifyCancel(name, phone, ev) {
  const apiPhone = process.env.CALLMEBOT_PHONE;
  const apikey   = process.env.CALLMEBOT_APIKEY;
  if (!apiPhone || !apikey) return;

  const start = ev.start?.dateTime
    ? new Date(ev.start.dateTime).toLocaleString('pt-BR', { timeZone: TZ })
    : 'data desconhecida';

  const msg = encodeURIComponent(
    `❌ *AGENDAMENTO CANCELADO*\n\n` +
    `👤 Cliente: ${name}\n` +
    `📞 WhatsApp: ${phone}\n` +
    `📅 Era: ${start}\n` +
    `📋 Serviço: ${ev.summary}\n\n` +
    `RJ Estética Automotiva`
  );

  const url = `https://api.callmebot.com/whatsapp.php?phone=${apiPhone}&text=${msg}&apikey=${apikey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}`);
}
