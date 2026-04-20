import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, ArrowLeft } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const LeaderboardPage = () => {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 1000); // Updated to max (1s polling)
    return () => clearInterval(interval);
  }, []);

  const fetchStandings = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      const data = await res.json();
      setStandings(data);
    } catch (e) {
      console.error("Failed to fetch standings");
    } finally {
      setLoading(false);
    }
  };

  const sortedUsers = Object.entries(standings)
    .sort(([, a], [, b]) => b - a)
    .map(([name, points]) => ({ name, points }));

  return (
    <div className="leaderboard-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card l-card"
      >
        <div className="l-header">
          <Trophy className="gold" size={48} />
          <h1 className="l-title">BUZZERVERSE ELITE</h1>
          <p className="l-subtitle">GLOBAL HALL OF FAME</p>
        </div>

        <div className="l-stats">
          <div className="l-stat">
            <span className="l-label">TOTAL CONTENDERS</span>
            <span className="l-value">{sortedUsers.length}</span>
          </div>
        </div>

        <div className="l-list">
          {loading ? (
            <div className="l-loading">FETCHING DATA...</div>
          ) : sortedUsers.length === 0 ? (
            <div className="l-empty">NO DATA IN THE ARCHIVES</div>
          ) : (
            sortedUsers.map((user, index) => (
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                key={user.name} 
                className={`l-item rank-${index + 1}`}
              >
                <div className="l-rank">
                  {index === 0 ? <Medal size={24} color="#fbbf24" /> : 
                   index === 1 ? <Medal size={24} color="#94a3b8" /> : 
                   index === 2 ? <Medal size={24} color="#b45309" /> : 
                   `#${index + 1}`}
                </div>
                <div className="l-info">
                  <span className="l-name">{user.name}</span>
                  <span className="l-badge">VERIFIED PLAYER</span>
                </div>
                <div className="l-points">
                  <span className="p-val">{user.points}</span>
                  <span className="p-unit">PTS</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      <style>{`
        .leaderboard-container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .l-card {
          padding: 2.5rem;
          border-radius: 30px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .l-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .l-title {
          font-family: 'Bangers';
          font-size: 3rem;
          letter-spacing: 4px;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .l-subtitle {
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 5px;
          color: var(--accent-primary);
          opacity: 0.8;
        }
        .l-stats {
          display: flex;
          justify-content: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 0;
        }
        .l-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .l-label { font-size: 0.6rem; font-weight: 900; opacity: 0.4; letter-spacing: 2px; }
        .l-value { font-weight: 900; font-size: 1.2rem; }

        .l-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .l-item {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem 1.5rem;
          background: rgba(255,255,255,0.02);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: transform 0.2s;
        }
        .l-item:hover {
          transform: translateX(10px);
          background: rgba(255,255,255,0.05);
        }
        .l-item.rank-1 { background: rgba(251, 191, 36, 0.05); border-color: rgba(251, 191, 36, 0.2); }
        .l-rank { width: 40px; font-weight: 900; font-size: 1.1rem; opacity: 0.5; text-align: center; }
        .l-info { flex: 1; display: flex; flex-direction: column; }
        .l-name { font-weight: 800; font-size: 1.1rem; }
        .l-badge { font-size: 0.5rem; font-weight: 900; letter-spacing: 1px; color: var(--accent-secondary); margin-top: 2px; }
        .l-points { display: flex; align-items: baseline; gap: 4px; }
        .p-val { font-weight: 900; font-size: 1.5rem; color: #fbbf24; }
        .p-unit { font-size: 0.6rem; font-weight: 800; opacity: 0.6; }
        
        .l-loading, .l-empty { text-align: center; padding: 3rem; opacity: 0.3; font-weight: 900; letter-spacing: 2px; }
      `}</style>
    </div>
  );
};

export default LeaderboardPage;

