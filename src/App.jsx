import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import './styles/global.css';

// Logo Assets (Paths provided by user's plan)
import ieeeLogo from './assets/ieee_logo.png';
import upesLogo from './assets/upes_logo.png';

function App() {
  const [user, setUser] = useState(null); // { role: 'user' | 'admin', name?, sapId? }
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleLogin = (userData) => {
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
    setUser(null);
    history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  // Logos Component
  const Branding = () => (
    <div className="brand-logos">
      <img src={ieeeLogo} alt="IEEE" className="logo-ieee" onError={(e) => e.target.style.display='none'} />
      <img src={upesLogo} alt="UPES" className="logo-upes" onError={(e) => e.target.style.display='none'} />
    </div>
  );

  if (!user) {
    return (
      <>
        <Branding />
        <LandingPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <div className="watermark">IEEE</div>
      <Branding />
      <div className="exit-container">
        <button className="exit-btn" onClick={handleLogout}>Exit</button>
      </div>
      
      <main style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {user.role === 'admin' ? (
          <AdminPage />
        ) : (
          <UserPage userData={user} />
        )}
      </main>
    </>
  );
}

export default App;
