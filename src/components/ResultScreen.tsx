'use client'

import { useRef, useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

interface Props {
  clips: Blob[]
  onRetake: () => void
}

const FILTERS = [
  { name: 'Normal',  value: 'none' },
  { name: 'B&W',     value: 'grayscale(1)' },
  { name: 'Sepia',   value: 'sepia(0.85)' },
  { name: 'Vintage', value: 'sepia(0.4) contrast(1.15) brightness(0.92) saturate(1.1)' },
  { name: 'Bright',  value: 'brightness(1.25) contrast(1.1) saturate(1.2)' },
]

// Capture the current video frame onto an off-screen canvas cell
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  dx: number, dy: number,
  dw: number, dh: number,
) {
  const vw = video.videoWidth || dw
  const vh = video.videoHeight || dh
  // cover-fit: crop to fill cell while preserving aspect
  const scale = Math.max(dw / vw, dh / vh)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (vw - sw) / 2
  const sy = (vh - sh) / 2
  ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function ResultScreen({ clips, onRetake }: Props) {
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const videoRef2 = useRef<HTMLVideoElement>(null)
  const videoRef3 = useRef<HTMLVideoElement>(null)
  const videoRefs = [videoRef0, videoRef1, videoRef2, videoRef3]

  const clipUrls = useMemo(() => clips.map(b => URL.createObjectURL(b)), [clips])

  const [filterIdx, setFilterIdx] = useState(0)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const activeFilter = FILTERS[filterIdx].value
  const cssFilter = activeFilter === 'none' ? undefined : activeFilter

  async function buildCompositeCanvas(): Promise<HTMLCanvasElement> {
    const COLS = 2, ROWS = 2
    const CELL_W = 600, CELL_H = 450
    const GAP = 4
    const FOOTER_H = 60

    const canvas = document.createElement('canvas')
    canvas.width  = CELL_W * COLS + GAP * (COLS + 1)
    canvas.height = CELL_H * ROWS + GAP * (ROWS + 1) + FOOTER_H
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (cssFilter) ctx.filter = cssFilter

    const positions = [
      { x: GAP,             y: GAP },
      { x: CELL_W + GAP*2,  y: GAP },
      { x: GAP,             y: CELL_H + GAP*2 },
      { x: CELL_W + GAP*2,  y: CELL_H + GAP*2 },
    ]

    for (let i = 0; i < 4; i++) {
      const vid = videoRefs[i].current
      if (vid) drawVideoFrame(ctx, vid, positions[i].x, positions[i].y, CELL_W, CELL_H)
    }

    ctx.filter = 'none'
    const frame = await loadImage('/frame.svg')
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)

    return canvas
  }

  async function handlePrint() {
    const canvas = await buildCompositeCanvas()
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    const win = window.open('', '_blank')!
    win.document.write(`
      <!doctype html><html><head><style>
        @page { margin: 0; size: auto; }
        body  { margin: 0; background: #000; }
        img   { display: block; width: 100%; height: auto; }
        @media print { body { margin: 0; } }
      </style></head>
      <body><img src="${dataUrl}" /></body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  async function handleQR() {
    setUploading(true)
    try {
      const id = crypto.randomUUID()
      await Promise.all(
        clips.map((blob, i) =>
          supabase.storage
            .from('wedding-clips')
            .upload(`${id}/clip_${i}.webm`, blob, { contentType: 'video/webm' })
        )
      )
      const { error } = await supabase
        .from('sessions')
        .insert({ id, filter: FILTERS[filterIdx].name })
      if (error) throw error
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      setQrUrl(`${origin}/download/${id}`)
    } catch (err) {
      console.error(err)
      alert('Upload failed — check Supabase config in .env.local')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-5 p-4">

      {/* 2×2 video grid + frame overlay */}
      <div className="relative w-full max-w-2xl" style={{ aspectRatio: '800/900' }}>
        <div
          className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1 bg-black"
          style={{ filter: cssFilter }}
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
              className="w-full h-full object-cover"
            />
          ))}
        </div>
        <img
          src="/frame.svg"
          alt="Wedding frame overlay"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          draggable={false}
        />
      </div>

      {/* Filter row */}
      <div className="flex gap-4">
        {FILTERS.map((f, i) => {
          const isActive = filterIdx === i
          return (
            <button
              key={f.name}
              onClick={() => setFilterIdx(i)}
              className="flex flex-col items-center gap-1.5 transition-transform"
              style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}
            >
              <div
                className="w-12 h-12 rounded-full overflow-hidden border-2"
                style={{
                  borderColor: isActive ? '#e2b96e' : 'transparent',
                  background: 'linear-gradient(135deg, #c9a050 0%, #6b4f12 100%)',
                  filter: f.value === 'none' ? undefined : f.value,
                  opacity: isActive ? 1 : 0.55,
                }}
              />
              <span className="text-white text-xs font-medium">{f.name}</span>
            </button>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-md">
        <button
          onClick={onRetake}
          className="flex-1 py-3 rounded-xl bg-zinc-700 text-white font-semibold hover:bg-zinc-600 active:scale-95 transition"
        >
          ↩ Retake
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 active:scale-95 transition"
        >
          🖨️ Print
        </button>
        <button
          onClick={handleQR}
          disabled={uploading}
          className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : '📲 QR Code'}
        </button>
      </div>

      {/* QR modal */}
      {qrUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setQrUrl(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-zinc-900">Scan to Download</h2>
            <QRCodeSVG value={qrUrl} size={220} includeMargin />
            <p className="text-xs text-zinc-400 text-center break-all">{qrUrl}</p>
            <button
              onClick={() => setQrUrl(null)}
              className="mt-1 px-6 py-2 rounded-lg bg-zinc-900 text-white text-sm hover:bg-zinc-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
