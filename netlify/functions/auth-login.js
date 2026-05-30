// netlify/functions/auth-login.js
// Valida usuario y contraseña contra Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const MASTER_EMAIL = 'la.contec24@gmail.com';
const MASTER_PASS  = process.env.ADMIN_MASTER_KEY || 'SemillaMaster2024!';

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
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Solicitud inválida' }) }; }

  const { email, password } = body;
  if (!email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Correo y contraseña requeridos' }) };
  }

  // Verificar si es administrador
  const isAdmin = email.toLowerCase() === MASTER_EMAIL.toLowerCase() && password === MASTER_PASS;
  if (isAdmin) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, role: 'admin', negocio: 'Semilla Estudio', email }) };
  }

  // Verificar en Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/semilla_users?email=eq.${encodeURIComponent(email.toLowerCase())}&activo=eq.true&select=id,email,password_hash,negocio`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const users = await res.json();
    if (!users || users.length === 0) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Correo o contraseña incorrectos' }) };
    }

    const user = users[0];

    // Verificar contraseña con bcrypt
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Correo o contraseña incorrectos' }) };
    }

    // Actualizar último acceso
    await fetch(`${SUPABASE_URL}/rest/v1/semilla_users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ultimo_acceso: new Date().toISOString() })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, role: 'client', negocio: user.negocio, email: user.email, id: user.id })
    };

  } catch(e) {
    console.error('Login error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error del servidor. Intenta de nuevo.' }) };
  }
};
