'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Layout } from '@/components/layout'
import SpatialCanvas from '@/components/SpatialCanvas'
import { Spinner } from '@/components/ui/spinner'
import 'tldraw/tldraw.css'

export default function CanvasPage() {
  const params = useParams()
  const channelSlug = params.channelSlug as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [blocks, setBlocks] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channelInfo, setChannelInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get channel info from existing API
        const response = await fetch(`/api/channel-info?slug=${channelSlug}`)
        if (!response.ok) throw new Error('Channel not found')
        const info = await response.json()
        // Ensure we have the slug in the channel info
        setChannelInfo({ ...info, slug: info.channelSlug || channelSlug })

        // For now, we'll create a simple API call to get blocks
        // We can reuse logic from existing APIs
        const blocksResponse = await fetch(`/api/canvas-blocks?slug=${channelSlug}`)
        if (!blocksResponse.ok) throw new Error('Failed to load blocks')
        const blocksData = await blocksResponse.json()
        
        setBlocks(blocksData.blocks || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load channel')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [channelSlug])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size={32} />
            <p className="text-muted-foreground mt-4">Loading canvas...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!channelInfo) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No channel information available</p>
          </div>
        </div>
      </Layout>
    )
  }

  return <SpatialCanvas blocks={blocks} channelInfo={channelInfo} />
}