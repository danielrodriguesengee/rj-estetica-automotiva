// netlify/functions/slots.js
// GET /api/slots?date=2026-05-25
// Retorna os horários já ocupados no Google Calendar para a data informada

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

    // Intervalo completo do dia em UTC (compensando fuso de Brasília UTC-3)
    const timeMin = new Date(`${date}T00:00:00-03:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59-03:00`).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents  : true,
      orderBy       : 'startTime',
      fields        : 'items(id,summary,start,end)',
    });

    const events = response.data.items || [];

    // Extrai os slots ocupados como strings "HH:MM"
    const booked = events
      .filter(ev => ev.start?.dateTime)
      .map(ev => {
        const d = new Date(ev.start.dateTime);
        // Converte para horário de Brasília
        const brStr = d.toLocaleTimeString('pt-BR', {
          hour  : '2-digit',
          minute: '2-digit',
          timeZone: TZ,
        });
        return {
          time   : brStr,           // "08:00"
          eventId: ev.id,
          summary: ev.summary,
          end    : ev.end?.dateTime,
        };
      });

    return ok({ date, booked });

  } catch (e) {
    console.error('[slots] Erro:', e.message);
    return err(`Erro ao buscar agenda: ${e.message}`);
  }
};
