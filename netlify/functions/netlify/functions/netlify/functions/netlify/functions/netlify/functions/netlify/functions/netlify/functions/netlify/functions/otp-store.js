// otp-store.js — Módulo compartido entre otp-send y otp-verify
// Almacena los OTPs activos en memoria del proceso de Netlify

const store = new Map();
const OTP_EXPIRE_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

module.exports = {
  save(user, code) {
    store.set(user, {
      code,
      expiresAt: Date.now() + OTP_EXPIRE_MS,
      attempts: 0,
      sentAt: Date.now()
    });
  },

  verify(user, code) {
    const entry = store.get(user);
    if (!entry) return { valid: false, error: 'Código no encontrado. Solicita uno nuevo.' };
    if (Date.now() > entry.expiresAt) { store.delete(user); return { valid: false, error: 'El código expiró. Solicita uno nuevo.' }; }
    if (entry.attempts >= MAX_ATTEMPTS) return { valid: false, error: 'Demasiados intentos. Solicita un nuevo código.' };

    entry.attempts++;
    if (entry.code !== code) {
      const left = MAX_ATTEMPTS - entry.attempts;
      return { valid: false, error: `Código incorrecto. Te quedan ${left} intento${left !== 1 ? 's' : ''}.` };
    }

    store.delete(user); // OTP de un solo uso
    return { valid: true };
  },

  getCooldown(user) {
    const entry = store.get(user);
    if (!entry || !entry.sentAt) return 0;
    const elapsed = Date.now() - entry.sentAt;
    const cooldown = 60 * 1000;
    return elapsed < cooldown ? Math.ceil((cooldown - elapsed) / 1000) : 0;
  }
};
