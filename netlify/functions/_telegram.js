// netlify/functions/_telegram.js

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.error('[Telegram] ERRO: Token ou Chat ID ausente no ambiente.', { token: !!token, chatId: !!chatId });
    return;
  }

  const url = `https://telegram.org{token}/sendMessage`;

  console.log(`[Telegram] Tentando enviar para o ID: ${chatId}`);

  try {
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
    console.log('[Telegram] Resposta completa da API:', JSON.stringify(resp));

    if (!resp.ok) {
      throw new Error(resp.description || 'Erro desconhecido');
    }

    console.log('[Telegram] Mensagem enviada com sucesso.');
    return resp;
  } catch (err) {
    console.error('[Telegram] Erro crítico na requisição:', err.message);
    throw err;
  }
}

module.exports = { sendTelegramMessage };
