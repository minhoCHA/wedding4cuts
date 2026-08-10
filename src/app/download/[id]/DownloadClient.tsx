'use client'

import { useRef, useState, useMemo } from 'react'

interface Props {
  clipUrls: string[]
  filter: string
}

const FILTER_MAP: Record<string, string> = {
  Normal:  'none',
  'B&W':   'grayscale(1)',
  Sepia:   'sepia(0.85)',
  Vintage: 'sepia(0.4) contrast(1.15) brightness(0.92) saturate(1.1)',
  Bright:  'brightness(1.25) contrast(1.1) saturate(1.2)',
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const vw = video.videoWidth || dw
  const vh = video.videoHeight || dh
  const scale = Math.max(dw / vw, dh / vh)
  const sw = dw / scale, sh = dh / scale
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, dx, dy, dw, dh)
}

export default function DownloadClient({ clipUrls, filter }: Props) {
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const videoRef3 = useRef<HTMLVideoElement>(null)
  const videoRefs = useMemo(() => [videoRef0, videoRef1, videoRef2, videoRef3], [])

  const cssFilter = FILTER_MAP[filter] ?? 'none'
  const activeFilter = cssFilter === 'none' ? undefined : cssFilter

  const [downloadingPhoto, setDownloadingPhoto] = useState(false)
  const [downloadingVideo, setDownloadingVideo] = useState(false)

  const CELL_W = 600, CELL_H = 450, GAP = 4, FOOTER_H = 60
  const CANVAS_W = CELL_W * 2 + GAP * 3
  const CANVAS_H = CELL_H * 2 + GAP * 3 + FOOTER_H

  const positions = [
    { x: GAP,            y: GAP },
    { x: CELL_W + GAP*2, y: GAP },
    { x: GAP,            y: CELL_H + GAP*2 },
    { x: CELL_W + GAP*2, y: CELL_H + GAP*2 },
  ]

  async function buildCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    if (activeFilter) ctx.filter = activeFilter
    for (let i = 0; i < 4; i++) {
      const vid = videoRefs[i].current
      if (vid) drawCover(ctx, vid, positions[i].x, positions[i].y, CELL_W, CELL_H)
    }
    ctx.filter = 'none'
    const frame = await loadImage('/frame.svg')
    ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
    return canvas
  }

  async function handleDownloadPhoto() {
    setDownloadingPhoto(true)
    try {
      const canvas = await buildCanvas()
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/jpeg', 0.95)
      a.download = 'wedding-4cut.jpg'
      a.click()
    } finally {
      setDownloadingPhoto(false)
    }
  }

  async function handleDownloadVideo() {
    setDownloadingVideo(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      const ctx = canvas.getContext('2d')!

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      const frame = await loadImage('/frame.svg')

      let rafId: number
      function renderFrame() {
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        if (activeFilter) ctx.filter = activeFilter
        for (let i = 0; i < 4; i++) {
          const vid = videoRefs[i].current
          if (vid) drawCover(ctx, vid, positions[i].x, positions[i].y, CELL_W, CELL_H)
        }
        ctx.filter = 'none'
        ctx.drawImage(frame, 0, 0, CANVAS_W, CANVAS_H)
        rafId = requestAnimationFrame(renderFrame)
      }
      rafId = requestAnimationFrame(renderFrame)
      recorder.start()

      await new Promise<void>(resolve => {
        setTimeout(() => {
          recorder.stop()
          cancelAnimationFrame(rafId)
          resolve()
        }, 3000)
      })

      await new Promise<void>(resolve => { recorder.onstop = () => resolve() })
      const blob = new Blob(chunks, { type: mimeType })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'wedding-4cut.webm'
      a.click()
    } finally {
      setDownloadingVideo(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-white text-lg font-semibold tracking-wide">
        Minho &amp; Claire · Oct 17, 2026
      </h1>

      {/* Video grid + frame */}
      <div className="relative w-full max-w-xl" style={{ aspectRatio: '800/900' }}>
        <div
          className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1 bg-black"
          style={{ filter: activeFilter }}
        >
          {clipUrls.map((url, i) => (
            <video
              key={url}
              ref={videoRefs[i]}
              src={url}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              className="w-full h-full object-cover"
            />
          ))}
        </div>
        <img
          src="/frame.svg"
          alt="Wedding frame"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
        />
      </div>

      {/* Download buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleDownloadPhoto}
          disabled={downloadingPhoto}
          className="py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 active:scale-95 transition disabled:opacity-50"
        >
          {downloadingPhoto ? 'Saving…' : '🖼️ Download Photo (JPG)'}
        </button>
        <button
          onClick={handleDownloadVideo}
          disabled={downloadingVideo}
          className="py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50"
        >
          {downloadingVideo ? 'Recording…' : '🎬 Download Video (WebM)'}
        </button>
      </div>
    </div>
  )
}
