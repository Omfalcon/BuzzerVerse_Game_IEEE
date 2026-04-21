import { useState, useEffect } from 'react';
import socket from '../shared/socket';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://deploy.bhook.food';

export default function LeaderboardPage({ onBack }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLB = async () => {
    try {
      const res = await fetch(`${BACKEND}/leaderboard`);
      setLeaderboard(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLB();

    const onRoundReset = ({ leaderboard: lb }) => setLeaderboard(lb);
    const onGameEnded = ({ leaderboard: lb }) => setLeaderboard(lb);

    socket.on('round_reset', onRoundReset);
    socket.on('game_ended', onGameEnded);

    // Fallback polling every 8s
    const interval = setInterval(fetchLB, 8000);

    return () => {
      socket.off('round_reset', onRoundReset);
      socket.off('game_ended', onGameEnded);
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', maxWidth: '580px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '0.5rem 0.75rem', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>←</button>
        )}
        <div>
          <h1 style={{ fontFamily: 'Bangers', fontSize: '2.75rem', letterSpacing: '5px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', lineHeight: 1 }}>
            LEADERBOARD
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700, marginTop: '0.2rem' }}>
            Live standings · IEEE BuzzerVerse
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 0' }}>Loading...</p>
      ) : leaderboard.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#374151', padding: '4rem 0' }}>No participants yet</p>
      ) : (
        <>
          {/* Top 3 podium style */}
          {leaderboard.slice(0, 3).map((u, i) => (
            <div key={u.username} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1.1rem 1.5rem',
              background: i === 0 ? 'rgba(251,191,36,0.08)' : i === 1 ? 'rgba(156,163,175,0.06)' : 'rgba(180,120,60,0.06)',
              border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : i === 1 ? 'rgba(156,163,175,0.15)' : 'rgba(180,120,60,0.15)'}`,
              borderRadius: '14px', marginBottom: '0.75rem',
            }}>
              <span style={{ fontSize: '1.75rem', minWidth: '40px', textAlign: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: '1.05rem' }}>{u.username}</span>
              <span style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#cd7f32', fontFamily: 'Bangers', fontSize: '1.5rem', letterSpacing: '1px' }}>
                {u.points}
              </span>
            </div>
          ))}

          {/* Rest */}
          {leaderboard.slice(3).map((u, i) => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.85rem', minWidth: '40px', textAlign: 'center' }}>#{i + 4}</span>
              <span style={{ flex: 1, color: '#d1d5db' }}>{u.username}</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'Bangers', fontSize: '1.1rem', letterSpacing: '1px' }}>{u.points}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
