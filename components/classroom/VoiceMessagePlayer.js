'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

const SPEEDS = [1, 1.5, 2];

const formatTime = (value, roundUp = false) => {
  const seconds = Number.isFinite(value) && value > 0 ? (roundUp ? Math.ceil(value) : Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function VoiceMessagePlayer({ src, fileName = 'Ses kaydı', compact = false, onSourceError }) {
  const audioRef = useRef(null);
  const progressId = useId();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setFailed(false);
    audio.load();
  }, [src]);

  const syncDuration = (audio) => {
    const seekableDuration = audio.seekable?.length ? audio.seekable.end(audio.seekable.length - 1) : 0;
    const nextDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : seekableDuration;
    if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
  };

  const recoverLegacyWebmDuration = (audio) => {
    syncDuration(audio);
    if (audio.duration !== Infinity) return;
    const restoreTime = audio.currentTime || 0;
    audio.currentTime = Number.MAX_SAFE_INTEGER;
    const recover = () => {
      audio.removeEventListener('timeupdate', recover);
      syncDuration(audio);
      audio.currentTime = restoreTime;
    };
    audio.addEventListener('timeupdate', recover, { once: true });
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setFailed(true);
      onSourceError?.();
    }
  };

  const changeProgress = (event) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(event.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const retry = () => {
    setFailed(false);
    onSourceError?.();
    audioRef.current?.load();
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`voice-player${compact ? ' is-compact' : ''}${failed ? ' has-error' : ''}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => recoverLegacyWebmDuration(event.currentTarget)}
        onDurationChange={(event) => syncDuration(event.currentTarget)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onError={() => { setFailed(true); setPlaying(false); onSourceError?.(); }}
      />
      <button type="button" className="voice-play" onClick={failed ? retry : togglePlayback} aria-label={failed ? 'Ses kaydını yeniden yükle' : playing ? 'Ses kaydını duraklat' : 'Ses kaydını oynat'}>
        {failed ? <RotateCcw size={17} /> : playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <div className="voice-track">
        <div className="voice-wave" aria-hidden="true">
          {Array.from({ length: compact ? 18 : 28 }, (_, index) => <i key={index} className={index / (compact ? 18 : 28) * 100 <= progress ? 'is-played' : ''} />)}
        </div>
        <label htmlFor={progressId} className="sr-only">Ses kaydı ilerleme çubuğu</label>
        <input id={progressId} type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={changeProgress} disabled={!duration || failed} />
        <span className="voice-time">{failed ? 'Ses açılamadı' : `${formatTime(currentTime)} / ${formatTime(duration, true)}`}</span>
      </div>
      {!compact && <button type="button" className="voice-speed" onClick={cycleSpeed} aria-label={`Oynatma hızı ${speed}x`}>{speed}×</button>}
      {!compact && <button type="button" className="voice-volume" onClick={() => { const next = !muted; setMuted(next); if (audioRef.current) audioRef.current.muted = next; }} aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>}
      {!compact && src && <a className="voice-download" href={src} download={fileName} aria-label="Ses kaydını indir"><Download size={16} /></a>}
    </div>
  );
}
