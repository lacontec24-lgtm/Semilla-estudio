// netlify/functions/chat.js
// Agente de IA para asistir a los usuarios dentro de la app

const RATE_LIMIT_MAP = new Map();
const MAX_CHAT_PER_HOUR = 30; // 30 mensajes por IP por hora

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  // Rate limit
  const ip = event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  if (!RATE_LIMIT_MAP.has(ip)) RATE_LIMIT_MAP.set(ip, { count: 0, resetAt: now + windowMs });
  const limit = RATE_LIMIT_MAP.get(ip);
  if (now > limit.resetAt) { limit.count = 0; limit.resetAt = now + windowMs; }
  if (limit.count >= MAX_CHAT_PER_HOUR) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Demasiados mensajes. Intenta en una hora.' }) };
  }
  limit.count++;

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Solicitud inválida' }) };
  }

  const { messages, system } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Mensajes requeridos' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Servidor mal configurado' }) };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Haiku: más rápido y económico para chat
        max_tokens: 300,
        system: system || 'Eres el asistente de Semilla Estudio. Ayuda a los usuarios a crear su página web. Responde en español, de forma corta y cálida.',
        messages: messages.slice(-10) // Solo últimos 10 mensajes para ahorrar tokens
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error de API');
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify({ content: data.content }) };

  } catch(e) {
    console.error('Chat error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error al procesar tu mensaje' }) };
  }
};
