import { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../shared/socket';

export default function UserPage({ user, onLogout, updatePoints }) {
  const [gameState, setGameState] = useState({
    buzzer_active: false,
    question_number: 1,
    round_type: 'frontend',
    responses: [],
    evaluations: {},
    game_active: true,
  });
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [points, setPoints] = useState(user.points);
  const [scoreDelta, setScoreDelta] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);
  const deltaTimer = useRef(null);

  // Keep a ref so spacebar handler never has stale closure
  const canBuzzRef = useRef(false);
  canBuzzRef.current = gameState.buzzer_active && !hasBuzzed;

  const handleBuzz = useCallback(async () => {
    if (!canBuzzRef.current) return;
    setHasBuzzed(true);
    try {
      const idToken = await user.fbUser.getIdToken();
      socket.emit('buzz', { id_token: idToken });
    } catch {
      setHasBuzzed(false);
    }
  }, [user.fbUser]);

  useEffect(() => {
    const onGameState = (state) => {
      setGameState(state);
      // Reset hasBuzzed if our email is no longer in the response list (new round)
      const stillIn = state.responses.some(r => r.email === user.email);
      if (!stillIn) setHasBuzzed(false);
    };

    const onRoundReset = ({ score_deltas, game_state }) => {
      setGameState(game_state);
      setHasBuzzed(false);
      const delta = score_deltas[user.email];
      if (delta !== undefined) {
        setScoreDelta(delta);
        setPoints(prev => {
          const next = prev + delta;
          updatePoints(next);
          return next;
        });
        if (deltaTimer.current) clearTimeout(deltaTimer.current);
        deltaTimer.current = setTimeout(() => setScoreDelta(null), 3500);
      }
    };

    const onGameEnded = ({ leaderboard }) => {
      setGameEnded(true);
      setFinalLeaderboard(leaderboard);
    };

    socket.on('game_state', onGameState);
    socket.on('round_reset', onRoundReset);
    socket.on('game_ended', onGameEnded);

    return () => {
      socket.off('game_state', onGameState);
      socket.off('round_reset', onRoundReset);
      socket.off('game_ended', onGameEnded);
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
    };
  }, [user.email, updatePoints]);

  // Spacebar buzzer
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (canBuzzRef.current) handleBuzz();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBuzz]);

  const myRank = gameState.responses.findIndex(r => r.email === user.email) + 1;

  const roundColors = { frontend: '#3b82f6', backend: '#10b981', mystery: '#8b5cf6' };
  const roundColor = roundColors[gameState.round_type] || '#3b82f6';

  // ── Game Over screen ──────────────────────────────────────────────────────
  if (gameEnded) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Bangers', fontSize: '3.5rem', letterSpacing: '6px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', marginBottom: '0.5rem' }}>
          GAME OVER
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '3px' }}>Final Standings</p>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {finalLeaderboard?.map((u, i) => (
            <div key={u.username} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', background: u.username === user.username ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${u.username === user.username ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', minWidth: '32px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span style={{ flex: 1, fontWeight: 700 }}>{u.username}</span>
              <span style={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'Bangers', fontSize: '1.25rem', letterSpacing: '1px' }}>{u.points}</span>
            </div>
          ))}
        </div>
        <button onClick={onLogout} style={{ marginTop: '2rem', padding: '0.75rem 2rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
          Leave
        </button>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem', maxWidth: '560px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: roundColor, boxShadow: `0 0 6px ${roundColor}` }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
              {gameState.round_type} round
            </span>
          </div>
          <h2 style={{ fontFamily: 'Bangers', fontSize: '1.6rem', letterSpacing: '2px' }}>
            Q{gameState.question_number} · {user.username}
          </h2>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <span style={{ color: '#fbbf24', fontFamily: 'Bangers', fontSize: '1.75rem', letterSpacing: '1px' }}>{points}</span>
            {scoreDelta !== null && (
              <span style={{
                color: scoreDelta >= 0 ? '#10b981' : '#ef4444',
                fontWeight: 900, fontSize: '1rem',
                animation: 'scorePop 0.4s ease',
              }}>
                {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>pts</div>
        </div>
      </div>

      {/* Status pill */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 1.25rem',
          borderRadius: '999px',
          background: gameState.buzzer_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
          border: `1px solid ${gameState.buzzer_active ? '#10b981' : '#6b7280'}`,
          color: gameState.buzzer_active ? '#10b981' : 'var(--text-muted)',
          fontSize: '0.7rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase',
        }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', ...(gameState.buzzer_active ? { boxShadow: '0 0 4px #10b981', animation: 'pulse 1.5s infinite' } : {}) }} />
          {gameState.buzzer_active ? 'BUZZER LIVE' : 'WAITING'}
        </span>
      </div>

      {/* Big Buzzer Button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0 1rem' }}>
        <button
          onClick={handleBuzz}
          disabled={!gameState.buzzer_active || hasBuzzed}
          style={{
            width: '210px', height: '210px',
            borderRadius: '50%',
            border: 'none',
            cursor: gameState.buzzer_active && !hasBuzzed ? 'pointer' : 'not-allowed',
            background: hasBuzzed
              ? 'linear-gradient(135deg, #065f46, #047857)'
              : gameState.buzzer_active
                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                : 'rgba(55,65,81,0.4)',
            color: 'white',
            fontFamily: 'Bangers',
            fontSize: hasBuzzed ? '1.5rem' : '2.5rem',
            letterSpacing: '3px',
            boxShadow: gameState.buzzer_active && !hasBuzzed
              ? '0 0 50px rgba(220,38,38,0.45), 0 0 100px rgba(220,38,38,0.15), inset 0 2px 4px rgba(255,255,255,0.1)'
              : hasBuzzed
                ? '0 0 30px rgba(5,150,105,0.3)'
                : 'none',
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            transform: hasBuzzed ? 'scale(0.93)' : 'scale(1)',
            outline: 'none',
          }}
          onMouseDown={e => { if (!hasBuzzed && gameState.buzzer_active) e.currentTarget.style.transform = 'scale(0.96)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = hasBuzzed ? 'scale(0.93)' : 'scale(1)'; }}
        >
          {hasBuzzed ? `RANK #${myRank}` : 'BUZZ'}
        </button>
      </div>

      <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.72rem', marginBottom: '2rem', height: '1rem' }}>
        {gameState.buzzer_active && !hasBuzzed ? 'Click or press SPACE to buzz' : ''}
      </p>

      {/* Signal Feed */}
      {gameState.responses.length > 0 && (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.75rem', fontWeight: 700 }}>
            Signal Feed
          </p>
          {gameState.responses.map((r) => {
            const isMe = r.email === user.email;
            const evaluation = gameState.evaluations[r.email];
            return (
              <div key={r.email} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: isMe ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.025)',
                border: `1px solid ${isMe ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '10px', marginBottom: '0.5rem',
              }}>
                <span style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: r.rank <= 3 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)', color: r.rank <= 3 ? '#fbbf24' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>
                  #{r.rank}
                </span>
                <span style={{ flex: 1, fontWeight: isMe ? 700 : 400 }}>{r.username}</span>
                {isMe && <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>YOU</span>}
                {evaluation && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: evaluation === 'correct' ? '#10b981' : '#ef4444' }}>
                    {evaluation === 'correct' ? '✓' : '✗'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Logout */}
      <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '2rem' }}>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#374151', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Logout
        </button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes scorePop { 0% { transform: scale(0.7); opacity:0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity:1; } }
      `}</style>
    </div>
  );
}
