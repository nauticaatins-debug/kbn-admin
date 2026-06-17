import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../axiosConfig';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresá un email válido.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      // Mostrar éxito igualmente por seguridad
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <svg viewBox="0 0 40 40" width="30" height="30">
              <text x="20" y="15" textAnchor="middle" fontSize="13" fontWeight="700" fill={NA.darker} fontFamily="system-ui">N</text>
              <path d="M6 20 Q13 16 20 20 Q27 24 34 20" fill="none" stroke={NA.darker} strokeWidth="1.8"/>
              <path d="M6 20 Q20 31 34 20" fill={NA.darker}/>
              <text x="20" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill={NA.primary} fontFamily="system-ui">A</text>
            </svg>
          </div>
          <div>
            <h2 style={s.title}>Recuperar contraseña</h2>
            <p style={s.sub}>Te enviamos un enlace a tu email</p>
          </div>
        </div>

        <div style={s.divider} />

        {sent ? (
          /* ── Estado: email enviado ── */
          <div style={s.successBox}>
            <div style={s.successIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NA.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 500, color: NA.text }}>
              Revisá tu bandeja de entrada
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: NA.text2, lineHeight: 1.6 }}>
              Si <strong>{email}</strong> está registrado, vas a recibir un email con el enlace para restablecer tu contraseña. El enlace es válido por 2 horas.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: NA.text2 }}>
              ¿No llegó? Revisá la carpeta de spam o{' '}
              <button onClick={() => { setSent(false); setEmail(''); }} style={s.inlineBtn}>
                intentá de nuevo
              </button>.
            </p>
          </div>
        ) : (
          /* ── Formulario ── */
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div style={s.errBanner}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            )}

            <div style={s.field}>
              <label htmlFor="email" style={s.label}>Email</label>
              <div style={{ position: 'relative' }}>
                <span style={s.leadIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  autoFocus
                  style={{ ...s.input, borderColor: error ? '#ef4444' : NA.border }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}>
              {loading ? (
                <>
                  <Spinner /> Enviando...
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>
          </form>
        )}

        <div style={s.divider} />

        <p style={s.footer}>
          <Link to="/login" style={s.footerLink}>← Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}

const Spinner = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)"
    strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin .7s linear infinite' }}>
    <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    <path d="M12 2a10 10 0 1 0 10 10"/>
  </svg>
);

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', backgroundColor: NA.bg, padding: '1rem',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    border: `1px solid ${NA.border}`,
    padding: '2rem', width: '100%', maxWidth: 420,
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' },
  logoCircle: {
    width: 48, height: 48, borderRadius: '50%', background: NA.primary,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { margin: 0, fontSize: 17, fontWeight: 500, color: NA.text },
  sub:   { margin: '2px 0 0', fontSize: 13, color: NA.text2 },
  divider: { height: 1, background: NA.border, margin: '1.25rem 0' },
  errBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', color: '#dc2626',
  },
  successBox: {
    background: NA.light, borderRadius: 12, border: `1px solid ${NA.border}`,
    padding: '20px', textAlign: 'center',
  },
  successIcon: {
    width: 52, height: 52, borderRadius: '50%', background: NA.mid,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px', color: NA.dark,
  },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: NA.text, marginBottom: 5 },
  leadIcon: {
    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
    color: NA.text2, display: 'flex', alignItems: 'center', pointerEvents: 'none',
  },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px',
    fontSize: 14, border: `1px solid ${NA.border}`, borderRadius: 8,
    outline: 'none', backgroundColor: NA.light, color: NA.text,
  },
  btn: {
    width: '100%', padding: '11px', background: NA.dark, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, cursor: 'pointer', marginTop: 4,
  },
  inlineBtn: {
    background: 'none', border: 'none', color: NA.dark,
    fontWeight: 500, cursor: 'pointer', fontSize: 13, padding: 0,
  },
  footer: { textAlign: 'center', fontSize: 13, color: NA.text2, margin: 0 },
  footerLink: { color: NA.dark, textDecoration: 'none', fontWeight: 500 },
};