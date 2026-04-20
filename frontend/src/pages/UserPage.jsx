import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { socketManager } from '../shared/socket';
import WastedOverlay from '../components/WastedOverlay';

const UserPage = ({ userData, onLogout }) => {
  const [gameState, setGameState] = useState({
    is_active: false,
    current_question: 'q1',
    round_type: 'frontend',
    responses: [],
    users: {}
  });
  const [wasted, setWasted] = useState({ show: false, text: '' });
  const [frozen, setFrozen] = useState(false);
  // ref so space-bar handler always has fresh state without re-registering
  const stateRef = useRef({ is_active: false, frozen: false, hasBuzzed: false });

  useEffect(() => {
    socketManager.connect('user', userData.name);

    const unsubscribe = socketManager.subscribe((data) => {
      if (data.type === 'init') {
        setGameState(prev => ({ ...prev, ...data }));
      } else if (data.type === 'state') {
        setGameState(prev => ({ ...prev, is_active: data.is_active }));
        if (!data.is_active) setFrozen(false);
      } else if (data.type === 'reset') {
        setFrozen(false);
        setGameState(prev => ({
          ...prev,
          current_question: data.question,
          responses: [],
          is_active: false
        }));
      } else if (data.type === 'new_buzz') {
        setGameState(prev => ({ ...prev, responses: [...prev.responses, data.data] }));
      } else if (data.type === 'points_update') {
        setGameState(prev => ({ ...prev, users: data.users }));
      } else if (data.type === 'round_type') {
        setFrozen(false);
        setGameState(prev => ({ ...prev, round_type: data.value, current_question: 'q1' }));
      }
    });

    return () => unsubscribe();
  }, [userData.name]);

  const hasBuzzed = gameState.responses.some(r => r.name === userData.name);
  const myPoints = gameState.users[userData.name] ?? 0;

  // keep ref in sync so space handler is always current
  useEffect(() => {
    stateRef.current = { is_active: gameState.is_active, frozen, hasBuzzed };
  }, [gameState.is_active, frozen, hasBuzzed]);

  const fireBuzz = () => {
    const { is_active, frozen: fr, hasBuzzed: hb } = stateRef.current;
    if (!is_active || fr || hb) return;
    socketManager.buzz(userData.name);
    setFrozen(true);
    const t = ['TAGGED', 'BUSTED', 'WASTED', 'SMASHED'];
    setWasted({ show: true, text: t[Math.floor(Math.random() * t.length)] });
    setTimeout(() => setWasted(p => ({ ...p, show: false })), 1800);
  };

  // single, stable keydown listener
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); fireBuzz(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);   // intentionally empty — uses ref

  const locked = frozen || hasBuzzed;

  return (
    <div className="up-wrap">
      <WastedOverlay show={wasted.show} text={wasted.text} />

      {/* ── Header bar ── */}
      <header className="up-bar">
        <div className="up-player-block">
          <div className="up-avatar">{userData.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="up-lbl">PLAYER</div>
            <div className="up-pname">{userData.name}</div>
          </div>
        </div>

        <div className="up-mid-block">
          <div className="up-lbl">QUESTION</div>
          <div className="up-qbig">{gameState.current_question.toUpperCase()}</div>
        </div>

        <div className="up-right-block">
          <div className="up-lbl">POINTS</div>
          <div className="up-pts">🪙 {myPoints}</div>
          <button className="up-logout-btn" onClick={onLogout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Round + Question big display ── */}
      <div className="up-rq-block">
        <div className="up-round-big">{gameState.round_type.toUpperCase()} ROUND</div>
        <div className="up-question-big">QUESTION {gameState.current_question.toUpperCase()}</div>
        <div className="up-status-pip">
          <span className="up-round-dot" style={{ background: gameState.is_active ? '#10b981' : '#6b7280' }} />
          <span className="up-status-txt">{gameState.is_active ? 'LIVE' : 'WAITING'}</span>
        </div>
      </div>

      {/* ── Buzzer stage ── */}
      <main className="up-stage">
        {!gameState.is_active ? (
          <div className="up-idle">
            <div className="up-ring r1" />
            <div className="up-ring r2" />
            <div className="up-ring r3" />
            <div className="up-idle-core" />
            <p className="up-idle-txt">Waiting for host to start...</p>
          </div>
        ) : (
          <div className="up-buzzer-wrap">
            <button
              className={`up-buzzer ${locked ? 'locked' : 'ready'}`}
              onClick={fireBuzz}
              disabled={locked}
            >
              <span className="up-bzlabel">{locked ? 'LOCKED' : 'BUZZ!'}</span>
            </button>
            <p className="up-hint">
              {locked ? '✓ Signal registered — waiting for result' : 'TAP BUTTON  ·  OR PRESS SPACE'}
            </p>
          </div>
        )}
      </main>

      {/* ── Signal feed ── */}
      <section className="up-feed">
        <div className="up-feed-hdr">⚡ LIVE SIGNALS</div>
        {gameState.responses.length === 0 ? (
          <p className="up-feed-empty">No signals yet…</p>
        ) : (
          gameState.responses.map((r, i) => (
            <div key={i} className={`up-feed-row ${r.name === userData.name ? 'mine' : ''}`}>
              <span className="up-feed-rank">#{i + 1}</span>
              <span className="up-feed-name">{r.name}</span>
              {r.name === userData.name && <span className="up-feed-you">YOU</span>}
            </div>
          ))
        )}
      </section>

      <style>{`
        /* ── Shell ── */
        .up-wrap {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 560px;       /* comfortable on laptop, full on phone */
          min-height: 100dvh;
          margin: 0 auto;
          padding: 1rem 1rem 2rem;
          gap: 0.85rem;
          box-sizing: border-box;
        }

        /* ── Header bar ── */
        .up-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          gap: 0.5rem;
        }
        .up-player-block { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
        .up-avatar {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 1rem; color: white;
        }
        .up-mid-block { text-align: center; }
        .up-right-block { text-align: right; flex: 1; }
        .up-lbl {
          font-size: 0.5rem; font-weight: 800;
          letter-spacing: 2px; opacity: 0.35;
          text-transform: uppercase; margin-bottom: 2px;
        }
        .up-pname {
          font-weight: 800; font-size: 0.9rem;
          color: #60a5fa;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 130px;
        }
        .up-qbig {
          font-family: 'Bangers', cursive;
          font-size: 1.6rem; letter-spacing: 4px;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          line-height: 1;
        }
        .up-pts { font-weight: 900; font-size: 1.05rem; color: #fbbf24; margin-bottom: 0.5rem; }
        .up-logout-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted);
          width: 32px; height: 32px;
          border-radius: 8px;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
          margin-top: 0.25rem;
        }
        .up-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        /* ── Round + Question big block ── */
        .up-rq-block {
          text-align: center;
          padding: 1rem 1rem 0.85rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
        }
        .up-round-big {
          font-family: 'Bangers', cursive;
          font-size: clamp(1.8rem, 6vw, 2.8rem);
          letter-spacing: 5px;
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          line-height: 1;
        }
        .up-question-big {
          font-family: 'Bangers', cursive;
          font-size: clamp(2.4rem, 9vw, 4rem);
          letter-spacing: 6px;
          color: white;
          line-height: 1;
          text-shadow: 0 0 30px rgba(255,255,255,0.15);
        }
        .up-status-pip { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem; }
        .up-round-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .up-status-txt { font-size: 0.58rem; font-weight: 800; letter-spacing: 2px; opacity: 0.4; }

        /* ── Stage ── */
        .up-stage {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          min-height: 240px;
        }

        /* ── Idle rings ── */
        .up-idle {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
        }
        .up-ring {
          position: absolute; top: 50%; left: 50%;
          border-radius: 50%;
          border: 1.5px solid rgba(99,102,241,0.3);
          animation: upRing 3s ease-out infinite;
        }
        .up-ring.r1 { width: 80px;  height: 80px;  animation-delay: 0s; }
        .up-ring.r2 { width: 80px;  height: 80px;  animation-delay: 1s; }
        .up-ring.r3 { width: 80px;  height: 80px;  animation-delay: 2s; }
        @keyframes upRing {
          0%   { transform: translate(-50%,-50%) scale(0.6); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
        .up-idle-core {
          width: 12px; height: 12px; border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 14px rgba(129,140,248,0.8);
          margin-bottom: 60px;
        }
        .up-idle-txt {
          margin-top: 0.6rem;
          font-size: 0.75rem; font-weight: 700; opacity: 0.4; letter-spacing: 1px;
        }

        /* ── Buzzer ── */
        .up-buzzer-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 1.5rem;
        }
        .up-buzzer {
          /* size scales with viewport so it's big on laptop, good on phone */
          width: clamp(170px, 38vw, 240px);
          height: clamp(170px, 38vw, 240px);
          border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.07s ease, box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .up-buzzer.ready {
          background: radial-gradient(circle at 38% 32%, #f87171, #991b1b);
          box-shadow:
            0 0 0 clamp(10px,2vw,18px) rgba(239,68,68,0.10),
            0 0 0 clamp(20px,4vw,34px) rgba(239,68,68,0.05),
            0 0 clamp(40px,8vw,70px) rgba(239,68,68,0.45);
        }
        .up-buzzer.ready:hover  { transform: scale(1.04); }
        .up-buzzer.ready:active { transform: scale(0.93); }
        .up-buzzer.locked {
          background: radial-gradient(circle at 38% 32%, #4b5563, #1f2937);
          box-shadow: none; cursor: not-allowed; opacity: 0.5;
        }
        .up-bzlabel {
          font-family: 'Bangers', cursive;
          font-size: clamp(1.6rem, 5vw, 2.4rem);
          letter-spacing: 4px; color: white;
          pointer-events: none; user-select: none;
        }
        .up-hint {
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.5px; opacity: 0.4; text-align: center;
          max-width: 280px;
        }

        /* ── Feed ── */
        .up-feed {
          padding: 1rem 1.1rem;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
        }
        .up-feed-hdr {
          font-size: 0.65rem; font-weight: 900;
          letter-spacing: 2.5px; opacity: 0.35;
          text-transform: uppercase; margin-bottom: 0.75rem;
        }
        .up-feed-empty { font-size: 0.8rem; opacity: 0.25; text-align: center; padding: 0.75rem; }
        .up-feed-row {
          display: flex; align-items: center; gap: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 12px; font-size: 0.95rem;
          transition: background 0.2s;
        }
        .up-feed-row.mine {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
        }
        .up-feed-rank { color: #60a5fa; font-weight: 900; width: 28px; }
        .up-feed-name { flex: 1; font-weight: 700; }
        .up-feed-you  {
          font-size: 0.52rem; font-weight: 900;
          background: #ef4444; color: white;
          padding: 2px 6px; border-radius: 4px; letter-spacing: 1px;
        }

        /* ── Responsive: laptop gets bigger buzzer stage ── */
        @media (min-width: 600px) {
          .up-wrap { padding-top: 1.5rem; }
          .up-stage { min-height: 300px; }
          .up-bar { padding: 1rem 1.5rem; }
          .up-pname { max-width: 180px; }
        }

        /* ── Very short phones ── */
        @media (max-height: 650px) {
          .up-stage { min-height: 180px; }
          .up-feed { display: none; }  /* hide feed on tiny screens to save space */
        }
      `}</style>
    </div>
  );
};

export default UserPage;
