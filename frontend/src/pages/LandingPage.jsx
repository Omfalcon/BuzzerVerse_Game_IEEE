import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../shared/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://deployment.zapto.org';

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 37.7 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.4 36.1 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

export default function LandingPage({ onLogin, onAdminLogin, onViewLeaderboard, pendingFbUser }) {
  const [view, setView] = useState(pendingFbUser ? 'username' : 'home');
  const [fbUser, setFbUser] = useState(pendingFbUser);
  const [username, setUsername] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbU = result.user;
      const idToken = await fbU.getIdToken();
      const res = await fetch(`${BACKEND}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      if (data.exists) {
        onLogin({ email: fbU.email, username: data.username, points: data.points, fbUser: fbU });
      } else {
        setFbUser(fbU);
        setView('username');
      }
    } catch (e) {
      setError(e.message || 'Google login failed');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) { setError('Enter a username'); return; }
    setError('');
    setLoading(true);
    try {
      const idToken = await fbUser.getIdToken();
      const res = await fetch(`${BACKEND}/auth/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, username: name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
      onLogin({ email: fbUser.email, username: data.username, points: data.points, fbUser });
    } catch (e) {
      setError(e.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Wrong password'); setLoading(false); return; }
      onAdminLogin(data.token);
    } catch (e) {
      setError(e.message || 'Login failed');
    }
    setLoading(false);
  };

  const s = {
    card: { width: '100%', maxWidth: '460px', padding: '2.5rem', textAlign: 'center' },
    title: { fontFamily: 'Bangers', fontSize: '3.5rem', letterSpacing: '4px', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginBottom: '0.25rem' },
    sub: { color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700, marginBottom: '2.5rem' },
    optionGrid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    actionCard: { display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', cursor: 'pointer', color: 'white', width: '100%', textAlign: 'left', transition: 'all 0.2s ease' },
    iconBox: (color) => ({ width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(${color}, 0.12)`, color: `rgb(${color})`, flexShrink: 0, fontSize: '1.25rem' }),
    cardTitle: { fontWeight: 700, fontSize: '1rem', marginBottom: '0.15rem' },
    cardSub: { color: 'var(--text-muted)', fontSize: '0.75rem' },
    divider: { display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', margin: '0.5rem 0' },
    adminBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', width: '100%', letterSpacing: '2px', transition: 'all 0.2s' },
    form: { display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' },
    formTitle: { fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.25rem' },
    formSub: { color: 'var(--text-muted)', fontSize: '0.85rem' },
    inputWrap: { position: 'relative' },
    input: { width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' },
    inputIcon: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' },
    submitBtn: (grad) => ({ background: grad, color: 'white', border: 'none', padding: '0.875rem', borderRadius: '12px', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', transition: 'opacity 0.2s', opacity: loading ? 0.7 : 1 }),
    googleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'white', color: '#111827', border: 'none', padding: '0.875rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', fontSize: '0.95rem' },
    backLink: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' },
    err: { color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' },
  };

  if (view === 'home') return (
    <div className="landing-container">
      <div className="glass-card" style={s.card}>
        <div style={{ position: 'relative' }}>
          <div className="logo-glow" />
          <h1 style={s.title}>BUZZERVERSE</h1>
          <p style={s.sub}>IEEE · UPES</p>
        </div>
        <div style={s.optionGrid}>
          <button
            style={s.actionCard}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onClick={() => { setError(''); setView('google'); }}
          >
            <div style={s.iconBox('59, 130, 246')}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={s.cardTitle}>Join as Participant</div>
              <div style={s.cardSub}>Google sign-in · 100 starter points</div>
            </div>
            <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>→</span>
          </button>

          <button
            style={s.actionCard}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fbbf24'; e.currentTarget.style.background = 'rgba(251,191,36,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onClick={onViewLeaderboard}
          >
            <div style={s.iconBox('251, 191, 36')}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={s.cardTitle}>View Leaderboard</div>
              <div style={s.cardSub}>Live rankings · No login required</div>
            </div>
            <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>→</span>
          </button>

          <div style={s.divider}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span>ADMIN</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <button
            style={s.adminBtn}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            onClick={() => { setError(''); setAdminPass(''); setView('admin'); }}
          >
            🔐 ADMIN LOGIN
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'google') return (
    <div className="landing-container">
      <div className="glass-card" style={s.card}>
        <div style={s.form}>
          <div>
            <div style={s.formTitle}>Join the Game</div>
            <div style={s.formSub}>Sign in with Google to get your 100 starter points</div>
          </div>
          {error && <div style={s.err}>{error}</div>}
          <button style={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <GoogleLogo />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
          <button style={s.backLink} onClick={() => { setError(''); setView('home'); }}>← Back</button>
        </div>
      </div>
    </div>
  );

  if (view === 'username') return (
    <div className="landing-container">
      <div className="glass-card" style={s.card}>
        <form style={s.form} onSubmit={handleRegister}>
          <div>
            <div style={s.formTitle}>Pick a Username</div>
            <div style={s.formSub}>This is how other players will see you</div>
          </div>
          {error && <div style={s.err}>{error}</div>}
          <div style={s.inputWrap}>
            <span style={s.inputIcon}>@</span>
            <input
              style={s.input}
              type="text"
              placeholder="Your username (max 20 chars)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <button type="submit" style={s.submitBtn('linear-gradient(135deg, #3b82f6, #8b5cf6)')} disabled={loading}>
            {loading ? 'Registering...' : 'Enter the Game (+100 pts)'}
          </button>
          <button type="button" style={s.backLink} onClick={() => { setError(''); setView('google'); }}>← Back</button>
        </form>
      </div>
    </div>
  );

  if (view === 'admin') return (
    <div className="landing-container">
      <div className="glass-card" style={s.card}>
        <form style={s.form} onSubmit={handleAdminLogin}>
          <div>
            <div style={s.formTitle}>Admin Login</div>
            <div style={s.formSub}>Restricted access</div>
          </div>
          {error && <div style={s.err}>{error}</div>}
          <div style={s.inputWrap}>
            <span style={s.inputIcon}>🔑</span>
            <input
              style={s.input}
              type="password"
              placeholder="Admin password"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              autoFocus
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <button type="submit" style={s.submitBtn('#6366f1')} disabled={loading}>
            {loading ? 'Verifying...' : 'Access Control Panel'}
          </button>
          <button type="button" style={s.backLink} onClick={() => { setError(''); setView('home'); }}>← Back</button>
        </form>
      </div>
    </div>
  );

  return null;
}
