import { supabase } from '@/lib/supabase'
import DownloadClient from './DownloadClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DownloadPage({ params }: Props) {
  const { id } = await params

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, filter')
    .eq('id', id)
    .single()

  if (error || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white text-center px-8">Session not found or has expired.</p>
      </div>
    )
  }

  const clipUrls = Array.from({ length: 4 }, (_, i) => {
    const { data } = supabase.storage
      .from('wedding-clips')
      .getPublicUrl(`${session.id}/clip_${i}.webm`)
    return data.publicUrl
  })

  return <DownloadClient clipUrls={clipUrls} filter={session.filter} />
}
