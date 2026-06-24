// netlify/functions/_telegram.js

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.warn('[Telegram] Token ou Chat ID ausente.');
    return;
  }

  const url = `https://telegram.org{token}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });

  const resp = await res.json();
  if (!resp.ok) {
    throw new Error(resp.description || 'Erro desconhecido');
  }

  console.log('[Telegram] Mensagem enviada com sucesso.');
  return resp;
}

module.exports = { sendTelegramMessage };
