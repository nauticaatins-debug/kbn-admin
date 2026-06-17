import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const navigate  = useNavigate();
  const { login } = useAuth();

  // ── Validación client-side ──────────────────────────────────────────────────
  const validate = () => {
    if (!email || !password)
      return 'Completá email y contraseña para continuar.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'El email no tiene un formato válido.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const response = await axios.post('/login', { email, password });
      const { token } = response.data;

      login(token);

      if (remember) localStorage.setItem('rememberedEmail', email);
      else          localStorage.removeItem('rememberedEmail');

      navigate('/admin');
    } catch (err) {
      const msg =
        err.response?.status === 401
          ? 'Credenciales incorrectas. Verificá tu email y contraseña.'
          : err.response?.data?.message ||
            'Error al iniciar sesión. Intentá de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Brand header */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <BoltIcon />
          </div>
          <div>
            <h2 style={styles.brandTitle}>Bienvenido de vuelta</h2>
            <p style={styles.brandSub}>Ingresá a tu cuenta para continuar</p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Error banner */}
        {error && (
          <div style={styles.errBanner} role="alert">
            <AlertIcon />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <div style={styles.inputWrap}>
              <span style={styles.leadIcon}><MailIcon /></span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                autoComplete="email"
                style={{
                  ...styles.input,
                  borderColor: error ? '#ef4444' : undefined,
                }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Contraseña</label>
            <div style={styles.inputWrap}>
              <span style={styles.leadIcon}><LockIcon /></span>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                style={{
                  ...styles.input,
                  paddingRight: 38,
                  borderColor: error ? '#ef4444' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={styles.eyeBtn}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Recordarme + olvidé contraseña */}
          <div style={styles.rowBetween}>
            <label style={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              Recordarme
            </label>
            <Link to="/forgot-password" style={styles.forgot}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.72 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <Spinner />
                Ingresando...
              </>
            ) : (
              <>
                Iniciar sesión
                <ArrowIcon />
              </>
            )}
          </button>
        </form>

        <p style={styles.footer}>
          ¿No tenés cuenta?{' '}
          <Link to="/register" style={styles.footerLink}>
            Registrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Inline SVG icons (sin dependencia extra) ────────────────────────────────
const iconProps = {
  width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round',
};

const BoltIcon = () => (
  <svg {...iconProps} width={20} height={20}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const MailIcon = () => (
  <svg {...iconProps}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon = () => (
  <svg {...iconProps}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg {...iconProps}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const ArrowIcon = () => (
  <svg {...iconProps}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);
const AlertIcon = () => (
  <svg {...iconProps} style={{ flexShrink: 0, color: '#dc2626' }}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const Spinner = () => (
  <svg
    width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.8)" strokeWidth={2.5}
    strokeLinecap="round"
    style={{ animation: 'spin 0.7s linear infinite' }}
  >
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <path d="M12 2a10 10 0 1 0 10 10" />
  </svg>
);

// ── Estilos ─────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', padding: '1rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '2.25rem 2rem 2rem',
    width: '100%', maxWidth: 420,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: '1.75rem',
  },
  brandIcon: {
    width: 44, height: 44, borderRadius: 10,
    background: '#eff6ff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: '#3b82f6',
  },
  brandTitle: { margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' },
  brandSub:   { margin: '2px 0 0', fontSize: 13, color: '#6b7280' },
  divider:    { height: 1, background: '#f1f5f9', margin: '0 0 1.5rem' },
  errBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    marginBottom: '1rem', color: '#dc2626',
  },
  field:    { marginBottom: '1rem' },
  label:    { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 },
  inputWrap:{ position: 'relative' },
  leadIcon: {
    position: 'absolute', left: 10, top: '50%',
    transform: 'translateY(-50%)', color: '#9ca3af',
    display: 'flex', alignItems: 'center', pointerEvents: 'none',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px 9px 34px',
    fontSize: 14, border: '1px solid #d1d5db',
    borderRadius: 8, outline: 'none',
    backgroundColor: '#fff', color: '#111827',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  eyeBtn: {
    position: 'absolute', right: 9, top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', padding: 0,
    color: '#9ca3af', display: 'flex', alignItems: 'center',
  },
  rowBetween: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '1.25rem',
  },
  remember: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 13, color: '#6b7280', cursor: 'pointer',
  },
  forgot: { fontSize: 13, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 },
  btn: {
    width: '100%', padding: '10px',
    background: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600,
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    transition: 'background 0.15s',
    marginTop: 4,
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1.25rem' },
  footerLink: { color: '#3b82f6', textDecoration: 'none', fontWeight: 500 },
};