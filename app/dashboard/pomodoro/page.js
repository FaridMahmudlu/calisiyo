'use client';

import { useState, useEffect, useRef } from 'react';

export default function PomodoroPage() {
  const [presets] = useState([
    { label: '25 / 5', work: 25, break_: 5 },
    { label: '50 / 10', work: 50, break_: 10 },
    { label: '90 / 20', work: 90, break_: 20 },
  ]);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customWork, setCustomWork] = useState('');
  const [customBreak, setCustomBreak] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [totalSessions, setTotalSessions] = useState(0);
  const intervalRef = useRef(null);

  const currentPreset = isCustom
    ? { work: parseInt(customWork) || 25, break_: parseInt(customBreak) || 5 }
    : presets[selectedPreset];

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer finished
          if (!isBreak) {
            setTotalSessions(s => s + 1);
            setIsBreak(true);
            return currentPreset.break_ * 60;
          } else {
            setIsBreak(false);
            setIsRunning(false);
            return currentPreset.work * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isBreak]);

  function handleStart() {
    if (!isRunning && !isBreak) {
      setTimeLeft(currentPreset.work * 60);
    }
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleReset() {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(currentPreset.work * 60);
  }

  function selectPreset(idx) {
    setSelectedPreset(idx);
    setIsCustom(false);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(presets[idx].work * 60);
  }

  function applyCustom() {
    setIsCustom(true);
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft((parseInt(customWork) || 25) * 60);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = (isBreak ? currentPreset.break_ : currentPreset.work) * 60;
  const progressPct = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="page animate-fade-in">
      <div className="pomo-container">
        {/* Timer Circle */}
        <div className="pomo-timer-wrapper">
          <svg className="pomo-circle" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" className="pomo-track" />
            <circle
              cx="150" cy="150" r="140"
              className="pomo-progress"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                stroke: isBreak ? 'var(--info)' : 'var(--primary-500)',
              }}
            />
          </svg>
          <div className="pomo-time-display">
            <span className="pomo-status">{isBreak ? '☕ Mola' : '📖 Çalışma'}</span>
            <span className="pomo-time">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="pomo-controls">
          {!isRunning ? (
            <button className="btn btn-primary btn-lg" onClick={handleStart}>
              ▶ {timeLeft === currentPreset.work * 60 && !isBreak ? 'Başla' : 'Devam'}
            </button>
          ) : (
            <button className="btn btn-secondary btn-lg" onClick={handlePause}>⏸ Duraklat</button>
          )}
          <button className="btn btn-ghost btn-lg" onClick={handleReset}>↺ Sıfırla</button>
        </div>

        {/* Presets */}
        <div className="pomo-presets">
          <h3 className="pomo-section-title">Hazır Süreler</h3>
          <div className="preset-grid">
            {presets.map((p, i) => (
              <button
                key={i}
                className={`preset-card card ${selectedPreset === i && !isCustom ? 'preset-active' : ''}`}
                onClick={() => selectPreset(i)}
              >
                <span className="preset-label">{p.label}</span>
                <span className="preset-desc">{p.work}dk çalışma / {p.break_}dk mola</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div className="pomo-custom card">
          <h3 className="pomo-section-title">Özel Süre</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Çalışma (dk)</label>
              <input className="input" type="number" value={customWork} onChange={(e) => setCustomWork(e.target.value)} placeholder="25" />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Mola (dk)</label>
              <input className="input" type="number" value={customBreak} onChange={(e) => setCustomBreak(e.target.value)} placeholder="5" />
            </div>
            <button className="btn btn-primary" onClick={applyCustom}>Uygula</button>
          </div>
        </div>

        {/* Sessions */}
        <div className="pomo-sessions">
          <span>Tamamlanan: <strong>{totalSessions}</strong> oturum</span>
        </div>
      </div>

      <style jsx>{`
        .pomo-container {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        .pomo-timer-wrapper {
          position: relative;
          width: 280px;
          height: 280px;
          margin: 0 auto 32px;
        }

        .pomo-circle {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .pomo-track {
          fill: none;
          stroke: var(--gray-200);
          stroke-width: 8;
        }

        .pomo-progress {
          fill: none;
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
        }

        .pomo-time-display {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .pomo-status {
          font-size: 0.875rem;
          color: var(--text-tertiary);
          margin-bottom: 4px;
        }

        .pomo-time {
          font-size: 3rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 2px;
        }

        .pomo-controls {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 40px;
        }

        .pomo-section-title {
          font-size: 0.9375rem;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: left;
        }

        .pomo-presets {
          margin-bottom: 20px;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .preset-card {
          padding: 14px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .preset-active {
          border-color: var(--primary-500);
          background: var(--primary-50);
        }

        .preset-label {
          font-size: 1rem;
          font-weight: 700;
          display: block;
        }

        .preset-desc {
          font-size: 0.6875rem;
          color: var(--text-tertiary);
        }

        .pomo-custom {
          margin-bottom: 20px;
        }

        .pomo-sessions {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
