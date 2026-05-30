// netlify/functions/generate.js
// Proxy seguro para la API de Anthropic
// La API key vive en variables de entorno de Netlify, nunca expuesta al cliente

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const RATE_LIMIT_MAP = new Map(); // En memoria — se resetea con cada deploy
const MAX_REQUESTS_PER_HOUR = 5; // Máximo 5 páginas por IP por hora

exports.handler = async function(event, context) {

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ── Rate limiting por IP ──
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora

  if (!RATE_LIMIT_MAP.has(ip)) {
    RATE_LIMIT_MAP.set(ip, { count: 0, resetAt: now + windowMs });
  }
  const limit = RATE_LIMIT_MAP.get(ip);
  if (now > limit.resetAt) {
    limit.count = 0;
    limit.resetAt = now + windowMs;
  }
  if (limit.count >= MAX_REQUESTS_PER_HOUR) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Límite alcanzado. Puedes generar hasta 5 páginas por hora. Intenta más tarde.' })
    };
  }
  limit.count++;

  // ── Validar y sanear input ──
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cuerpo de solicitud inválido' }) };
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'El campo prompt es requerido' }) };
  }

  // Limitar longitud del prompt para evitar abusos
  if (prompt.length > 3000) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt demasiado largo' }) };
  }

  // Verificar que la API key esté configurada
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY no configurada en variables de entorno');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Servidor mal configurado. Contacta al administrador.' }) };
  }

  // ── Llamar a la API de Anthropic de forma segura ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Error de API Anthropic:', errData);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Error al generar la página. Intenta de nuevo.' })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: data.content })
    };

  } catch (e) {
    console.error('Error en función generate:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};
