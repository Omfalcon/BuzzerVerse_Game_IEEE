import { useState, useEffect } from 'react';
import socket from '../shared/socket';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://deploy.bhook.food';

const card = {
  background: 'rgba(17,24,39,0.7)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '1.5rem',
};

export default function AdminPage({ token, onLogout }) {
  const [gameState, setGameState] = useState({
    buzzer_active: false,
    question_number: 1,
    round_type: 'frontend',
    responses: [],
    evaluations: {},
    game_active: true,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLB, setShowLB] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalLB, setFinalLB] = useState(null);

  useEffect(() => {
    const onGameState = (s) => setGameState(s);
    const onRoundReset = ({ leaderboard: lb, game_state }) => {
      setGameState(game_state);
      setLeaderboard(lb);
    };
    const onGameEnded = ({ leaderboard: lb }) => {
      setGameEnded(true);
      setFinalLB(lb);
    };

    socket.on('game_state', onGameState);
    socket.on('round_reset', onRoundReset);
    socket.on('game_ended', onGameEnded);

    return () => {
      socket.off('game_state', onGameState);
      socket.off('round_reset', onRoundReset);
      socket.off('game_ended', onGameEnded);
    };
  }, []);

  const send = (event, extra = {}) => socket.emit(event, { token, ...extra });

  const handleViewLB = async () => {
    try {
      const res = await fetch(`${BACKEND}/leaderboard`);
      setLeaderboard(await res.json());
    } catch {}
    setShowLB(true);
  };

  const handleReset = () => { send('admin_reset'); setConfirmReset(false); };
  const handleEnd = () => { send('admin_conclude'); setConfirmEnd(false); };

  // ── Game Ended screen ─────────────────────────────────────────────────────
  if (gameEnded) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Bangers', fontSize: '3.5rem', letterSpacing: '6px', color: '#fbbf24', marginBottom: '0.5rem' }}>TOURNAMENT ENDED</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '2rem' }}>Final Standings</p>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {finalLB?.map((u, i) => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', minWidth: '32px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{u.username}</span>
              <span style={{ color: '#fbbf24', fontFamily: 'Bangers', fontSize: '1.25rem', letterSpacing: '1px' }}>{u.points}</span>
            </div>
          ))}
        </div>
        <button onClick={onLogout} style={{ marginTop: '2rem', padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    );
  }

  // ── Main Admin UI ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '0.2rem' }}>Admin Panel</p>
          <h2 style={{ fontFamily: 'Bangers', fontSize: '1.75rem', letterSpacing: '3px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Q{gameState.question_number} · <span style={{ color: '#60a5fa' }}>{gameState.round_type.toUpperCase()}</span>
            <span style={{
              fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '999px', letterSpacing: '2px',
              background: gameState.buzzer_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
              border: `1px solid ${gameState.buzzer_active ? '#10b981' : '#6b7280'}`,
              color: gameState.buzzer_active ? '#10b981' : 'var(--text-muted)',
            }}>
              {gameState.buzzer_active ? '● LIVE' : '○ LOCKED'}
            </span>
          </h2>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#374151', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.25rem' }}>

        {/* ── Controls panel ── */}
        <div style={card}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '1.25rem' }}>Controls</p>

          {/* Enable / Disable */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => send('admin_enable')}
              disabled={gameState.buzzer_active}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 800, cursor: gameState.buzzer_active ? 'not-allowed' : 'pointer', opacity: gameState.buzzer_active ? 0.45 : 1, transition: 'opacity 0.2s' }}
            >
              ▶ Enable
            </button>
            <button
              onClick={() => send('admin_disable')}
              disabled={!gameState.buzzer_active}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 800, cursor: !gameState.buzzer_active ? 'not-allowed' : 'pointer', opacity: !gameState.buzzer_active ? 0.45 : 1, transition: 'opacity 0.2s' }}
            >
              ■ Disable
            </button>
          </div>

          {/* Round type */}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700 }}>Round Type</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {['frontend', 'backend', 'mystery'].map(r => (
              <button key={r} onClick={() => send('admin_set_round', { round_type: r })} style={{ flex: 1, padding: '0.5rem 0', borderRadius: '8px', border: `1px solid ${gameState.round_type === r ? '#3b82f6' : 'rgba(255,255,255,0.07)'}`, background: gameState.round_type === r ? 'rgba(59,130,246,0.15)' : 'transparent', color: gameState.round_type === r ? '#60a5fa' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'capitalize', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}>
                {r}
              </button>
            ))}
          </div>

          {/* View leaderboard */}
          <button onClick={handleViewLB} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#f9fafb', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            📊 View Leaderboard
          </button>

          {/* Score & next question */}
          <button onClick={() => setConfirmReset(true)} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'rgba(59,130,246,0.18)', color: '#60a5fa', fontWeight: 800, cursor: 'pointer', marginBottom: '0.75rem' }}>
            ⏭ Score & Next Question
          </button>

          {/* End tournament */}
          <button onClick={() => setConfirmEnd(true)} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>
            🛑 End Tournament
          </button>
        </div>

        {/* ── Buzz Feed ── */}
        <div style={card}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '1.25rem' }}>
            Buzz Feed <span style={{ color: '#f9fafb', marginLeft: '0.5rem' }}>({gameState.responses.length})</span>
          </p>

          {gameState.responses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#374151', fontSize: '0.85rem' }}>
              Waiting for buzzes...
            </div>
          ) : (
            gameState.responses.map((r) => {
              const evaluation = gameState.evaluations[r.email];
              return (
                <div key={r.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', marginBottom: '0.5rem' }}>
                  <span style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: r.rank <= 3 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)', color: r.rank <= 3 ? '#fbbf24' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                    #{r.rank}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.1rem' }}>{r.username}</p>
                    <p style={{ color: '#4b5563', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</p>
                  </div>
                  {evaluation ? (
                    <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', background: evaluation === 'correct' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: evaluation === 'correct' ? '#10b981' : '#ef4444', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {evaluation === 'correct' ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => send('admin_evaluate', { email: r.email, result: 'correct' })} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: 'none', background: 'rgba(16,185,129,0.18)', color: '#10b981', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>✓</button>
                      <button onClick={() => send('admin_evaluate', { email: r.email, result: 'wrong' })} style={{ padding: '0.35rem 0.7rem', borderRadius: '7px', border: 'none', background: 'rgba(239,68,68,0.18)', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>✗</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Leaderboard Modal ── */}
      {showLB && (
        <Modal onClose={() => setShowLB(false)} title="LEADERBOARD">
          {leaderboard.map((u, i) => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem', minWidth: '28px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{u.username}</span>
              <span style={{ color: '#fbbf24', fontFamily: 'Bangers', fontSize: '1.1rem', letterSpacing: '1px' }}>{u.points}</span>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No participants yet</p>}
        </Modal>
      )}

      {/* ── Confirm Reset Modal ── */}
      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)} title="Confirm Score & Next Q">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This will apply all scores and advance to Q{gameState.question_number + 1}.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setConfirmReset(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button onClick={handleReset} style={{ flex: 1, padding: '0.75rem', background: 'rgba(59,130,246,0.2)', border: 'none', color: '#60a5fa', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>Confirm</button>
          </div>
        </Modal>
      )}

      {/* ── Confirm End Modal ── */}
      {confirmEnd && (
        <Modal onClose={() => setConfirmEnd(false)} title="End Tournament?">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This will permanently end the game and broadcast final scores to everyone.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setConfirmEnd(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
            <button onClick={handleEnd} style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>End Game</button>
          </div>
        </Modal>
      )}

      <style>{`
        @media (max-width: 640px) {
          [data-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '440px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Bangers', fontSize: '1.5rem', letterSpacing: '3px' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
