// netlify/functions/slots.js
// GET /api/slots?date=2026-05-25
// Retorna os intervalos ocupados no Google Calendar para a data informada
// Leva em conta início E fim de cada evento — bloqueia todos os slots que colidem

const { getCalendarClient, ok, err, CORS_HEADERS } = require('./_gcal');

const TZ = 'America/Sao_Paulo';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const date = event.queryStringParameters?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return err('Parâmetro "date" obrigatório (formato YYYY-MM-DD).', 400);
  }

  try {
    const { calendar, calendarId } = getCalendarClient();

    const timeMin = new Date(`${date}T00:00:00-03:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59-03:00`).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents : true,
      orderBy      : 'startTime',
      fields       : 'items(id,summary,start,end)',
    });

    const events = response.data.items || [];

    // Para cada evento, retorna início e fim em minutos desde meia-noite (horário Brasília)
    // O frontend usa isso para bloquear qualquer slot que COLIDA com o intervalo
    const busy = events
      .filter(ev => ev.start?.dateTime && ev.end?.dateTime)
      .map(ev => {
        const startBR = new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
        const endBR   = new Date(ev.end.dateTime  ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
        return {
          startTime : startBR,            // "08:00"
          endTime   : endBR,              // "10:00"
          startMins : toMins(startBR),    // 480
          endMins   : toMins(endBR),      // 600
          summary   : ev.summary,
        };
      });

    return ok({ date, busy });

  } catch (e) {
    console.error('[slots] Erro:', e.message);
    return err(`Erro ao buscar agenda: ${e.message}`);
  }
};

function toMins(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}