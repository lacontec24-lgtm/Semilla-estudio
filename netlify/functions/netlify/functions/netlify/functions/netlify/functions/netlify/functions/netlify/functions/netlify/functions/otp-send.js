// netlify/functions/otp-send.js
const otpStore = require('./otp-store');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY no configurada');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Servidor mal configurado. Contacta a Semilla Estudio.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Solicitud inválida' }) }; }

  const { user, email } = body;
  if (!user || !email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos incompletos' }) };

  // Cooldown anti-spam
  const cooldown = otpStore.getCooldown(user);
  if (cooldown > 0) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: `Espera ${cooldown} segundos antes de solicitar otro código.` }) };
  }

  // Generar y guardar OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.save(user, code);

  // Enviar por Resend
  try {
    const year = new Date().getFullYear();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Semilla Estudio <acceso@semillaestudio.co>',
        to: [email],
        subject: `${code} — Tu código de acceso a Semilla Estudio`,
        html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif"><div style="max-width:480px;margin:40px auto;background:#FDFAF5;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(107,66,38,.12)"><div style="background:#4A5E3A;padding:32px 40px;text-align:center"><div style="font-size:2rem;margin-bottom:8px">🌱</div><h1 style="color:white;font-size:1.4rem;font-weight:700;margin:0">Semilla Estudio</h1><p style="color:rgba(255,255,255,.7);font-size:.8rem;margin:6px 0 0">Herramienta de creación web</p></div><div style="padding:40px"><h2 style="font-size:1.2rem;font-weight:700;color:#2C2420;margin:0 0 10px">Tu código de acceso</h2><p style="font-size:.875rem;color:#7A7670;line-height:1.6;margin:0 0 24px">Ingresa este código en la pantalla de acceso. Válido por <strong>15 minutos</strong> y de un solo uso.</p><div style="background:#F5F0E8;border:2px dashed #D4A853;border-radius:14px;padding:28px;text-align:center;margin-bottom:28px"><div style="font-size:3rem;font-weight:800;letter-spacing:14px;color:#6B4226;font-family:monospace">${code}</div></div><p style="font-size:.78rem;color:#7A7670;line-height:1.6;margin:0">Si no solicitaste este código, ignora este correo. Tu cuenta está segura.</p></div><div style="background:#F5F0E8;padding:18px 40px;text-align:center;border-top:1px solid #E4DDD0"><p style="font-size:.72rem;color:#7A7670;margin:0">© ${year} Semilla Estudio · Colombia</p></div></div></body></html>`
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error enviando correo');
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch(e) {
    console.error('Error Resend:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No pudimos enviar el correo. Intenta de nuevo.' }) };
  }
};
