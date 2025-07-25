'use client'

import { useState, useEffect } from 'react'
import { Tldraw, toRichText } from 'tldraw'
import 'tldraw/tldraw.css'
import { Button } from '@/components/ui/button'
import { AutoTextarea } from '@/components/ui/auto-textarea'
import { MessageSquare, X, Grid3X3, Brain, Shuffle } from 'lucide-react'
import { useTheme } from 'next-themes'

// Types based on actual database schema
interface Block {
  id: number
  arena_id: number
  channel_id: number
  title: string | null
  description: string | null
  content: string | null
  url: string | null
  block_type: 'Image' | 'Link' | 'Video' | 'Attachment' | 'Text'
  created_at: string
  updated_at: string
  thumbnail_url?: string | null // Added thumbnail URL from API
}

interface Channel {
  id: number
  arena_id: number
  title: string
  slug: string
  username: string | null
  thumbnail_url: string | null
}

interface SpatialCanvasProps {
  blocks: Block[]
  channelInfo: Channel
}

type ViewMode = 'grid' | 'similarity' | 'random'

export default function SpatialCanvas({ blocks, channelInfo }: SpatialCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editor, setEditor] = useState<any>(null)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
  }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isArranging, setIsArranging] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clusters, setClusters] = useState<any[]>([])
  const [visibleBlockCount, setVisibleBlockCount] = useState(0)
  const { resolvedTheme } = useTheme()

  // Layout calculation functions
  const calculateGridLayout = (blocks: Block[]) => {
    const padding = 150
    const spacing = 20
    const baseSize = 80
    const cols = Math.ceil(Math.sqrt(blocks.length))
    
    return blocks.map((block, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x: padding + col * (baseSize + spacing),
        y: padding + row * (baseSize + spacing),
        props: {
          geo: typeConfig.geo,
          w: typeConfig.w,
          h: typeConfig.h,
          color: typeConfig.color,
          fill: 'none',
        }
      }
    })
  }

  const calculateRandomLayout = (blocks: Block[]) => {
    const viewportWidth = 2000
    const viewportHeight = 1500
    const baseSize = 80
    
    // Add randomness that changes each time
    const randomSeed = Date.now()
    
    return blocks.map((block) => {
      // Use combination of block ID and current time for true randomness
      const seed = block.id + randomSeed
      const random1 = ((seed * 9301 + 49297) % 233280) / 233280
      const random2 = ((seed * 49297 + 233280) % 9301) / 9301
      
      // Scatter blocks across the viewport
      const x = 200 + random1 * (viewportWidth - 400)
      const y = 200 + random2 * (viewportHeight - 400)
      
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x: x,
        y: y,
        props: {
          geo: typeConfig.geo,
          w: typeConfig.w,
          h: typeConfig.h,
          color: typeConfig.color,
          fill: 'none',
        }
      }
    })
  }

  const getBlockTypeConfig = (block: Block, baseSize: number) => {
    const sizeVariation = 0.8 + (block.id % 5) * 0.1
    const size = baseSize * sizeVariation
    
    const imageAspectRatios = [
      { w: 1, h: 1 },
      { w: 1.5, h: 1 },
      { w: 1, h: 1.5 },
      { w: 1.33, h: 1 },
      { w: 1, h: 1.33 },
    ]
    
    const getImageDimensions = (blockId: number) => {
      const ratio = imageAspectRatios[blockId % imageAspectRatios.length]
      return {
        w: size * ratio.w,
        h: size * ratio.h
      }
    }
    
    const imageDims = block.block_type === 'Image' ? getImageDimensions(block.id) : null
    
    const typeConfig = {
      'Image': { 
        color: 'grey', 
        geo: 'rectangle', 
        w: imageDims?.w || size, 
        h: imageDims?.h || size 
      },
      'Link': { color: 'blue', geo: 'rectangle', w: size * 1.2, h: size * 0.8 }, 
      'Video': { color: 'red', geo: 'rectangle', w: size * 1.2, h: size * 0.8 },
      'Attachment': { color: 'green', geo: 'rectangle', w: size, h: size },
      'Text': { color: 'grey', geo: 'rectangle', w: size * 1.2, h: size * 0.8 }
    }

    return typeConfig[block.block_type] || { color: 'black', geo: 'rectangle', w: size, h: size }
  }

  // Apply layout based on view mode
  const applyLayout = () => {
    if (!editor || !blocks.length) return

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    let shapes
    if (viewMode === 'grid') {
      shapes = calculateGridLayout(blocks)
    } else if (viewMode === 'random') {
      shapes = calculateRandomLayout(blocks)
    } else {
      // Similarity view will be handled by handleAutoArrange
      return
    }

    editor.createShapes(shapes)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 200 })
    }, 100)
  }

  // Add blocks when editor is ready or view mode changes
  useEffect(() => {
    if (!editor || !blocks.length) return
    
    if (viewMode === 'similarity' && clusters.length > 0) {
      // Re-apply similarity layout if we have clusters
      applySimilarityLayout()
    } else if (viewMode !== 'similarity') {
      applyLayout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, blocks, viewMode])

  // Handle selection changes
  useEffect(() => {
    if (!editor) return

    const handleSelectionChange = () => {
      const selectedShapeIds = editor.getSelectedShapeIds()
      if (selectedShapeIds.length > 0) {
        // Find the first block shape (not text shape)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockShapeId = Array.from(selectedShapeIds).find((id: any) => id.startsWith('shape:block-'))
        if (blockShapeId) {
          // Extract block ID from shape:block-123 format
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const blockId = parseInt((blockShapeId as any).replace('shape:block-', ''))
          const block = blocks.find(b => b.id === blockId)
          setSelectedBlock(block || null)
        } else {
          setSelectedBlock(null)
        }
      } else {
        setSelectedBlock(null)
      }
    }

    // Subscribe to selection changes
    const unsubscribe = editor.store.listen(handleSelectionChange, { source: 'user' })
    
    return () => {
      unsubscribe()
    }
  }, [editor, blocks])

  // Apply similarity layout with specific clusters data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySimilarityLayoutWithData = (clustersData: any[]) => {
    if (!editor || !blocks.length || !clustersData.length) return

    const clusterWidth = 300
    const clusterHeight = 300
    const clusterPadding = 100
    const blockSpacing = 20
    
    const numClusters = clustersData.length
    const cols = Math.ceil(Math.sqrt(numClusters))
    
    const clusterPositions: Record<number, { x: number; y: number }> = {}
    clustersData.forEach((cluster, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      clusterPositions[cluster.id] = {
        x: col * (clusterWidth + clusterPadding) + 200,
        y: row * (clusterHeight + clusterPadding) + 200,
      }
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapes: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelShapes: any[] = []
    
    // Group blocks by cluster
    const blocksByCluster: Record<number, typeof blocks> = {}
    clustersData.forEach(cluster => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cluster.blockIds.forEach((blockId: any) => {
        const block = blocks.find(b => b.id === blockId)
        if (block) {
          if (!blocksByCluster[cluster.id]) {
            blocksByCluster[cluster.id] = []
          }
          blocksByCluster[cluster.id].push(block)
        }
      })
    })
    
    // Position blocks and create labels
    Object.entries(blocksByCluster).forEach(([clusterId, clusterBlocks]) => {
      const cluster = clustersData.find(c => c.id === parseInt(clusterId))
      const clusterPos = clusterPositions[parseInt(clusterId)]
      
      const blocksPerClusterRow = Math.ceil(Math.sqrt(clusterBlocks.length))
      
      clusterBlocks.forEach((block, index) => {
        const col = index % blocksPerClusterRow
        const row = Math.floor(index / blocksPerClusterRow)
        
        const typeConfig = getBlockTypeConfig(block, 80)
        
        shapes.push({
          id: `shape:block-${block.id}`,
          type: 'geo',
          x: clusterPos.x + col * (typeConfig.w + blockSpacing),
          y: clusterPos.y + row * (typeConfig.h + blockSpacing) + 30, // Leave space for label
          props: {
            geo: typeConfig.geo,
            w: typeConfig.w,
            h: typeConfig.h,
            color: typeConfig.color,
            fill: 'none',
          }
        })
      })
      
      // Add cluster label
      if (cluster) {
        labelShapes.push({
          id: `shape:cluster-label-${cluster.id}`,
          type: 'text',
          x: clusterPos.x,
          y: clusterPos.y,
          props: {
            richText: toRichText(`${cluster.label} (${cluster.blockCount})`),
            color: 'black',
            size: 'm',
            font: 'sans',
            textAlign: 'start',
            w: clusterWidth,
            autoSize: true,
            scale: 1
          }
        })
      }
    })
    
    // Clear and recreate all shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }
    
    editor.createShapes([...shapes, ...labelShapes])
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 200 })
    }, 100)
  }

  // Apply similarity layout
  const applySimilarityLayout = () => {
    if (!editor || !blocks.length || !clusters.length) return
    applySimilarityLayoutWithData(clusters)
  }

  // Handle view mode changes
  const handleViewModeChange = async (mode: ViewMode) => {
    // If clicking the same mode as current (only applies to random), regenerate
    if (mode === 'random' && viewMode === 'random') {
      applyLayout() // This will generate new random positions
      return
    }
    
    setViewMode(mode)
    
    // If switching to similarity and we don't have clusters yet, fetch them
    if (mode === 'similarity' && clusters.length === 0) {
      setIsArranging(true)
      
      try {
        // Use Supabase Edge Function for better performance
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase environment variables not configured')
        }
        
        const functionUrl = `${supabaseUrl}/functions/v1/analyze-clusters`
        console.log('Calling Edge Function:', functionUrl)
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            channelSlug: (channelInfo as any).channelSlug || channelInfo.slug,
          }),
        })
        
        if (!response.ok) throw new Error('Failed to calculate similarities')
        
        const data = await response.json()
        const fetchedClusters = data.clusters || []
        setClusters(fetchedClusters)
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('Clusters:', fetchedClusters.map((c: any) => `${c.label} (${c.blockCount} blocks)`))
        
        // Apply similarity layout immediately with the fetched data
        if (fetchedClusters.length > 0) {
          applySimilarityLayoutWithData(fetchedClusters)
        }
      } catch (error) {
        console.error('Similarity error:', error)
        setViewMode('grid') // Fallback to grid on error
      } finally {
        setIsArranging(false)
      }
    }
  }

  // Track shape positions for image overlays
  const [shapePositions, setShapePositions] = useState<Record<string, {x: number, y: number, w: number, h: number}>>({})
  // Track broken images
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())

  // Update tldraw theme when system theme changes
  useEffect(() => {
    if (editor && resolvedTheme) {
      editor.user.updateUserPreferences({ 
        colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light' 
      })
    }
  }, [editor, resolvedTheme])

  // Update shape positions periodically with throttling
  useEffect(() => {
    if (!editor) return
    
    let lastUpdateTime = 0
    const updateThrottle = 16 // ~60fps
    
    const updatePositions = () => {
      const now = Date.now()
      if (now - lastUpdateTime < updateThrottle) return
      
      lastUpdateTime = now
      const positions: Record<string, {x: number, y: number, w: number, h: number}> = {}
      blocks.forEach(block => {
        const shape = editor.getShape(`shape:block-${block.id}`)
        if (shape) {
          const bounds = editor.getShapePageBounds(shape)
          if (bounds) {
            positions[block.id] = { 
              x: bounds.x, 
              y: bounds.y,
              w: bounds.w,
              h: bounds.h
            }
          }
        }
      })
      setShapePositions(positions)
    }

    // Update initially and on changes
    updatePositions()
    
    // Listen to store changes and camera changes
    const unsubscribeStore = editor.store.listen(updatePositions)
    const unsubscribeCamera = editor.on('change', updatePositions)
    
    // Also update on animation frame for smooth tracking
    let animationFrame: number
    const animate = () => {
      updatePositions()
      animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
    
    return () => {
      unsubscribeStore()
      unsubscribeCamera()
      cancelAnimationFrame(animationFrame)
    }
  }, [editor, blocks])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        forceMobile={false}
        onMount={(editor) => {
          setEditor(editor)
          // Force theme update after mount
          if (resolvedTheme) {
            editor.user.updateUserPreferences({ 
              colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light' 
            })
          }
        }}
      />
      {/* Channel info overlay */}
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-background/95 backdrop-blur border rounded-lg px-4 py-2">
          <h2 className="font-semibold">{channelInfo?.title || 'Channel'}</h2>
          <p className="text-sm text-muted-foreground">
            {blocks.length} blocks loaded
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Rendering {visibleBlockCount} of {blocks.length} blocks
          </p>
          <p className="text-xs text-muted-foreground">
            Drag blocks to arrange • Click to select
          </p>
        </div>
      </div>
      
      {/* Selected block info - moved to right side to avoid chat button */}
      {selectedBlock && (
        <div className="absolute bottom-4 right-4 z-50 max-w-md">
          <div className="bg-background/95 backdrop-blur border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2">
              {selectedBlock.title || 'Untitled'}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Type: {selectedBlock.block_type}
            </p>
            {selectedBlock.description && (
              <p className="text-xs mb-2 line-clamp-3">
                {selectedBlock.description}
              </p>
            )}
            {selectedBlock.url && (
              <a 
                href={selectedBlock.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Open original →
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Block Image Overlays - with viewport culling */}
      {editor && (() => {
        let visibleCount = 0
        
        const renderedBlocks = blocks.map((block) => {
          const pos = shapePositions[block.id]
          if (!pos) return null
          
          // Get the viewport bounds for culling
          const viewportBounds = editor.getViewportScreenBounds()
          
          // Convert page coordinates to screen coordinates
          const screenPoint = editor.pageToScreen({ x: pos.x, y: pos.y })
          const screenX = screenPoint.x
          const screenY = screenPoint.y
          
          // Scale width and height by zoom
          const camera = editor.getCamera()
          const screenW = pos.w * camera.z
          const screenH = pos.h * camera.z

          // Viewport culling - check if block is visible
          const padding = 50 // Small padding to render blocks just outside viewport
          const isVisible = (
            screenX + screenW > -padding &&
            screenX < viewportBounds.width + padding &&
            screenY + screenH > -padding &&
            screenY < viewportBounds.height + padding
          )

          // Skip rendering if not visible
          if (!isVisible) return null
          
          visibleCount++

          // Show thumbnails for any block type that has them
          const hasThumbnail = block.thumbnail_url && block.thumbnail_url.trim() !== ''
          const hasImage = block.block_type === 'Image' && (block.thumbnail_url || block.url)
          
          // Use thumbnail URL if available, otherwise use URL for Image blocks
          const imageUrl = hasThumbnail ? block.thumbnail_url : (hasImage ? block.url : null)

          return (
            <div
              key={block.id}
              className="absolute pointer-events-none overflow-hidden"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
                zIndex: 10,
                borderRadius: '8px', // Match tldraw's default shape radius
              }}
            >
              {imageUrl && !brokenImages.has(imageUrl) ? (
                <div className="w-full h-full bg-gray-50 dark:bg-gray-900/50 p-1 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={imageUrl}
                    alt={block.title || ''}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                    loading="lazy"
                    onError={() => {
                      console.error('Image load error:', imageUrl)
                      setBrokenImages(prev => new Set([...prev, imageUrl]))
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-white/90 dark:bg-gray-800/90 border-2 border-gray-300 dark:border-gray-600 p-2 flex flex-col items-center justify-center">
                  <p className="text-xs text-center line-clamp-2 font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {block.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {block.block_type}
                  </p>
                </div>
              )}
              {/* Title overlay for blocks with thumbnails */}
              {imageUrl && !brokenImages.has(imageUrl) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-1">
                  <p className="text-xs truncate">{block.title || block.block_type}</p>
                </div>
              )}
            </div>
          )
        })
        
        // Update visible count if it changed
        if (visibleCount !== visibleBlockCount) {
          setTimeout(() => setVisibleBlockCount(visibleCount), 0)
        }
        
        return renderedBlocks
      })()}

      {/* View Mode Toggle - positioned top-center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex bg-background/95 backdrop-blur border rounded-lg p-1">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('grid')}
          disabled={blocks.length === 0}
          className="rounded-r-none"
        >
          <Grid3X3 className="h-4 w-4 mr-1" />
          Grid
        </Button>
        <Button
          variant={viewMode === 'similarity' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('similarity')}
          disabled={blocks.length === 0 || isArranging}
          className="rounded-none border-x"
        >
          <Brain className="h-4 w-4 mr-1" />
          {isArranging ? 'Loading...' : 'Similarity'}
        </Button>
        <Button
          variant={viewMode === 'random' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('random')}
          disabled={blocks.length === 0}
          className="rounded-l-none"
          title={viewMode === 'random' ? 'Click again for new pattern' : 'Random layout'}
        >
          <Shuffle className="h-4 w-4 mr-1" />
          Random
        </Button>
      </div>

      {/* Chat Toggle Button - positioned middle-right to avoid UI overlaps */}
      <Button
        className="absolute top-1/2 -translate-y-1/2 right-4 z-50"
        size="icon"
        onClick={() => setShowChat(!showChat)}
        title="Open chat"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>

      {/* Chat Panel */}
      {showChat && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-background border-l z-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Chat with Canvas</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowChat(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  Ask about the blocks on this canvas
                </p>
                {selectedBlock && (
                  <p className="text-xs text-muted-foreground">
                    Selected: &quot;{selectedBlock.title || 'Untitled'}&quot;
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!chatInput.trim() || isLoading) return

              const userMessage = {
                id: Date.now().toString(),
                role: 'user' as const,
                content: chatInput.trim()
              }

              setMessages(prev => [...prev, userMessage])
              setChatInput('')
              setIsLoading(true)

              try {
                // Generate a session ID if we don't have one
                const sessionId = localStorage.getItem('spatial-chat-session') || 
                  `spatial-${Date.now()}-${Math.random().toString(36).substring(2)}`
                localStorage.setItem('spatial-chat-session', sessionId)

                // Add spatial context to the message
                let spatialContext = ''
                if (selectedBlock) {
                  spatialContext = `\n\n[Context: Currently looking at block "${selectedBlock.title || 'Untitled'}" (${selectedBlock.block_type})]`
                }
                
                // Count visible blocks (rough estimate based on viewport)
                const visibleBlockCount = Object.keys(shapePositions).length
                if (visibleBlockCount > 0) {
                  spatialContext += `\n[${visibleBlockCount} blocks visible on canvas]`
                }

                const contextualUserMessage = {
                  ...userMessage,
                  content: userMessage.content + spatialContext
                }

                // Build message history - need to ensure proper format
                const messageHistory = messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                }))
                
                // Debug logging
                const requestBody = {
                  messages: [...messageHistory, contextualUserMessage],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  channelSlug: (channelInfo as any).channelSlug || channelInfo.slug, // Handle both formats
                  sessionId: sessionId,
                }
                console.log('Chat request:', requestBody)
                console.log('Channel info:', channelInfo)

                // For prototype, we'll just integrate with the existing chat API
                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestBody),
                })

                if (!response.ok) {
                  let errorMessage = 'Chat failed'
                  try {
                    // Try to get the error message from the response
                    const errorText = await response.text()
                    console.error('Chat API error:', errorText)
                    console.error('Response status:', response.status)
                    errorMessage = errorText || `Chat failed: ${response.statusText}`
                  } catch {
                    // If we can't parse the error, use status text
                    errorMessage = `Chat failed: ${response.statusText}`
                  }
                  throw new Error(errorMessage)
                }

                const reader = response.body?.getReader()
                if (!reader) throw new Error('No response body')

                const decoder = new TextDecoder()
                let assistantContent = ''
                const assistantMessage = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant' as const,
                  content: ''
                }

                setMessages(prev => [...prev, assistantMessage])

                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break

                  const chunk = decoder.decode(value)
                  const lines = chunk.split('\n')

                  for (const line of lines) {
                    if (line.trim()) {
                      try {
                        const data = JSON.parse(line)
                        if (data.type === 'text') {
                          assistantContent += data.content
                          setMessages(prev => 
                            prev.map(msg => 
                              msg.id === assistantMessage.id 
                                ? { ...msg, content: assistantContent }
                                : msg
                            )
                          )
                        } else if (data.type === 'images' && data.content) {
                          // Handle image context from the chat API
                          // For now, we'll just append a note about the images
                          const imageCount = data.content.length
                          if (imageCount > 0) {
                            assistantContent += `\n\n[Referenced ${imageCount} block${imageCount > 1 ? 's' : ''} with thumbnails]`
                            setMessages(prev => 
                              prev.map(msg => 
                                msg.id === assistantMessage.id 
                                  ? { ...msg, content: assistantContent }
                                  : msg
                              )
                            )
                          }
                        }
                      } catch (e) {
                        // If JSON parsing fails, it might be a plain text chunk
                        console.warn('Failed to parse streaming chunk:', e)
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Chat error:', error)
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `Sorry, I encountered an error: ${errorMessage}`
                }])
              } finally {
                setIsLoading(false)
              }
            }}>
              <AutoTextarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about these blocks..."
                className="min-h-[40px]"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.dispatchEvent(new Event('submit', { bubbles: true }))
                  }
                }}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}