const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { userId, brief } = JSON.parse(event.body);
    const { error } = await supabase.from('semilla_briefs').insert([{
      user_id: userId,
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
      paleta: brief.paleta,
      enviado_en: new Date().toISOString()
    }]);
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
