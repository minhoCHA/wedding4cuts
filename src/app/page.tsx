'use client'

import { useState } from 'react'
import CaptureScreen from '@/components/CaptureScreen'
import ResultScreen from '@/components/ResultScreen'

type AppState = 'capture' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('capture')
  const [clips, setClips] = useState<Blob[]>([])

  function handleCaptureComplete(blobs: Blob[]) {
    setClips(blobs)
    setAppState('result')
  }

  function handleRetake() {
    setClips([])
    setAppState('capture')
  }

  return (
    <main className="min-h-screen bg-black">
      {appState === 'capture' && (
        <CaptureScreen onComplete={handleCaptureComplete} />
      )}
      {appState === 'result' && (
        <ResultScreen clips={clips} onRetake={handleRetake} />
      )}
    </main>
  )
}
