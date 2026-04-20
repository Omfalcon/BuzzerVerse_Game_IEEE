import React, { useState, useEffect } from 'react';
import { socketManager } from '../shared/socket';
import { Play, Square, RotateCcw, CheckCircle, XCircle, Users, X, LogOut } from 'lucide-react';

const API_BASE = "http://localhost:8000";

const AdminPage = ({ userData, onLogout }) => {
  const [gameState, setGameState] = useState({
    is_active: false,
    current_question: 'q1',
    round_type: 'frontend',
    responses: [],
    evaluated_users: {},
    users: {}
  });
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    socketManager.connect('admin');
    const unsubscribe = socketManager.subscribe((data) => {
      if (['init', 'state', 'reset', 'new_buzz', 'points_update', 'round_type', 'evaluation'].includes(data.type)) {
        fetchState();
      }
    });
    fetchState();
    return () => unsubscribe();
  }, []);

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/state`, {
        headers: { 'Authorization': `Bearer ${userData.token}` }
      });
      const data = await res.json();
      setGameState(data);
    } catch (e) {
      console.error("Failed to fetch state");
    }
  };

  const adminAction = async (endpoint, body = {}) => {
    try {
      await fetch(`${API_BASE}/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify(body)
      });
      fetchState();
    } catch (e) {
      alert(`Action ${endpoint} failed`);
    }
  };

  // Sorted scoreboard
  const scoreboard = Object.entries(gameState.users)
    .sort(([, a], [, b]) => b - a)
    .map(([name, pts], i) => ({ rank: i + 1, name, pts }));

  return (
    <div className="ap-root">

      {/* ── Top strip: round + question + status ── */}
      <div className="ap-header">
        <div className="ap-hcol">
          <span className="ap-micro">ROUND</span>
          <span className="ap-hval" style={{ color: '#a78bfa' }}>{gameState.round_type.toUpperCase()}</span>
        </div>
        <div className="ap-hcol center">
          <span className="ap-micro">QUESTION</span>
          <span className="ap-qnum">{gameState.current_question.toUpperCase()}</span>
        </div>
        <div className="ap-hcol right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className="ap-micro">STATUS</span>
              <span className={`ap-hval ${gameState.is_active ? 'live' : 'idle'}`}>
                {gameState.is_active ? '● LIVE' : '○ LOCKED'}
              </span>
            </div>
            <button className="ap-logout-btn" onClick={onLogout} title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="ap-grid">

        {/* LEFT: Controls */}
        <div className="ap-card">
          <p className="ap-card-title">CONTROLS</p>

          {/* Enable / Disable buzzer */}
          {!gameState.is_active ? (
            <button className="ap-btn green" onClick={() => adminAction('enable')}>
              <Play size={18} /> ENABLE BUZZER
            </button>
          ) : (
            <button className="ap-btn red" onClick={() => adminAction('disable')}>
              <Square size={18} /> DISABLE BUZZER
            </button>
          )}

          {/* Score & next */}
          <button className="ap-btn blue" onClick={() => {
            if (window.confirm('Score this round and advance to next question?')) adminAction('reset');
          }}>
            <RotateCcw size={18} /> SCORE &amp; NEXT Q
          </button>

          {/* Round type selector */}
          <p className="ap-micro" style={{ marginTop: '0.75rem', marginBottom: '0.4rem' }}>SELECT ROUND</p>
          <div className="ap-round-row">
            {['frontend', 'backend', 'mystery'].map(t => (
              <button
                key={t}
                className={`ap-round-btn ${gameState.round_type === t ? 'active' : ''}`}
                onClick={() => adminAction('round', { round_type: t })}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Scoreboard toggle */}
          <button className="ap-btn purple" onClick={() => setShowScoreboard(true)}>
            <Users size={18} /> VIEW ALL SCORES
          </button>

          {/* Terminate */}
          <button className="ap-btn danger" onClick={() => adminAction('conclude')}>
            TERMINATE TOURNAMENT
          </button>
        </div>

        {/* RIGHT: Signal feed */}
        <div className="ap-card">
          <p className="ap-card-title">SIGNALS — {gameState.current_question.toUpperCase()}</p>
          <div className="ap-signal-list">
            {gameState.responses.length === 0 ? (
              <p className="ap-empty">No signals yet...</p>
            ) : (
              gameState.responses.map((resp, i) => {
                const es = gameState.evaluated_users[resp.name];
                return (
                  <div key={resp.timestamp} className="ap-signal-row">
                    <span className="ap-sig-rank">#{i + 1}</span>
                    <div className="ap-sig-info">
                      <span className="ap-sig-name">{resp.name}</span>
                      <span className="ap-sig-delta">
                        {i === 0 ? 'FIRST' : `+${(resp.timestamp - gameState.responses[0].timestamp).toFixed(3)}s`}
                      </span>
                    </div>
                    <div className="ap-sig-btns">
                      <button
                        className={`ap-eval correct ${es === 'correct' ? 'on' : ''}`}
                        onClick={() => adminAction('evaluate', { username: resp.name, result: 'correct' })}
                        title="Correct"
                      >
                        <CheckCircle size={17} />
                      </button>
                      <button
                        className={`ap-eval wrong ${es === 'wrong' ? 'on' : ''}`}
                        onClick={() => adminAction('evaluate', { username: resp.name, result: 'wrong' })}
                        title="Wrong"
                      >
                        <XCircle size={17} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Scoreboard modal ── */}
      {showScoreboard && (
        <div className="ap-modal-overlay" onClick={() => setShowScoreboard(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <p className="ap-modal-title">ALL PLAYERS — LIVE SCORES</p>
              <button className="ap-close" onClick={() => setShowScoreboard(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="ap-modal-list">
              {scoreboard.length === 0 ? (
                <p className="ap-empty">No players registered yet.</p>
              ) : (
                scoreboard.map(({ rank, name, pts }) => (
                  <div key={name} className={`ap-score-row ${rank <= 3 ? 'top' : ''}`}>
                    <span className="ap-score-rank">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </span>
                    <span className="ap-score-name">{name}</span>
                    <span className="ap-score-pts">{pts} <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>PTS</span></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ap-root {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 1rem;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* Header strip */
        .ap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1.4rem;
          background: rgba(17,24,39,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          backdrop-filter: blur(20px);
        }
        .ap-hcol { display: flex; flex-direction: column; }
        .ap-hcol.center { align-items: center; }
        .ap-hcol.right  { align-items: flex-end; }
        .ap-micro {
          font-size: 0.52rem; font-weight: 800;
          letter-spacing: 2px; opacity: 0.35;
          text-transform: uppercase; margin-bottom: 3px;
        }
        .ap-hval { font-weight: 900; font-size: 0.85rem; }
        .ap-hval.live { color: #10b981; }
        .ap-hval.idle { color: #6b7280; }
        .ap-logout-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted);
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .ap-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .ap-qnum {
          font-family: 'Bangers', cursive;
          font-size: 2rem; letter-spacing: 4px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; line-height: 1;
        }

        /* Grid */
        .ap-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 1rem;
          flex: 1;
        }
        @media (max-width: 720px) {
          .ap-grid { grid-template-columns: 1fr; }
        }

        /* Card */
        .ap-card {
          background: rgba(17,24,39,0.7);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .ap-card-title {
          font-size: 0.62rem; font-weight: 900;
          letter-spacing: 2px; opacity: 0.35;
          text-transform: uppercase; margin-bottom: 0.25rem;
        }

        /* Buttons */
        .ap-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 0.6rem;
          padding: 0.9rem 1rem;
          border: none; border-radius: 12px;
          font-weight: 900; font-size: 0.78rem;
          letter-spacing: 1px; cursor: pointer;
          color: white; transition: opacity 0.15s, transform 0.1s;
        }
        .ap-btn:hover  { opacity: 0.88; }
        .ap-btn:active { transform: scale(0.97); }
        .ap-btn.green  { background: #059669; }
        .ap-btn.red    { background: #dc2626; }
        .ap-btn.blue   { background: #2563eb; }
        .ap-btn.purple { background: #7c3aed; }
        .ap-btn.danger {
          background: transparent;
          border: 1px solid rgba(239,68,68,0.3);
          color: #f87171;
          margin-top: auto;
        }

        /* Round row */
        .ap-round-row { display: flex; gap: 0.5rem; }
        .ap-round-btn {
          flex: 1; padding: 0.6rem 0.4rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          color: #6b7280; border-radius: 10px;
          font-size: 0.65rem; font-weight: 900;
          letter-spacing: 1px; cursor: pointer;
          transition: all 0.2s;
        }
        .ap-round-btn.active {
          background: rgba(139,92,246,0.12);
          border-color: #7c3aed; color: #a78bfa;
        }

        /* Signal feed */
        .ap-signal-list {
          display: flex; flex-direction: column; gap: 0.6rem;
          overflow-y: auto; max-height: 420px;
        }
        .ap-signal-row {
          display: flex; align-items: center; gap: 0.8rem;
          padding: 0.7rem 0.9rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
        }
        .ap-sig-rank { font-weight: 900; color: #60a5fa; width: 32px; font-size: 0.9rem; }
        .ap-sig-info { flex: 1; display: flex; flex-direction: column; }
        .ap-sig-name { font-weight: 800; font-size: 0.9rem; }
        .ap-sig-delta { font-size: 0.58rem; font-weight: 900; color: #10b981; letter-spacing: 1px; }
        .ap-sig-btns { display: flex; gap: 0.4rem; }
        .ap-eval {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; background: rgba(255,255,255,0.04);
          color: #6b7280; transition: all 0.2s;
        }
        .ap-eval.correct.on { background: #059669; border-color: #059669; color: white; }
        .ap-eval.wrong.on   { background: #dc2626; border-color: #dc2626; color: white; }
        .ap-empty { text-align: center; opacity: 0.25; font-size: 0.8rem; padding: 2rem; }

        /* ── Modal ── */
        .ap-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .ap-modal {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          width: 100%; max-width: 420px;
          max-height: 80vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        }
        .ap-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ap-modal-title { font-weight: 900; font-size: 0.75rem; letter-spacing: 2px; opacity: 0.6; }
        .ap-close {
          background: rgba(255,255,255,0.05);
          border: none; border-radius: 8px;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          color: white; cursor: pointer;
        }
        .ap-modal-list {
          overflow-y: auto; padding: 1rem;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .ap-score-row {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.025);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .ap-score-row.top {
          background: rgba(251,191,36,0.05);
          border-color: rgba(251,191,36,0.15);
        }
        .ap-score-rank { width: 36px; font-weight: 900; font-size: 1rem; }
        .ap-score-name { flex: 1; font-weight: 700; font-size: 0.9rem; }
        .ap-score-pts  { font-weight: 900; font-size: 1.1rem; color: #fbbf24; }
      `}</style>
    </div>
  );
};

export default AdminPage;
