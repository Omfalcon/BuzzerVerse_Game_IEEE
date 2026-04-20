import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import LeaderboardPage from './pages/LeaderboardPage';
import './styles/global.css';



function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('buzzer_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('buzzer_user', JSON.stringify(userData));
    setUser(userData);
    
    if (userData.role === 'admin') {
      history.pushState({}, '', '/admin');
      setCurrentPath('/admin');
    } else {
      history.pushState({}, '', '/game');
      setCurrentPath('/game');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('buzzer_user');
    setUser(null);
    history.pushState({}, '', '/');
    setCurrentPath('/');
  };



  // Simple Router logic
  if (currentPath === '/leaderboard') {
    return (
      <div className="layout-wrapper">
        <main className="main-content">
          <LeaderboardPage />
          <div style={{ textAlign: 'center', padding: '2rem' }}>
             <button className="back-link" onClick={() => { history.pushState({}, '', '/'); setCurrentPath('/'); }}>GO BACK</button>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage 
        onLogin={handleLogin} 
        onPushLeaderboard={() => { history.pushState({}, '', '/leaderboard'); setCurrentPath('/leaderboard'); }} 
      />
    );
  }

  return (
    <div className="layout-wrapper">
      <main className="main-content">
        {user.role === 'admin' ? (
          <AdminPage userData={user} onLogout={handleLogout} />
        ) : (
          <UserPage userData={user} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}

export default App;

