// netlify/functions/brief-save.js
// Guarda el brief del cliente en Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) }; }

  const { userId, brief } = body;
  if (!brief) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Brief requerido' }) };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/semilla_briefs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        user_id: userId || null,
        negocio: brief.name,
        tipo: brief.type,
        ciudad: brief.city,
        descripcion: brief.desc,
        servicios: brief.services,
        contacto: brief.contact,
        tagline: brief.tagline,
        cta_label: brief.ctaLabel,
        cta_link: brief.ctaLink,
        horario: brief.horario,
        precios: brief.precios,
        testimonio: brief.testimonio,
        paleta: brief.paleta
      })
    });

    if (!res.ok) throw new Error('Error guardando brief');
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch(e) {
    console.error('Brief save error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error guardando. El brief igual se envió por WhatsApp.' }) };
  }
};
