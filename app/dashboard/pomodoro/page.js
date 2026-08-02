'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Clock, Settings2 } from 'lucide-react';

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
      if (timeLeft === 0) setTimeLeft(currentPreset.work * 60);
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page"
    >
      <div className="pomo-container">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pomo-header"
        >
          <Clock size={32} color={isBreak ? "var(--info)" : "var(--primary-500)"} />
          <h1>Pomodoro</h1>
        </motion.div>

        {/* Timer Circle */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="pomo-timer-wrapper"
        >
          <svg className="pomo-circle" viewBox="0 0 300 300">
            <defs>
              <linearGradient id="pomo-gradient-work" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary-400)" />
                <stop offset="100%" stopColor="var(--primary-600)" />
              </linearGradient>
              <linearGradient id="pomo-gradient-break" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            <circle cx="150" cy="150" r="140" className="pomo-track" />
            <circle
              cx="150" cy="150" r="140"
              className="pomo-progress"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                stroke: isBreak ? 'url(#pomo-gradient-break)' : 'url(#pomo-gradient-work)',
              }}
            />
          </svg>
          <div className="pomo-time-display">
            <AnimatePresence mode="wait">
              <motion.div
                key={isBreak ? 'break' : 'work'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pomo-status"
              >
                {isBreak ? (
                  <><Coffee size={18} /> Mola Zamanı</>
                ) : (
                  <><BookOpen size={18} /> Odaklanma Zamanı</>
                )}
              </motion.div>
            </AnimatePresence>
            <span className="pomo-time">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="pomo-controls">
          {!isRunning ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary btn-lg pomo-btn" 
              onClick={handleStart}
            >
              <Play size={20} /> {timeLeft === currentPreset.work * 60 && !isBreak ? 'Başla' : 'Devam Et'}
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-secondary btn-lg pomo-btn" 
              onClick={handlePause}
            >
              <Pause size={20} /> Duraklat
            </motion.button>
          )}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-ghost btn-lg pomo-btn-ghost" 
            onClick={handleReset}
          >
            <RotateCcw size={20} />
          </motion.button>
        </div>

        {/* Sessions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="pomo-sessions"
        >
          <div className="pomo-session-badge">
            <BookOpen size={16} color="var(--primary-600)" />
            <span>Tamamlanan: <strong>{totalSessions}</strong> oturum</span>
          </div>
        </motion.div>

        {/* Settings Area */}
        <div className="pomo-settings-area">
          {/* Presets */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pomo-presets"
          >
            <h3 className="pomo-section-title">
              <Clock size={16} /> Hazır Süreler
            </h3>
            <div className="preset-grid">
              {presets.map((p, i) => (
                <button
                  key={i}
                  className={`preset-card card card-interactive ${selectedPreset === i && !isCustom ? 'preset-active' : ''}`}
                  onClick={() => selectPreset(i)}
                >
                  <span className="preset-label">{p.label}</span>
                  <span className="preset-desc">{p.work}dk / {p.break_}dk</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Custom */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pomo-custom card"
          >
            <h3 className="pomo-section-title">
              <Settings2 size={16} /> Özel Süre
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
                <label className="input-label">Çalışma (dk)</label>
                <input className="input" type="number" value={customWork} onChange={(e) => setCustomWork(e.target.value)} placeholder="25" />
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: '100px' }}>
                <label className="input-label">Mola (dk)</label>
                <input className="input" type="number" value={customBreak} onChange={(e) => setCustomBreak(e.target.value)} placeholder="5" />
              </div>
              <button className="btn btn-secondary" onClick={applyCustom} style={{ height: '42px', padding: '0 16px' }}>Uygula</button>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .pomo-container {
          max-width: 520px;
          margin: 0 auto;
          text-align: center;
          padding: 20px 0;
        }
        
        .pomo-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        
        .pomo-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .pomo-timer-wrapper {
          position: relative;
          width: 300px;
          height: 300px;
          margin: 0 auto 40px;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.05));
        }

        .pomo-circle {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .pomo-track {
          fill: none;
          stroke: var(--gray-100);
          stroke-width: 6;
        }

        .pomo-progress {
          fill: none;
          stroke-width: 12;
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
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pomo-time {
          font-size: 4rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          letter-spacing: -2px;
          color: var(--text-primary);
          line-height: 1;
        }

        .pomo-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .pomo-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 32px;
          border-radius: var(--radius-full);
          font-size: 1.125rem;
          height: 56px;
        }
        
        .pomo-btn-ghost {
          width: 56px;
          height: 56px;
          padding: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-100);
          color: var(--text-secondary);
        }
        
        .pomo-btn-ghost:hover {
          background: var(--gray-200);
          color: var(--text-primary);
        }

        .pomo-sessions {
          margin-bottom: 40px;
          display: flex;
          justify-content: center;
        }
        
        .pomo-session-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--primary-50);
          color: var(--primary-700);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          border: 1px solid var(--primary-100);
        }
        
        .pomo-settings-area {
          background: var(--gray-50);
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
        }

        .pomo-section-title {
          font-size: 0.9375rem;
          font-weight: 700;
          margin-bottom: 16px;
          text-align: left;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pomo-presets {
          margin-bottom: 24px;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .preset-card {
          padding: 16px 12px;
          text-align: center;
          cursor: pointer;
          border: 2px solid transparent;
        }

        .preset-active {
          border-color: var(--primary-400);
          background: var(--primary-50);
          box-shadow: var(--shadow-md);
        }
        
        .preset-active .preset-label {
          color: var(--primary-700);
        }

        .preset-label {
          font-size: 1.125rem;
          font-weight: 800;
          display: block;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .preset-desc {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .pomo-custom {
          padding: 20px;
          text-align: left;
        }

        @media (max-width: 480px) {
          .pomo-timer-wrapper {
            width: 250px;
            height: 250px;
          }
          
          .pomo-time {
            font-size: 3.5rem;
          }
          
          .preset-grid {
            gap: 8px;
          }
          
          .preset-card {
            padding: 12px 8px;
          }
          
          .pomo-settings-area {
            padding: 16px;
          }
        }
      `}</style>
    </motion.div>
  );
}
