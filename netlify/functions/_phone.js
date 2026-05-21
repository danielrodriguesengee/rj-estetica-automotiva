// netlify/functions/_phone.js
// Normaliza qualquer formato de telefone brasileiro para +55DDNNNNNNNNN

/**
 * Exemplos aceitos:
 *   98992416424        → +5537989924164  (adiciona DDI + DDD padrão)
 *   37984243487        → +5537984243487
 *   984243487          → +5537984243487  (sem DDD, adiciona DDD padrão)
 *   (37) 98424-3487    → +5537984243487
 *   +55 37 98424-3487  → +5537984243487
 *   5537984243487      → +5537984243487
 *
 * DEFAULT_DDD: usado quando o número não tem DDD (8 ou 9 dígitos)
 */

const DEFAULT_DDD = process.env.DEFAULT_DDD || '37';

function normalizePhone(raw) {
  if (!raw) return null;

  // Remove tudo que não é dígito
  let digits = String(raw).replace(/\D/g, '');

  // Remove DDI 55 do início se presente (ex: 5537984243487 → 37984243487)
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Agora deve ter: 10-11 dígitos (com DDD) ou 8-9 dígitos (sem DDD)
  if (digits.length === 8 || digits.length === 9) {
    // Sem DDD — adiciona o padrão
    digits = DEFAULT_DDD + digits;
  }

  // Garante 9º dígito no celular (DDD + 9 dígitos)
  // Ex: 3784243487 (10 dígitos) → 37984243487 (11 dígitos)
  if (digits.length === 10) {
    const ddd    = digits.slice(0, 2);
    const number = digits.slice(2);
    // Celular começa com 6,7,8,9 — adiciona o 9
    if (['6','7','8','9'].includes(number[0])) {
      digits = ddd + '9' + number;
    }
  }

  if (digits.length < 10 || digits.length > 11) {
    console.warn(`[phone] Número suspeito após normalização: "${digits}" (raw: "${raw}")`);
  }

  return `+55${digits}`;
}

/**
 * Gera link wa.me para abrir conversa direta
 * Ex: https://wa.me/5537984243487
 */
function waLink(raw, message = '') {
  const normalized = normalizePhone(raw);
  if (!normalized) return null;
  // wa.me não usa o +
  const digits = normalized.replace('+', '');
  const base   = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

module.exports = { normalizePhone, waLink, DEFAULT_DDD };
