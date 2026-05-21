// netlify/functions/debug-credentials.js
// TEMPORÁRIO — delete este arquivo após confirmar que está funcionando

const { CORS_HEADERS } = require('./_gcal');

exports.handler = async () => {
  const raw = process.env.GOOGLE_CREDENTIALS;

  if (!raw) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ status: 'ERRO', problema: 'GOOGLE_CREDENTIALS não existe no ambiente' }),
    };
  }

  let parsed;
  let parseError = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    parseError = e.message;
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      raw_length       : raw.length,
      raw_starts_with  : raw.slice(0, 40),
      raw_ends_with    : raw.slice(-40),
      parse_ok         : !parseError,
      parse_error      : parseError,
      // Se parseou, mostra apenas os campos (sem expor valores sensíveis)
      fields_found     : parsed ? Object.keys(parsed) : [],
      has_client_email : parsed?.client_email ? '✅ SIM' : '❌ NÃO',
      has_private_key  : parsed?.private_key  ? '✅ SIM' : '❌ NÃO',
      type             : parsed?.type         || 'não encontrado',
      project_id       : parsed?.project_id   || 'não encontrado',
    }),
  };
};
