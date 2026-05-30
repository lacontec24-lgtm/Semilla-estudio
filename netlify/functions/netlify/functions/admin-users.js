// netlify/functions/admin-users.js
// Crear, listar y desactivar usuarios desde el panel admin

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Verificar que es admin
  const adminKey = event.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_MASTER_KEY) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  // GET → listar usuarios
  if (event.httpMethod === 'GET') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/semilla_users?select=id,email,negocio,activo,creado_en,ultimo_acceso&order=creado_en.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const users = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(users) };
  }

  // POST → crear usuario
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) }; }

    const { email, password, negocio } = body;
    if (!email || !password || !negocio) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Correo, contraseña y negocio son requeridos' }) };
    }

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/semilla_users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ email: email.toLowerCase(), password_hash: hash, negocio, activo: true })
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = err.message?.includes('unique') ? 'Ese correo ya está registrado' : 'Error creando usuario';
      return { statusCode: 400, headers, body: JSON.stringify({ error: msg }) };
    }

    const newUser = await res.json();
    return { statusCode: 201, headers, body: JSON.stringify({ ok: true, user: newUser[0] }) };
  }

  // PATCH → activar/desactivar
  if (event.httpMethod === 'PATCH') {
    let body;
    try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) }; }

    const { id, activo } = body;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/semilla_users?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo })
    });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
};
