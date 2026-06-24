// netlify/functions/_telegram.js
const https = require('https');

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) {
    console.error('[Telegram] ERRO: Token ou Chat ID ausente no ambiente.');
    return;
  }

  const payload = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const resp = JSON.parse(data);
          console.log('[Telegram] Resposta completa da API:', JSON.stringify(resp));
          if (!resp.ok) {
            reject(new Error(resp.description || 'Erro desconhecido'));
          } else {
            console.log('[Telegram] Mensagem enviada com sucesso.');
            resolve(resp);
          }
        } catch (e) {
          reject(new Error('Falha ao parsear resposta do Telegram'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Telegram] Erro crítico na requisição:', err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendTelegramMessage };
