'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Tldraw, toRichText } from 'tldraw'
import { Button } from '@/components/ui/button'
import { AutoTextarea } from '@/components/ui/auto-textarea'
import { MessageSquare, X, Grid3X3, Brain, Shuffle, ExternalLink, Calendar, Tag } from 'lucide-react'
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
  const [showModal, setShowModal] = useState(false)
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
  const [prevTool, setPrevTool] = useState<string>('select')
  const [isAnimating, setIsAnimating] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set())

  // Pin message to canvas function
  const pinToCanvas = (message: { id: string; content: string }) => {
    if (!editor) return
    
    // Get viewport center for initial placement
    const viewport = editor.getViewportPageBounds()
    
    // Place in viewport center
    const x = viewport.x + viewport.width / 2
    const y = viewport.y + viewport.height / 2
    
    // Create text shape
    editor.createShape({
      type: 'text',
      x,
      y,
      props: {
        richText: toRichText(message.content),
        w: 300,
        autoSize: false,
        font: 'sans',
        size: 's',
        textAlign: 'start',
        color: 'blue', // Different color for AI responses
      },
      meta: {
        type: 'ai-response',
        messageId: message.id,
        timestamp: Date.now()
      }
    })
    
    // Mark message as pinned
    setPinnedMessages(prev => new Set([...prev, message.id]))
    
    // Optional: Close chat to focus on the pinned content
    // setShowChat(false)
  }

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
        opacity: 0, // Make shape invisible
        props: {
          geo: typeConfig.geo,
          w: typeConfig.w,
          h: typeConfig.h,
          color: typeConfig.color,
          fill: 'none'
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
        opacity: 0, // Make shape invisible
        props: {
          geo: typeConfig.geo,
          w: typeConfig.w,
          h: typeConfig.h,
          color: typeConfig.color,
          fill: 'none'
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

  // Handle selection changes with click delay detection
  useEffect(() => {
    if (!editor) return

    let pointerDownTime: number | null = null
    let pointerDownShapeId: string | null = null

    const handlePointerDown = () => {
      // Check if we're pointing at a shape
      const hoveredShapeId = editor.getHoveredShapeId()
      
      if (hoveredShapeId && hoveredShapeId.startsWith('shape:block-')) {
        pointerDownTime = Date.now()
        pointerDownShapeId = hoveredShapeId
      }
    }

    const handlePointerUp = () => {
      if (!pointerDownTime || !pointerDownShapeId) return
      
      const clickDuration = Date.now() - pointerDownTime
      const currentHoveredShapeId = editor.getHoveredShapeId()
      
      // Check if this is the same shape and it was a quick click (not a drag)
      if (currentHoveredShapeId === pointerDownShapeId && clickDuration < 200) {
        // Extract block ID from shape:block-123 format
        const blockId = parseInt(pointerDownShapeId.replace('shape:block-', ''))
        const block = blocks.find(b => b.id === blockId)
        
        if (block) {
          setSelectedBlock(block)
          setShowModal(true)
          
          // Clear selection to prevent shape from staying selected
          editor.setSelectedShapes([])
        }
      }
      
      pointerDownTime = null
      pointerDownShapeId = null
    }

    // Subscribe to pointer events on the container
    const container = editor.getContainer()
    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointerup', handlePointerUp)
    }
  }, [editor, blocks, showModal])

  // Apply similarity layout with specific clusters data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applySimilarityLayoutWithData = (clustersData: any[]) => {
    if (!editor || !blocks.length || !clustersData.length) return

    setIsAnimating(true)

    // First, capture current positions of all blocks
    const currentPositions: Record<string, {x: number, y: number}> = {}
    blocks.forEach(block => {
      const shape = editor.getShape(`shape:block-${block.id}`)
      if (shape) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPositions[block.id] = { x: (shape as any).x, y: (shape as any).y }
      }
    })

    const blockSpacing = 10 // Tighter spacing for organic feel
    
    // Create a vertical scroll layout
    const centerX = 700 // Shifted left to center the cluster + label unit
    const clusterSpacing = 250 // Reduced vertical spacing between clusters for tighter layout
    const startY = 200 // Starting Y position
    
    const clusterPositions: Record<number, { x: number; y: number }> = {}
    
    // Position clusters in a vertical line - no horizontal variation
    clustersData.forEach((cluster, index) => {
      clusterPositions[cluster.id] = {
        x: centerX, // All clusters centered at same X
        y: startY + (index * clusterSpacing),
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
    
    // Track final positions for animation
    const finalPositions: Record<string, {x: number, y: number, clusterId: number, indexInCluster: number}> = {}
    
    // Calculate final positions blocks
    Object.entries(blocksByCluster).forEach(([clusterId, clusterBlocks]) => {
      const cluster = clustersData.find(c => c.id === parseInt(clusterId))
      const clusterPos = clusterPositions[parseInt(clusterId)]
      
      // Create a more organic, hexagonal packing for blocks within cluster
      const blockSize = 40 // Even smaller blocks for similarity view
      
      clusterBlocks.forEach((block, index) => {
        // Consistent hexagonal packing pattern for all clusters
        let x = 0
        let y = 0
        
        if (index === 0) {
          // Center block
          x = 0
          y = 0
        } else {
          // Calculate position in hexagonal pattern
          const ringsComplete = Math.floor((Math.sqrt(1 + 8 * index) - 1) / 2)
          const posInRing = index - (ringsComplete * (ringsComplete + 1) / 2)
          const totalInRing = ringsComplete * 6
          
          const angle = (posInRing / totalInRing) * Math.PI * 2
          const radius = ringsComplete * (blockSize + blockSpacing)
          
          x = Math.cos(angle) * radius
          y = Math.sin(angle) * radius
        }
        
        const typeConfig = getBlockTypeConfig(block, blockSize)
        
        // Store final position
        finalPositions[block.id] = {
          x: clusterPos.x + x,
          y: clusterPos.y + y,
          clusterId: parseInt(clusterId),
          indexInCluster: index
        }
        
        // Start at current position or a default position
        const startPos = currentPositions[block.id] || { x: 100, y: 100 }
        
        shapes.push({
          id: `shape:block-${block.id}`,
          type: 'geo',
          x: startPos.x, // Start at current position
          y: startPos.y,
          opacity: 0, // Make shape invisible
          props: {
            geo: typeConfig.geo,
            w: typeConfig.w,
            h: typeConfig.h,
            color: typeConfig.color,
            fill: 'none'
          }
        })
      })
      
      // Add cluster label with consistent left alignment
      if (cluster) {
        // Calculate max cluster width to position label safely beyond it
        const maxClusterRadius = Math.ceil(Math.sqrt(clusterBlocks.length)) * (blockSize + blockSpacing)
        const labelX = centerX + maxClusterRadius + 50 // Safe distance from cluster edge
        
        labelShapes.push({
          id: `shape:cluster-label-${cluster.id}`,
          type: 'text',
          x: labelX, // Positioned beyond cluster bounds
          y: clusterPos.y - 5,
          opacity: 0, // Start invisible for fade-in
          props: {
            richText: toRichText(`${cluster.label}`),
            color: 'grey', // Softer color for less prominence
            size: 's', // Small text size (smallest available)
            font: 'sans',
            textAlign: 'start',
            w: 250,
            autoSize: true,
            scale: 1
          }
        })
      }
    })
    
    // Clear and recreate all shapes at their starting positions
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }
    
    editor.createShapes([...shapes, ...labelShapes])
    
    // Animate to final positions with staggered timing
    setTimeout(() => {
      // Get cluster order for staggered animation
      const clusterOrder = clustersData.map(c => c.id)
      
      // Animate blocks to their final positions
      blocks.forEach(block => {
        const finalPos = finalPositions[block.id]
        if (!finalPos) return
        
        const shape = editor.getShape(`shape:block-${block.id}`)
        if (!shape) return
        
        // Calculate animation delay based on cluster and position within cluster
        const clusterIndex = clusterOrder.indexOf(finalPos.clusterId)
        const baseDelay = clusterIndex * 150 // 150ms between clusters
        const blockDelay = finalPos.indexInCluster * 30 // 30ms between blocks in cluster
        const totalDelay = baseDelay + blockDelay
        
        // Animate after delay with smooth transition
        setTimeout(() => {
          const startTime = Date.now()
          const duration = 1200 // Longer duration for two-phase animation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const startX = (shape as any).x
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const startY = (shape as any).y
          
          // Calculate expansion point (move away from center)
          const viewportCenter = { x: 700, y: 600 }
          const directionX = startX - viewportCenter.x
          const directionY = startY - viewportCenter.y
          const distance = Math.sqrt(directionX * directionX + directionY * directionY)
          const normalizedX = distance > 0 ? directionX / distance : 0
          const normalizedY = distance > 0 ? directionY / distance : 0
          
          // Expansion point is 20% further from center
          const expansionX = startX + normalizedX * 80
          const expansionY = startY + normalizedY * 80
          
          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            let currentX, currentY
            
            if (progress < 0.4) {
              // Phase 1: Expand outward (0-40% of animation)
              const expandProgress = progress / 0.4
              const eased = 1 - Math.pow(1 - expandProgress, 2) // Ease out quad
              
              currentX = startX + (expansionX - startX) * eased
              currentY = startY + (expansionY - startY) * eased
            } else {
              // Phase 2: Contract to final position (40-100% of animation)
              const contractProgress = (progress - 0.4) / 0.6
              const eased = 1 - Math.pow(1 - contractProgress, 3) // Ease out cubic
              
              currentX = expansionX + (finalPos.x - expansionX) * eased
              currentY = expansionY + (finalPos.y - expansionY) * eased
            }
            
            editor.updateShape({
              id: shape.id,
              type: shape.type,
              x: currentX,
              y: currentY,
            })
            
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          
          requestAnimationFrame(animate)
        }, totalDelay)
      })
      
      // Fade in cluster labels with stagger
      clustersData.forEach((cluster, index) => {
        setTimeout(() => {
          const labelShape = editor.getShape(`shape:cluster-label-${cluster.id}`)
          if (labelShape) {
            editor.updateShape({
              id: labelShape.id,
              type: labelShape.type,
              opacity: 1,
            })
          }
        }, index * 150 + 300) // Start after blocks begin moving
      })
      
      // Position camera after animation starts
      setTimeout(() => {
        const viewportBounds = editor.getViewportPageBounds()
        
        // Calculate middle position
        const middleClusterIndex = Math.floor(clustersData.length / 2)
        const middleY = startY + (middleClusterIndex * clusterSpacing)
        
        // Center on the middle cluster
        editor.setCamera({
          x: -centerX + viewportBounds.width / 2,
          y: -middleY + viewportBounds.height / 2, // Center vertically on middle cluster
          z: 1 // Full zoom for clarity
        }, { duration: 800 })
      }, 200)
      
      // Mark animation as complete
      const totalAnimationTime = clustersData.length * 150 + 1500 // Adjusted for longer animation
      setTimeout(() => {
        setIsAnimating(false)
      }, totalAnimationTime)
    }, 50) // Small delay to ensure shapes are created
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
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Edge Function error response:', errorData)
          throw new Error(errorData.error || 'Failed to calculate similarities')
        }
        
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

  // Handle modal state with tldraw
  useEffect(() => {
    if (!editor) return
    
    if (showModal) {
      // Save current state
      setPrevTool(editor.getCurrentToolId())
      
      // Set editor to readonly mode
      editor.updateInstanceState({ isReadonly: true })
      
      // Deselect all shapes
      editor.setSelectedShapes([])
      
      // Stop any ongoing interactions
      editor.cancel()
    } else {
      // Restore state
      editor.updateInstanceState({ isReadonly: false })
      
      // Restore tool
      if (prevTool) {
        editor.setCurrentTool(prevTool)
      }
    }
  }, [showModal, editor, prevTool])
  
  // Handle escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        e.preventDefault()
        e.stopPropagation()
        setShowModal(false)
      }
    }
    
    if (showModal) {
      // Use capture phase to intercept before tldraw
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [showModal])

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
    
    // Listen to store changes
    const unsubscribeStore = editor.store.listen(updatePositions)
    
    // Also update on animation frame for smooth tracking
    let animationFrame: number
    const animate = () => {
      updatePositions()
      animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)
    
    return () => {
      unsubscribeStore()
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
            Drag to arrange • Quick click to view details
          </p>
        </div>
      </div>
      
      
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
          disabled={blocks.length === 0 || isArranging || isAnimating}
          className="rounded-none border-x"
        >
          <Brain className="h-4 w-4 mr-1" />
          {isArranging ? 'Analyzing...' : isAnimating ? 'Organizing...' : 'Similarity'}
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
                      {msg.role === 'assistant' && !isLoading && (
                        <button
                          onClick={() => pinToCanvas(msg)}
                          className={`mt-2 text-xs opacity-60 hover:opacity-100 transition-opacity block ${
                            pinnedMessages.has(msg.id) ? 'opacity-100' : ''
                          }`}
                        >
                          {pinnedMessages.has(msg.id) ? '✓ Pinned' : '📌 Pin to canvas'}
                        </button>
                      )}
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

      {/* Block Detail Modal - Use portal to escape tldraw's event system */}
      {showModal && selectedBlock && typeof window !== 'undefined' && createPortal(
            <div 
              className="fixed inset-0 flex items-center justify-center"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: 'auto'
              }}
              onMouseDown={(e) => {
                // Only close if clicking directly on the backdrop
                if (e.target === e.currentTarget) {
                  setShowModal(false)
                }
              }}
            >
              {/* Modal Content */}
              <div 
                className="relative bg-background border rounded-lg shadow-lg max-w-4xl w-[90%] max-h-[90vh] overflow-hidden flex flex-col mx-4"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  type="button"
                  className="absolute right-2 top-2 z-10 p-2 rounded-md hover:bg-accent transition-colors"
                  onClick={() => setShowModal(false)}
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
            
            {/* Header */}
            <div className="p-6 pb-0">
              <h2 className="text-xl font-semibold pr-8">
                {selectedBlock.title || 'Untitled'}
              </h2>
            </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {/* Image display for blocks with images */}
                {(selectedBlock.block_type === 'Image' || selectedBlock.thumbnail_url) && (
                  <div className="relative w-full mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedBlock.thumbnail_url || selectedBlock.url || ''}
                      alt={selectedBlock.title || ''}
                      className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                    />
                  </div>
                )}
                
                {/* Block metadata */}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedBlock.block_type}</span>
                    </div>
                    {selectedBlock.created_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(selectedBlock.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {selectedBlock.description && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedBlock.description}
                      </p>
                    </div>
                  )}
                  
                  {/* Content (for text blocks or AI-generated content) */}
                  {selectedBlock.content && selectedBlock.block_type !== 'Image' && (
                    <div>
                      <h3 className="font-medium mb-2">Content</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedBlock.content}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    {selectedBlock.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedBlock.url || '', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Original
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const arenaUrl = `https://www.are.na/block/${selectedBlock.arena_id}`
                        window.open(arenaUrl, '_blank')
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Are.na
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
      )}
    </div>
  )
}