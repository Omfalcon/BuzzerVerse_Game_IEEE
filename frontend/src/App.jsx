import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './shared/firebase';
import socket from './shared/socket';
import LandingPage from './pages/LandingPage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import LeaderboardPage from './pages/LeaderboardPage';
import './styles/global.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://deploy.bhook.food';

export default function App() {
  // view: 'loading' | 'landing' | 'register' | 'user' | 'admin' | 'leaderboard'
  const [view, setView] = useState('loading');
  const [user, setUser] = useState(null);         // {email, username, points, fbUser}
  const [adminToken, setAdminToken] = useState(null);
  const [pendingFbUser, setPendingFbUser] = useState(null);

  useEffect(() => {
    // Check for a saved admin JWT first
    const savedToken = localStorage.getItem('buzz_admin_token');
    if (savedToken) {
      try {
        const { exp } = JSON.parse(atob(savedToken.split('.')[1]));
        if (exp * 1000 > Date.now()) {
          setAdminToken(savedToken);
          socket.connect();
          setView('admin');
          return () => {};
        }
      } catch {}
      localStorage.removeItem('buzz_admin_token');
    }

    // Listen for Firebase auth state (restores Google session after refresh)
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setView('landing');
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch(`${BACKEND}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        const data = await res.json();
        if (data.exists) {
          setUser({ email: fbUser.email, username: data.username, points: data.points, fbUser });
          socket.connect();
          setView('user');
        } else {
          // Logged in with Google but not yet registered a username
          setPendingFbUser(fbUser);
          setView('register');
        }
      } catch {
        setView('landing');
      }
    });

    return unsub;
  }, []);

  const onLogin = (userData) => {
    setUser(userData);
    setPendingFbUser(null);
    socket.connect();
    setView('user');
  };

  const onAdminLogin = (token) => {
    setAdminToken(token);
    localStorage.setItem('buzz_admin_token', token);
    socket.connect();
    setView('admin');
  };

  const onLogout = () => {
    auth.signOut();
    socket.disconnect();
    setUser(null);
    setAdminToken(null);
    setPendingFbUser(null);
    localStorage.removeItem('buzz_admin_token');
    setView('landing');
  };

  if (view === 'loading') {
    return (
      <div className="landing-container">
        <p style={{ color: 'var(--text-muted)', letterSpacing: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
          LOADING...
        </p>
      </div>
    );
  }

  if (view === 'user' && user) {
    return (
      <UserPage
        user={user}
        onLogout={onLogout}
        updatePoints={(p) => setUser((u) => ({ ...u, points: p }))}
      />
    );
  }

  if (view === 'admin' && adminToken) {
    return <AdminPage token={adminToken} onLogout={onLogout} />;
  }

  if (view === 'leaderboard') {
    return <LeaderboardPage onBack={() => setView('landing')} />;
  }

  return (
    <LandingPage
      onLogin={onLogin}
      onAdminLogin={onAdminLogin}
      onViewLeaderboard={() => setView('leaderboard')}
      pendingFbUser={view === 'register' ? pendingFbUser : null}
    />
  );
}
