import React from 'react';

export default function RepairSuccess({ message, onReset, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        <style>{`
          /* Background circle */
          .sc-bg {
            transform-origin: 50px 50px;
            animation: scBgPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
          }

          /* Notepad body */
          .sc-pad {
            transform-origin: 50px 55px;
            animation: scPadPop 0.4s 0.1s cubic-bezier(0.175,0.885,0.32,1.275) both;
          }

          /* Lines on notepad — drawn one by one */
          .sc-line1 { stroke-dasharray: 22; stroke-dashoffset: 22; animation: scLineDraw 0.25s 0.5s ease-out forwards; }
          .sc-line2 { stroke-dasharray: 16; stroke-dashoffset: 16; animation: scLineDraw 0.25s 0.8s ease-out forwards; }
          .sc-line3 { stroke-dasharray: 12; stroke-dashoffset: 12; animation: scLineDraw 0.25s 1.1s ease-out forwards; }

          /* Pencil — slides in from top-right, then writes (rotates back and forth) */
          .sc-pencil {
            transform-origin: 68px 32px;
            transform: translate(30px, -30px) rotate(-15deg);
            opacity: 0;
            animation: scPencilEnter 0.35s 0.45s ease-out forwards, scPencilWrite 1.1s 0.8s ease-in-out forwards;
          }

          /* Pencil exits, checkmark appears */
          .sc-pencil-exit {
            transform-origin: 68px 32px;
            animation: scPencilExit 0.3s 2.05s ease-in forwards;
          }

          .sc-check-circle {
            transform-origin: 50px 50px;
            transform: scale(0);
            animation: scCheckPop 0.45s 2.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
          }
          .sc-check-tick {
            stroke-dasharray: 76;
            stroke-dashoffset: 76;
            animation: scTickDraw 0.4s 2.65s ease-out forwards;
          }
          .sc-success-text {
            opacity: 0;
            transform: translateY(12px);
            animation: scFadeUp 0.4s 2.8s forwards;
          }

          @keyframes scBgPop   { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes scPadPop  { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes scLineDraw { to { stroke-dashoffset: 0; } }

          @keyframes scPencilEnter {
            from { transform: translate(30px,-30px) rotate(-15deg); opacity: 0; }
            to   { transform: translate(0px, 0px)   rotate(-35deg); opacity: 1; }
          }
          @keyframes scPencilWrite {
            0%   { transform: rotate(-35deg) translate(0,0); }
            20%  { transform: rotate(-30deg) translate(2px, 2px); }
            40%  { transform: rotate(-38deg) translate(-1px,-1px); }
            60%  { transform: rotate(-32deg) translate(3px, 1px); }
            80%  { transform: rotate(-36deg) translate(1px,-1px); }
            100% { transform: rotate(-35deg) translate(0,0); }
          }
          @keyframes scPencilExit {
            from { transform: rotate(-35deg) translate(0,0); opacity: 1; }
            to   { transform: rotate(-35deg) translate(40px,-40px); opacity: 0; }
          }

          @keyframes scCheckPop { from { transform: scale(0); } to { transform: scale(1); } }
          @keyframes scTickDraw { to { stroke-dashoffset: 0; } }
          @keyframes scFadeUp   { to { opacity: 1; transform: translateY(0); } }
        `}</style>

        {/* Background circle */}
        <circle className="sc-bg" cx="50" cy="50" r="46" fill="#e0e7ff" />

        {/* Notepad */}
        <g className="sc-pad">
          {/* Notepad body */}
          <rect x="28" y="30" width="40" height="46" rx="4" ry="4" fill="#ffffff" stroke="#c7d2fe" strokeWidth="1.5" />
          {/* Spiral binding */}
          <rect x="26" y="30" width="6" height="46" rx="3" fill="#a5b4fc" />
          {/* Hole punches */}
          <circle cx="29" cy="40" r="2" fill="#e0e7ff" />
          <circle cx="29" cy="53" r="2" fill="#e0e7ff" />
          <circle cx="29" cy="66" r="2" fill="#e0e7ff" />
        </g>

        {/* Lines drawn by pencil */}
        <line className="sc-line1" x1="38" y1="42" x2="60" y2="42" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <line className="sc-line2" x1="38" y1="52" x2="54" y2="52" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <line className="sc-line3" x1="38" y1="62" x2="50" y2="62" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

        {/* Pencil */}
        <g className="sc-pencil sc-pencil-exit">
          {/* Pencil body */}
          <polygon points="58,20 74,20 74,44 66,50 58,44" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
          {/* Pencil tip */}
          <polygon points="58,44 74,44 66,52" fill="#fef3c7" />
          <polygon points="61,46 71,46 66,52" fill="#d97706" />
          {/* Pencil top eraser */}
          <rect x="58" y="17" width="16" height="5" rx="1" fill="#f87171" />
          {/* Metal band */}
          <rect x="58" y="20" width="16" height="3" fill="#d1d5db" />
          {/* Pencil shine */}
          <line x1="62" y1="22" x2="62" y2="44" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Checkmark overlay */}
        <circle className="sc-check-circle" cx="50" cy="50" r="46" fill="#10b981" />
        <path className="sc-check-tick" d="M 25 52 L 40 67 L 76 30" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>

      <div className="sc-success-text">
        <h3 style={{ color: '#10b981', fontSize: '1.5rem', marginBottom: '0.5rem', marginTop: '1.25rem' }}>
          {t ? t('submitSuccess') || 'Success!' : 'Success!'}
        </h3>
        <p style={{ color: 'var(--color-text-main)', fontSize: '1.05rem', marginBottom: '2rem' }}>{message}</p>
        <button onClick={onReset} className="btn btn-outline" style={{ minWidth: '200px' }}>
          {t ? t('submitAnother') || 'Submit Another Request' : 'Submit Another Request'}
        </button>
      </div>
    </div>
  );
}
