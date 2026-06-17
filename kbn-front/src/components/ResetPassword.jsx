import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../axiosConfig';

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

export default function ResetPassword() {
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  const navigate  = useNavigate();
  const location  = useLocation();
  const token     = new URLSearchParams(location.search).get('token');

  // ── Validar token al cargar ───────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setValidating(false);
      return;
    }
    api.get(`/auth/validate-reset-token?token=${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const validate = () => {
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (password !== confirm) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? null
    : password.length < 6  ? 'débil'
    : password.length < 10 ? 'media'
    : 'fuerte';

  const strengthColor = { débil: '#ef4444', media: '#f59e0b', fuerte: NA.dark };
  const strengthWidth = { débil: '33%', media: '66%', fuerte: '100%' };

  // ── Loading / validating token ────────────────────────────────
  if (validating) return (
    <div style={{ ...s.page }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner color={NA.dark} />
        <p style={{ color: NA.text2, fontSize: 14, marginTop: 12 }}>Verificando enlace...</p>
      </div>
    </div>
  );

  // ── Token inválido ────────────────────────────────────────────
  if (!tokenValid) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ ...s.iconCircle, background: '#FEF2F2' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 style={{ margin: '12px 0 8px', fontSize: 17, fontWeight: 500, color: NA.text }}>Enlace inválido o expirado</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: NA.text2, lineHeight: 1.6 }}>
            Este enlace de recuperación ya no es válido. Puede que haya expirado (duran 2 horas) o ya fue usado.
          </p>
          <Link to="/forgot-password" style={s.btn}>Solicitar un nuevo enlace</Link>
        </div>
        <div style={s.divider} />
        <p style={s.footer}><Link to="/login" style={s.footerLink}>← Volver al inicio de sesión</Link></p>
      </div>
    </div>
  );

  // ── Éxito ─────────────────────────────────────────────────────
  if (done) return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ ...s.iconCircle, background: NA.light }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={NA.dark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 style={{ margin: '12px 0 8px', fontSize: 17, fontWeight: 500, color: NA.text }}>¡Contraseña actualizada!</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: NA.text2, lineHeight: 1.6 }}>
            Tu contraseña fue cambiada correctamente. Redirigiendo al login en unos segundos...
          </p>
          <Link to="/login" style={s.btn}>Ir al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );

  // ── Formulario ────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>

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
            <h2 style={s.title}>Nueva contraseña</h2>
            <p style={s.sub}>Elegí una contraseña segura</p>
          </div>
        </div>

        <div style={s.divider} />

        {error && (
          <div style={s.errBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Nueva contraseña */}
          <div style={s.field}>
            <label htmlFor="password" style={s.label}>Nueva contraseña</label>
            <div style={{ position: 'relative' }}>
              <span style={s.leadIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
                style={{ ...s.input, paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={s.eyeBtn} aria-label={showPw ? 'Ocultar' : 'Mostrar'}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            {/* Barra de fortaleza */}
            {strength && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: NA.border, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strengthWidth[strength], background: strengthColor[strength], borderRadius: 99, transition: 'width .3s, background .3s' }} />
                </div>
                <span style={{ fontSize: 11, color: strengthColor[strength], fontWeight: 500 }}>Contraseña {strength}</span>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div style={s.field}>
            <label htmlFor="confirm" style={s.label}>Confirmar contraseña</label>
            <div style={{ position: 'relative' }}>
              <span style={s.leadIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                style={{
                  ...s.input,
                  borderColor: confirm && confirm !== password ? '#ef4444' : NA.border,
                }}
              />
            </div>
            {confirm && confirm !== password && (
              <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>Las contraseñas no coinciden</span>
            )}
          </div>

          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}>
            {loading ? <><Spinner color="rgba(255,255,255,0.8)" /> Cambiando...</> : 'Cambiar contraseña'}
          </button>
        </form>

        <div style={s.divider} />
        <p style={s.footer}><Link to="/login" style={s.footerLink}>← Volver al inicio de sesión</Link></p>
      </div>
    </div>
  );
}

const Spinner = ({ color = 'rgba(255,255,255,0.8)' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin .7s linear infinite', display: 'inline-block' }}>
    <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    <path d="M12 2a10 10 0 1 0 10 10"/>
  </svg>
);

const NA = {
  primary: '#1ABFA0', dark: '#0F6E56', darker: '#085041',
  light: '#E1F5EE', mid: '#9FE1CB', bg: '#f0faf7',
  text: '#0a2e27', text2: '#3a6b5e', border: '#c5e8df',
};

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NA.bg, padding: '1rem' },
  card: { backgroundColor: '#fff', borderRadius: 16, border: `1px solid ${NA.border}`, padding: '2rem', width: '100%', maxWidth: 420 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' },
  logoCircle: { width: 48, height: 48, borderRadius: '50%', background: NA.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconCircle: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' },
  title: { margin: 0, fontSize: 17, fontWeight: 500, color: NA.text },
  sub:   { margin: '2px 0 0', fontSize: 13, color: NA.text2 },
  divider: { height: 1, background: NA.border, margin: '1.25rem 0' },
  errBanner: { display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', color: '#dc2626' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: NA.text, marginBottom: 5 },
  leadIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: NA.text2, display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', fontSize: 14, border: `1px solid ${NA.border}`, borderRadius: 8, outline: 'none', backgroundColor: NA.light, color: NA.text },
  eyeBtn: { position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: NA.text2, display: 'flex', alignItems: 'center' },
  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px', background: NA.dark, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'none' },
  footer: { textAlign: 'center', fontSize: 13, color: NA.text2, margin: 0 },
  footerLink: { color: NA.dark, textDecoration: 'none', fontWeight: 500 },
};