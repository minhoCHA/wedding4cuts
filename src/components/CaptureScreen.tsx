'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  onComplete: (clips: Blob[]) => void
}

const CLIP_DURATION_MS = 2000
const CLIP_COUNT = 4
type TimerOption = 3 | 5 | 10

type Status = 'idle' | 'countdown' | 'recording'

export default function CaptureScreen({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [timerSeconds, setTimerSeconds] = useState<TimerOption>(3)
  const [isShooting, setIsShooting] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [clipsDone, setClipsDone] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraError(null)
    } catch {
      setCameraError('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  useEffect(() => {
    startStream(facingMode)
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [facingMode, startStream])

  function recordClip(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const stream = streamRef.current
      if (!stream) return reject(new Error('No stream'))
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      recorder.onerror = reject
      recorder.start()
      setTimeout(() => recorder.stop(), CLIP_DURATION_MS)
    })
  }

  function runCountdown(seconds: number): Promise<void> {
    return new Promise(resolve => {
      let remaining = seconds
      setCountdown(remaining)
      setStatus('countdown')
      const id = setInterval(() => {
        remaining--
        if (remaining <= 0) {
          clearInterval(id)
          setCountdown(null)
          resolve()
        } else {
          setCountdown(remaining)
        }
      }, 1000)
    })
  }

  async function handleShoot() {
    if (isShooting) return
    setIsShooting(true)
    setClipsDone(0)
    const blobs: Blob[] = []
    for (let i = 0; i < CLIP_COUNT; i++) {
      await runCountdown(timerSeconds)
      setStatus('recording')
      const blob = await recordClip()
      blobs.push(blob)
      setClipsDone(i + 1)
    }
    setIsShooting(false)
    setStatus('idle')
    onComplete(blobs)
  }

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Live camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Error state */}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80">
          <p className="text-white text-center px-8">{cameraError}</p>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <span
            key={countdown}
            className="text-white font-bold drop-shadow-2xl select-none"
            style={{ fontSize: '20vmin', animation: 'countdownPop 0.9s ease-out forwards' }}
          >
            {countdown}
          </span>
        </div>
      )}

      {/* Recording badge */}
      {status === 'recording' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur text-white px-5 py-2 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium">Recording {clipsDone + 1} / {CLIP_COUNT}</span>
        </div>
      )}

      {/* Clip progress dots */}
      {isShooting && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {Array.from({ length: CLIP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${
                i < clipsDone ? 'bg-white scale-110' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom controls — hidden during shooting */}
      {!isShooting && (
        <div className="absolute bottom-10 left-0 right-0 flex items-center justify-around px-10 z-10">
          {/* Camera switch */}
          <button
            onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
            className="w-13 h-13 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl hover:bg-white/30 active:scale-95 transition"
            aria-label="Switch camera"
          >
            🔄
          </button>

          {/* Shutter button */}
          <button
            onClick={handleShoot}
            className="w-20 h-20 rounded-full bg-white border-4 border-white/40 shadow-xl hover:scale-105 active:scale-95 transition-transform"
            aria-label="Start capture sequence"
          />

          {/* Timer selector */}
          <div className="flex gap-1.5">
            {([3, 5, 10] as TimerOption[]).map(t => (
              <button
                key={t}
                onClick={() => setTimerSeconds(t)}
                className={`w-11 h-11 rounded-full text-sm font-semibold transition ${
                  timerSeconds === t
                    ? 'bg-white text-black'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes countdownPop {
          0%   { transform: scale(1.5); opacity: 0; }
          20%  { transform: scale(1);   opacity: 1; }
          80%  { transform: scale(1);   opacity: 1; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
