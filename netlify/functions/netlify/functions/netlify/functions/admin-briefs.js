// netlify/functions/admin-briefs.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const adminKey = event.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_MASTER_KEY) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  if (event.httpMethod === 'GET') {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/semilla_briefs?select=*&order=enviado_en.desc&limit=50`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const briefs = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(briefs) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
};
