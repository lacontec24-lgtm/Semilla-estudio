const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { email, password } = JSON.parse(event.body);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('activo', true)
      .single();

    if (error || !data) return { statusCode: 401, body: JSON.stringify({ error: 'Usuario no encontrado o inactivo' }) };

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) return { statusCode: 401, body: JSON.stringify({ error: 'Contraseña incorrecta' }) };

    await supabase.from('usuarios').update({ ultimo_acceso: new Date().toISOString() }).eq('id', data.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ id: data.id, email: data.email, negocio: data.negocio, role: data.role || 'client' })
    };
  } catch(e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
