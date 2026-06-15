const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event) {
  if (event.headers['x-admin-key'] !== process.env.MASTER_KEY) {
    return { statusCode: 403, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  if (event.httpMethod === 'GET') {
    const { data } = await supabase
      .from('usuarios')
      .select('id,email,negocio,activo,creado_en,ultimo_acceso,role')
      .order('creado_en', { ascending: false });
    return { statusCode: 200, body: JSON.stringify(data || []) };
  }

  if (event.httpMethod === 'POST') {
    const { email, password, negocio } = JSON.parse(event.body);
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ email: email.toLowerCase(), password_hash, negocio, activo: true, role: 'client', creado_en: new Date().toISOString() }])
      .select().single();
    if (error) return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'PATCH') {
    const { id, activo } = JSON.parse(event.body);
    await supabase.from('usuarios').update({ activo }).eq('id', id);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
