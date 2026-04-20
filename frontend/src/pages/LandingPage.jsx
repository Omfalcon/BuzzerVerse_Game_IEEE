import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, googleProvider, signInWithPopup } from '../shared/firebase';
import { LogIn, User, ShieldCheck, Trophy, ArrowRight, UserPlus, Zap, ChevronLeft, Gamepad2, Lock } from 'lucide-react';

// Inline Google logo SVG – no external load, always visible
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 37.7 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C41.4 36.1 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

const API_BASE = "http://localhost:8000";

const LandingPage = (props) => {
  const { onLogin } = props;
  const [role, setRole] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [regData, setRegData] = useState({ email: '', username: '' });
  const [showReg, setShowReg] = useState(false);
  const [formData, setFormData] = useState({ adminId: '', password: '' });

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: token }),
      });

      const data = await response.json();

      if (data.requires_username) {
        setRegData({ email: data.email, username: '' });
        setShowReg(true);
      } else {
        onLogin({ role: 'user', name: data.username, email: data.email });
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Google Login Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });

      if (!response.ok) throw new Error("Registration failed");
      const data = await response.json();
      onLogin({ role: 'user', name: data.username, email: data.email });
    } catch (error) {
      alert("Registration failed. Name might be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.password }),
      });

      if (!response.ok) throw new Error("Unauthorized");
      const data = await response.json();
      onLogin({ role: 'admin', token: data.token });
    } catch (error) {
      alert('Invalid Admin Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card main-card"
      >
        <div className="card-header">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="logo-glow"
          />
          <h1 className="hero-title"><Zap size={28} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#fbbf24' }} />BuzzerVerse</h1>
          <p className="hero-subtitle">The Ultimate Knowledge Arena</p>
        </div>

        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="option-grid"
            >
              <button 
                className="action-card participant"
                onClick={() => setRole('user')}
              >
                <div className="icon-box"><User size={32} /></div>
                <h3>Participant</h3>
                <p>Join the battle and prove your speed.</p>
                <ArrowRight className="arrow" />
              </button>

              <button 
                className="action-card leaderboard"
                onClick={() => props.onPushLeaderboard?.()}
              >
                <div className="icon-box"><Trophy size={32} /></div>
                <h3>Leaderboard</h3>
                <p>Check the global rankings.</p>
                <ArrowRight className="arrow" />
              </button>

              <div className="divider">
                <span>OR</span>
              </div>

              <button 
                className="admin-lite-btn"
                onClick={() => setRole('admin')}
              >
                <ShieldCheck size={18} /> ADMIN ACCESS
              </button>
            </motion.div>
          ) : role === 'user' ? (
            <motion.div
              key="user-flow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flow-container"
            >
              {!showReg ? (
                <div className="auth-box">
                  <h2 className="flow-title"><User size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Welcome, Contender</h2>
                  <p className="flow-desc">Sign in to claim your <strong>100 bonus points</strong> 🪙</p>
                  
                  <button 
                    className="google-btn" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <GoogleLogo />
                    {loading ? "Authenticating..." : "Continue with Google"}
                  </button>
                  
                  <button className="back-link" onClick={() => setRole(null)}>
                    <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Change Role
                  </button>
                </div>
              ) : (
                <form className="auth-box" onSubmit={handleRegister}>
                  <h2 className="flow-title"><Gamepad2 size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Almost there!</h2>
                  <p className="flow-desc">Choose your Arena Alias</p>
                  
                  <div className="input-group">
                    <UserPlus className="input-icon" size={20} />
                    <input 
                      type="text" 
                      placeholder="Gamer Tag"
                      value={regData.username}
                      onChange={(e) => setRegData({...regData, username: e.target.value})}
                      required
                      autoFocus
                    />
                  </div>
                  
                  <button className="submit-btn" type="submit" disabled={loading}>
                    <ArrowRight size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    {loading ? "Registering..." : "ENTER THE ARENA"}
                  </button>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="admin-flow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flow-container"
            >
              <form className="auth-box" onSubmit={handleAdminLogin}>
                <h2 className="flow-title"><Lock size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />System Auth</h2>
                
                <div className="input-group">
                  <ShieldCheck className="input-icon" size={20} />
                  <input 
                    type="text" 
                    placeholder="Admin ID"
                    value={formData.adminId}
                    onChange={(e) => setFormData({...formData, adminId: e.target.value})}
                    required
                  />
                </div>

                <div className="input-group">
                  <LogIn className="input-icon" size={20} />
                  <input 
                    type="password" 
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
                
                <button className="submit-btn admin" type="submit">
                  AUTHORIZE
                </button>
                
                <button className="back-link" onClick={() => setRole(null)} type="button">
                  Cancel
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .landing-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          padding: 1rem;
          background: var(--bg-main);
          position: relative;
          overflow-y: auto;
        }
        .main-card {
          width: 100%;
          max-width: 500px;
          padding: clamp(1.25rem, 5vw, 2.5rem);
          border-radius: 28px;
          position: relative;
          z-index: 10;
          margin: auto;
        }
        .card-header {
          text-align: center;
          margin-bottom: 2.5rem;
          position: relative;
        }
        .logo-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          background: var(--accent-primary);
          filter: blur(60px);
          opacity: 0.2;
          z-index: -1;
        }
        .hero-title {
          font-family: 'Bangers';
          font-size: clamp(2.2rem, 8vw, 3.5rem);
          letter-spacing: 4px;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
          display: flex; align-items: center; justify-content: center; gap: 0.25rem;
        }
        .hero-subtitle {
          font-size: clamp(0.6rem, 2vw, 0.8rem);
          font-weight: 800;
          letter-spacing: 4px;
          color: var(--accent-primary);
          text-transform: uppercase;
        }

        .option-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .action-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: clamp(1rem, 3vw, 1.5rem);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          color: white;
          width: 100%;
        }
        .action-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .icon-box {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .participant .icon-box { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .leaderboard .icon-box { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
        
        .action-card h3 { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.25rem; }
        .action-card p { font-size: 0.75rem; opacity: 0.5; font-weight: 600; }
        .arrow { margin-left: auto; opacity: 0.3; }

        .divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1rem 0;
          opacity: 0.2;
        }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: white; }
        .divider span { font-size: 0.7rem; font-weight: 900; }

        .admin-lite-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 1rem;
          border-radius: 15px;
          color: var(--text-muted);
          font-weight: 900;
          font-size: 0.7rem;
          letter-spacing: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.2s;
        }
        .admin-lite-btn:hover { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.2); color: white; }

        .flow-container { width: 100%; }
        .auth-box { display: flex; flex-direction: column; gap: 1.5rem; text-align: center; }
        .flow-title { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.5px; }
        .flow-desc { font-size: 0.9rem; color: var(--text-muted); font-weight: 600; }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: white;
          color: black;
          border: none;
          padding: 1rem;
          border-radius: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .google-btn:hover { transform: scale(1.02); }
        .google-btn img { width: 20px; }

        .input-group {
          position: relative;
          width: 100%;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-group input {
          width: 100%;
          padding: 1rem 1rem 1rem 3.5rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 15px;
          color: white;
          font-weight: 600;
          transition: all 0.2s;
        }
        .input-group input:focus {
          background: rgba(255,255,255,0.06);
          border-color: var(--accent-primary);
          outline: none;
        }

        .submit-btn {
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 15px;
          font-weight: 900;
          font-size: 1rem;
          letter-spacing: 2px;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
        }
        .submit-btn.admin { background: #6366f1; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2); }
        .back-link {
          background: none;
          border: none;
          color: var(--text-muted);
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
          display: inline-flex; align-items: center; gap: 4px;
        }

        /* ── Responsive tweaks ── */
        @media (max-width: 480px) {
          .main-card { border-radius: 20px; }
          .card-header { margin-bottom: 1.5rem; }
          .icon-box { width: 44px; height: 44px; border-radius: 10px; }
          .action-card h3 { font-size: 0.95rem; }
          .flow-title { font-size: 1.25rem; }
          .auth-box { gap: 1rem; }
          .input-group input { padding: 0.85rem 0.85rem 0.85rem 3rem; font-size: 0.9rem; }
          .submit-btn { padding: 0.85rem; font-size: 0.85rem; }
          .google-btn { padding: 0.85rem; font-size: 0.9rem; }
        }
        @media (max-height: 680px) {
          .card-header { margin-bottom: 1rem; }
          .auth-box { gap: 0.85rem; }
          .main-card { padding: 1.25rem; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
