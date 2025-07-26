'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Tldraw, toRichText } from 'tldraw'
import { Button } from '@/components/ui/button'
import { AutoTextarea } from '@/components/ui/auto-textarea'
import { MessageSquare, X, Grid3X3, Network, Layers, ExternalLink, Calendar, Tag } from 'lucide-react'
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

type ViewMode = 'grid' | 'cluster' | 'mood'

interface ArrangementData {
  groups: Array<{
    theme: string
    blockIds: number[]
    color?: string
  }>
  messageId: string
  layoutType?: 'similarity' | 'timeline' | 'importance' | 'magazine' | 'moodboard' | 'presentation' | 'shape' | 'story'
  layoutParams?: {
    shape?: string // for shape arrangements
    spacing?: number // for grid variations
    sizeVariation?: boolean // for importance-based sizing
    direction?: 'horizontal' | 'vertical' // for timeline/presentation
  }
}

export default function SpatialCanvas({ blocks, channelInfo }: SpatialCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editor, setEditor] = useState<any>(null)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null) // For modal
  const [selectedBlocks, setSelectedBlocks] = useState<Block[]>([]) // For tldraw selection
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
  const [pendingArrangement, setPendingArrangement] = useState<ArrangementData | null>(null)
  const [chatPosition, setChatPosition] = useState({ x: 20, y: 80 }) // Default position
  const [isDraggingChat, setIsDraggingChat] = useState(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const dragStartChatPos = useRef({ x: 0, y: 0 })

  // Check if message is an arrangement command
  const isArrangementCommand = (message: string) => {
    const lowercaseMessage = message.toLowerCase()
    
    // Special commands
    if (message.startsWith('/supabase')) {
      return true
    }
    
    // Shape commands
    if (lowercaseMessage.includes('show as a') || 
        lowercaseMessage.includes('arrange in a') ||
        lowercaseMessage.includes('shape of')) {
      return true
    }
    
    const triggers = [
      'arrange by', 'group by', 'organize by', 
      'layout', 'create a grid', 'sort by',
      'arrange these', 'organize these',
      'timeline', 'chronological', 'by date',
      'make important', 'make larger', 'emphasize',
      'magazine', 'mood board', 'presentation',
      'story flow', 'narrative', 'spiral', 'circle',
      'heart', 'star', 'supabase', 'lightning bolt'
    ];
    return triggers.some(trigger => 
      lowercaseMessage.includes(trigger)
    );
  };

  // Execute pending arrangement
  const executePendingArrangement = () => {
    if (!pendingArrangement) return
    
    const layoutType = pendingArrangement.layoutType || 'similarity'
    
    switch (layoutType) {
      case 'timeline':
        applyTimelineLayout(pendingArrangement.layoutParams?.direction || 'horizontal')
        break
        
      case 'importance':
        applyImportanceLayout()
        break
        
      case 'magazine':
        applyMagazineLayout()
        break
        
      case 'moodboard':
        applyMoodBoardLayout()
        break
        
      case 'presentation':
        applyPresentationLayout(pendingArrangement.layoutParams?.direction || 'horizontal')
        break
        
      case 'shape':
        applyShapeLayout(pendingArrangement.layoutParams?.shape || 'circle')
        break
      
      case 'similarity':
      default:
        const clusters = pendingArrangement.groups.map((g, i) => ({
          id: i,
          label: g.theme,
          blockIds: g.blockIds,
          blockCount: g.blockIds.length
        }))
        applySimilarityLayoutWithData(clusters)
        break
    }
    
    // Clear pending arrangement after execution
    setPendingArrangement(null)
  }

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
  const calculateGridLayout = (blocks: Block[], spacing: 'tight' | 'normal' | 'loose' = 'normal') => {
    const padding = 150
    const spacingValues = {
      tight: 10,
      normal: 20,
      loose: 40
    }
    const space = spacingValues[spacing]
    const baseSize = 80
    const cols = Math.ceil(Math.sqrt(blocks.length))
    
    return blocks.map((block, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x: padding + col * (baseSize + space),
        y: padding + row * (baseSize + space),
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

  // Removed calculateRandomLayout - using calculateMoodBoardLayout instead for 'mood' view mode

  const calculateTimelineLayout = (blocks: Block[], direction: 'horizontal' | 'vertical' = 'horizontal') => {
    // Sort blocks by creation date
    const sortedBlocks = [...blocks].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const baseSize = 80
    const spacing = 120 // More spacing for timeline
    const padding = 200
    
    return sortedBlocks.map((block, index) => {
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      let x, y
      if (direction === 'horizontal') {
        x = padding + index * spacing
        y = 400 // Center vertically
      } else {
        x = 400 // Center horizontally
        y = padding + index * spacing
      }
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x,
        y,
        opacity: 0,
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

  const calculateImportanceLayout = (blocks: Block[]) => {
    // Sort blocks by importance score
    const blocksWithImportance = blocks.map(block => ({
      block,
      importance: getBlockImportance(block)
    })).sort((a, b) => b.importance - a.importance)

    const baseSize = 60
    const viewportWidth = 1600
    
    // Use a circular/spiral layout with important items in center
    const centerX = viewportWidth / 2
    const centerY = 600
    
    return blocksWithImportance.map(({ block, importance }, index) => {
      // Place most important items in center, less important further out
      const ring = Math.floor(index / 6) // 6 items per ring
      const posInRing = index % 6
      const angleStep = (Math.PI * 2) / 6
      const angle = posInRing * angleStep
      const radius = ring * 150 + 100 // Start 100px from center
      
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      const typeConfig = getBlockTypeConfig(block, baseSize, importance)
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x,
        y,
        opacity: 0,
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

  const calculateMagazineLayout = (blocks: Block[]) => {
    const padding = 150
    const pageWidth = 1200
    const pageHeight = 800
    
    // Define magazine-style grid zones
    const zones = [
      // Hero image zone
      { x: 0, y: 0, width: 2, height: 2, maxBlocks: 1 },
      // Side column
      { x: 2, y: 0, width: 1, height: 1, maxBlocks: 1 },
      { x: 2, y: 1, width: 1, height: 1, maxBlocks: 1 },
      // Bottom row
      { x: 0, y: 2, width: 1, height: 1, maxBlocks: 1 },
      { x: 1, y: 2, width: 1, height: 1, maxBlocks: 1 },
      { x: 2, y: 2, width: 1, height: 1, maxBlocks: 1 },
    ]
    
    const cellWidth = pageWidth / 3
    const cellHeight = pageHeight / 3
    
    // Prioritize image blocks for visual impact
    const sortedBlocks = [...blocks].sort((a, b) => {
      if (a.block_type === 'Image' && b.block_type !== 'Image') return -1
      if (a.block_type !== 'Image' && b.block_type === 'Image') return 1
      return 0
    })
    
    return sortedBlocks.slice(0, zones.length).map((block, index) => {
      const zone = zones[index]
      const x = padding + zone.x * cellWidth
      const y = padding + zone.y * cellHeight
      
      // Larger sizes for magazine layout
      const baseSize = Math.min(zone.width * cellWidth * 0.8, zone.height * cellHeight * 0.8)
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      return {
        id: `shape:block-${block.id}`,
        type: 'geo',
        x: x + (zone.width * cellWidth - typeConfig.w) / 2,
        y: y + (zone.height * cellHeight - typeConfig.h) / 2,
        opacity: 0,
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

  const calculateMoodBoardLayout = (blocks: Block[]) => {
    const viewportWidth = 2000
    const viewportHeight = 1400
    
    // Categorize blocks by type and importance
    const categorizedBlocks = blocks.map(block => ({
      block,
      importance: getBlockImportance(block),
      isHero: false
    }))
    
    // Select 2-3 hero blocks (highest importance images/videos)
    const heroCount = Math.min(3, Math.floor(blocks.length / 8) + 1)
    categorizedBlocks
      .filter(b => b.block.block_type === 'Image' || b.block.block_type === 'Video')
      .sort((a, b) => b.importance - a.importance)
      .slice(0, heroCount)
      .forEach(b => b.isHero = true)
    
    // Define gravity points for clusters (asymmetrical distribution)
    const gravityPoints = [
      { x: viewportWidth * 0.25, y: viewportHeight * 0.3, weight: 1.2 },
      { x: viewportWidth * 0.7, y: viewportHeight * 0.25, weight: 1.0 },
      { x: viewportWidth * 0.15, y: viewportHeight * 0.7, weight: 0.8 },
      { x: viewportWidth * 0.8, y: viewportHeight * 0.65, weight: 0.9 },
      { x: viewportWidth * 0.45, y: viewportHeight * 0.85, weight: 0.7 }
    ]
    
    // Distribute blocks to clusters
    const shapes: Array<{
      id: string
      type: string
      x: number
      y: number
      rotation: number
      opacity: number
      props: {
        geo: string
        w: number
        h: number
        color: string
        fill: string
      }
    }> = []
    const placedPositions: Array<{x: number, y: number, w: number, h: number}> = []
    
    categorizedBlocks.forEach((item, index) => {
      const { block, isHero } = item
      
      // Select a gravity point (cycle through them with some randomness)
      const gravityIndex = (index + Math.floor(Math.random() * 2)) % gravityPoints.length
      const gravity = gravityPoints[gravityIndex]
      
      // Calculate base position with organic offset
      const angleVariation = (Math.random() * Math.PI * 2)
      const distanceFromGravity = isHero 
        ? 50 + Math.random() * 100  // Heroes closer to gravity points
        : 120 + Math.random() * 200 // Others more spread out
      
      let x = gravity.x + Math.cos(angleVariation) * distanceFromGravity
      let y = gravity.y + Math.sin(angleVariation) * distanceFromGravity
      
      // Add edge attraction (some blocks go to edges)
      if (Math.random() < 0.3 && !isHero) {
        const edge = Math.floor(Math.random() * 4)
        switch(edge) {
          case 0: x = 100 + Math.random() * 200; break // left
          case 1: x = viewportWidth - 300 + Math.random() * 200; break // right
          case 2: y = 100 + Math.random() * 200; break // top
          case 3: y = viewportHeight - 300 + Math.random() * 200; break // bottom
        }
      }
      
      // Size variations with hero emphasis
      let sizeMultiplier = 1
      if (isHero) {
        sizeMultiplier = 1.5 + Math.random() * 1.0 // 1.5x to 2.5x (larger heroes)
      } else if (block.block_type === 'Text' || block.block_type === 'Link') {
        sizeMultiplier = 0.5 + Math.random() * 0.3 // 0.5x to 0.8x (smaller text)
      } else {
        sizeMultiplier = 0.8 + Math.random() * 0.7 // 0.8x to 1.5x (more variation)
      }
      
      const baseSize = 80 * sizeMultiplier
      const typeConfig = getBlockTypeConfig(block, baseSize)
      
      // Check for overlaps and adjust (allow some controlled overlapping)
      let attempts = 0
      while (attempts < 10) {
        const overlap = placedPositions.find(pos => {
          const dx = Math.abs(x - pos.x)
          const dy = Math.abs(y - pos.y)
          const minDistance = (typeConfig.w + pos.w) * 0.4 // Allow 60% overlap
          return dx < minDistance && dy < minDistance
        })
        
        if (!overlap || Math.random() < 0.3) break // 30% chance to allow overlap
        
        // Adjust position
        x += (Math.random() - 0.5) * 100
        y += (Math.random() - 0.5) * 100
        attempts++
      }
      
      // Ensure within viewport bounds
      x = Math.max(50, Math.min(viewportWidth - typeConfig.w - 50, x))
      y = Math.max(50, Math.min(viewportHeight - typeConfig.h - 50, y))
      
      // No rotation for cleaner appearance
      const rotation = 0
      
      placedPositions.push({ x, y, w: typeConfig.w, h: typeConfig.h })
      
      shapes.push({
        id: `shape:block-${block.id}`,
        type: 'geo',
        x,
        y,
        rotation,
        opacity: 0,
        props: {
          geo: typeConfig.geo,
          w: typeConfig.w,
          h: typeConfig.h,
          color: typeConfig.color,
          fill: 'none'
        }
      })
    })
    
    return shapes
  }

  // Extract meaningful keywords from blocks
  const extractKeywords = (blocks: Block[]): string[] => {
    const wordFrequency = new Map<string, number>()
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'few', 'more', 'most', 'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once'])
    const filePatterns = /\.(jpg|jpeg|png|gif|pdf|doc|docx|txt|mp4|mov|avi)$/i
    const unwantedPatterns = /^(untitled|screenshot|img_|image|file|document|\d+)[-_]?/i
    
    blocks.forEach(block => {
      // Extract words from different sources
      const sources: string[] = []
      
      // Prioritize description and content
      if (block.description) sources.push(block.description)
      if (block.content) sources.push(block.content)
      
      // Only use title if it doesn't look like a filename
      if (block.title && !filePatterns.test(block.title) && !unwantedPatterns.test(block.title)) {
        sources.push(block.title)
      }
      
      // Process all text
      sources.forEach(text => {
        // Extract words (alphanumeric, 3+ chars)
        const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
        words.forEach(word => {
          if (!stopWords.has(word) && word.length <= 15) {
            wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
          }
        })
      })
    })
    
    // Sort by frequency and take top words
    const sortedWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 20) // Get top 20 words
    
    // If we don't have enough words, add some thematic defaults
    if (sortedWords.length < 8) {
      const defaults = ['creative', 'ideas', 'design', 'explore', 'inspire', 'connect', 'discover', 'build']
      defaults.forEach(word => {
        if (!sortedWords.includes(word)) {
          sortedWords.push(word)
        }
      })
    }
    
    return sortedWords
  }

  // Generate decorative annotations for mood board
  const generateMoodBoardAnnotations = async (blockShapes: Array<{id: string, x: number, y: number, rotation?: number}>) => {
    if (!editor || !blocks.length) return
    
    try {
      // Extract keywords from blocks
      const keywords = extractKeywords(blocks)
      
      // Create decorative annotation shapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotationShapes: Array<any> = []
      
      // Get canvas bounds from block positions
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      blockShapes.forEach(shape => {
        minX = Math.min(minX, shape.x)
        maxX = Math.max(maxX, shape.x + 150)
        minY = Math.min(minY, shape.y)
        maxY = Math.max(maxY, shape.y + 150)
      })
      
      // Add random decorative elements
      const elementCount = Math.min(15, Math.floor(blocks.length / 3) + 4)
      
      for (let i = 0; i < elementCount; i++) {
        const elementType = Math.floor(Math.random() * 4)
        
        switch (elementType) {
          case 0: // Highlight circles
            const circleX = minX + Math.random() * (maxX - minX)
            const circleY = minY + Math.random() * (maxY - minY)
            annotationShapes.push({
              id: `shape:annotation-circle-${i}`,
              type: 'geo',
              x: circleX,
              y: circleY,
              rotation: Math.random() * Math.PI * 2,
              opacity: 0.25,
              props: {
                geo: 'ellipse',
                w: 100 + Math.random() * 100,
                h: 100 + Math.random() * 100,
                color: ['red', 'blue', 'green', 'violet', 'orange'][Math.floor(Math.random() * 5)],
                fill: 'solid',
                dash: 'draw'
              }
            })
            break
            
          case 1: // Connecting lines
            if (blockShapes.length > 1) {
              const fromBlock = blockShapes[Math.floor(Math.random() * blockShapes.length)]
              const toBlock = blockShapes[Math.floor(Math.random() * blockShapes.length)]
              if (fromBlock !== toBlock) {
                // Create a simple line using a thin rectangle
                const dx = toBlock.x - fromBlock.x
                const dy = toBlock.y - fromBlock.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const angle = Math.atan2(dy, dx)
                
                annotationShapes.push({
                  id: `shape:annotation-line-${i}`,
                  type: 'geo',
                  x: fromBlock.x + 50,
                  y: fromBlock.y + 50,
                  rotation: angle,
                  opacity: 0.35,
                  props: {
                    geo: 'rectangle',
                    w: length,
                    h: 2,
                    color: 'grey',
                    fill: 'solid',
                    dash: 'draw'
                  }
                })
              }
            }
            break
            
          case 2: // Text annotations
            const word = keywords[Math.floor(Math.random() * keywords.length)]
            const textX = minX + Math.random() * (maxX - minX)
            const textY = minY + Math.random() * (maxY - minY)
            annotationShapes.push({
              id: `shape:annotation-text-${i}`,
              type: 'text',
              x: textX,
              y: textY,
              rotation: 0, // No rotation for text
              opacity: 1, // 100% opacity
              props: {
                richText: toRichText(word),
                color: 'grey', // Grey color for subtlety
                size: 'l',
                font: 'sans', // Sans-serif font
                textAlign: 'middle'
              }
            })
            break
            
          case 3: // Accent rectangles
            const rectX = minX + Math.random() * (maxX - minX)
            const rectY = minY + Math.random() * (maxY - minY)
            annotationShapes.push({
              id: `shape:annotation-rect-${i}`,
              type: 'geo',
              x: rectX,
              y: rectY,
              rotation: Math.random() * Math.PI * 2,
              opacity: 0.15,
              props: {
                geo: 'rectangle',
                w: 80 + Math.random() * 120,
                h: 80 + Math.random() * 120,
                color: 'yellow',
                fill: 'solid',
                dash: 'solid'
              }
            })
            break
        }
      }
      
      // Add mood indicator
      annotationShapes.push({
        id: 'shape:ai-indicator',
        type: 'text',
        x: 100,
        y: 50,
        rotation: 0, // No rotation
        opacity: 1, // 100% opacity
        props: {
          richText: toRichText('✨ mood board'),
          color: 'white', // White color
          size: 's',
          font: 'sans', // Sans-serif font
          textAlign: 'start'
        }
      })
      
      // Create all annotation shapes
      if (annotationShapes.length > 0) {
        editor.createShapes(annotationShapes)
      }
    } catch (error) {
      console.error('Failed to generate mood board annotations:', error)
      // Fail silently - annotations are enhancement, not critical
    }
  }


  const calculatePresentationLayout = (blocks: Block[], direction: 'horizontal' | 'vertical' = 'horizontal') => {
    const slideWidth = 800
    const slideHeight = 600
    const slideSpacing = 200
    const blocksPerSlide = 3
    const padding = 200
    
    // Group blocks into slides
    const slides: Block[][] = []
    for (let i = 0; i < blocks.length; i += blocksPerSlide) {
      slides.push(blocks.slice(i, i + blocksPerSlide))
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shapes: any[] = []
    
    slides.forEach((slideBlocks, slideIndex) => {
      const slideX = direction === 'horizontal' 
        ? padding + slideIndex * (slideWidth + slideSpacing)
        : padding + slideWidth / 2
      const slideY = direction === 'vertical'
        ? padding + slideIndex * (slideHeight + slideSpacing)
        : padding + slideHeight / 2
      
      // Add slide background shape
      shapes.push({
        id: `shape:slide-bg-${slideIndex}`,
        type: 'geo',
        x: slideX - slideWidth / 2,
        y: slideY - slideHeight / 2,
        opacity: 0.05, // Very subtle background
        props: {
          geo: 'rectangle',
          w: slideWidth,
          h: slideHeight,
          color: 'grey',
          fill: 'solid'
        }
      })
      
      // Arrange blocks within slide
      slideBlocks.forEach((block, blockIndex) => {
        const positions = [
          { x: 0, y: -slideHeight / 3 }, // Top
          { x: -slideWidth / 3, y: slideHeight / 4 }, // Bottom left
          { x: slideWidth / 3, y: slideHeight / 4 } // Bottom right
        ]
        
        const pos = positions[blockIndex] || { x: 0, y: 0 }
        const baseSize = 100
        const typeConfig = getBlockTypeConfig(block, baseSize)
        
        shapes.push({
          id: `shape:block-${block.id}`,
          type: 'geo',
          x: slideX + pos.x - typeConfig.w / 2,
          y: slideY + pos.y - typeConfig.h / 2,
          opacity: 0,
          props: {
            geo: typeConfig.geo,
            w: typeConfig.w,
            h: typeConfig.h,
            color: typeConfig.color,
            fill: 'none'
          }
        })
      })
    })
    
    return shapes
  }

  const calculateShapeLayout = (blocks: Block[], shape: string) => {
    const centerX = 800
    const centerY = 600
    const baseRadius = 300
    const baseSize = 80
    
    switch (shape.toLowerCase()) {
      case 'circle':
        return blocks.map((block, index) => {
          const angle = (index / blocks.length) * Math.PI * 2
          const x = centerX + Math.cos(angle) * baseRadius
          const y = centerY + Math.sin(angle) * baseRadius
          const typeConfig = getBlockTypeConfig(block, baseSize)
          
          return {
            id: `shape:block-${block.id}`,
            type: 'geo',
            x: x - typeConfig.w / 2,
            y: y - typeConfig.h / 2,
            opacity: 0,
            props: {
              geo: typeConfig.geo,
              w: typeConfig.w,
              h: typeConfig.h,
              color: typeConfig.color,
              fill: 'none'
            }
          }
        })
        
      case 'heart':
        return blocks.map((block, index) => {
          const t = (index / blocks.length) * Math.PI * 2
          // Heart parametric equations
          const x = centerX + 16 * Math.pow(Math.sin(t), 3) * 10
          const y = centerY - (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 10
          const typeConfig = getBlockTypeConfig(block, baseSize)
          
          return {
            id: `shape:block-${block.id}`,
            type: 'geo',
            x: x - typeConfig.w / 2,
            y: y - typeConfig.h / 2,
            opacity: 0,
            props: {
              geo: typeConfig.geo,
              w: typeConfig.w,
              h: typeConfig.h,
              color: typeConfig.color,
              fill: 'none'
            }
          }
        })
        
      case 'spiral':
        // Duplicate each block multiple times for dense spiral
        const duplicateCount = 15 // Each block appears 15 times
        const smallerBaseSize = baseSize * 0.25 // 25% of normal size
        const spiralBlocks: Array<{
          id: string
          type: string
          x: number
          y: number
          opacity: number
          props: {
            geo: string
            w: number
            h: number
            color: string
            fill: string
          }
        }> = []
        
        // Create duplicates
        for (let dup = 0; dup < duplicateCount; dup++) {
          blocks.forEach((block, blockIndex) => {
            const index = dup * blocks.length + blockIndex
            const angle = index * 0.15 // Even tighter spiral
            const radius = index * 2 // Much closer spacing
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            const typeConfig = getBlockTypeConfig(block, smallerBaseSize)
            
            spiralBlocks.push({
              id: `shape:block-${block.id}-dup-${dup}`,
              type: 'geo',
              x: x - typeConfig.w / 2,
              y: y - typeConfig.h / 2,
              opacity: 0,
              props: {
                geo: typeConfig.geo,
                w: typeConfig.w,
                h: typeConfig.h,
                color: typeConfig.color,
                fill: 'none'
              }
            })
          })
        }
        
        return spiralBlocks
        
      case 'star':
        return blocks.map((block, index) => {
          const points = 5
          const innerRadius = baseRadius * 0.4
          const outerRadius = baseRadius
          const angle = (index / blocks.length) * Math.PI * 2
          const pointIndex = Math.floor((index / blocks.length) * points * 2)
          const radius = pointIndex % 2 === 0 ? outerRadius : innerRadius
          const adjustedAngle = angle - Math.PI / 2 // Start from top
          
          const x = centerX + Math.cos(adjustedAngle) * radius
          const y = centerY + Math.sin(adjustedAngle) * radius
          const typeConfig = getBlockTypeConfig(block, baseSize)
          
          return {
            id: `shape:block-${block.id}`,
            type: 'geo',
            x: x - typeConfig.w / 2,
            y: y - typeConfig.h / 2,
            opacity: 0,
            props: {
              geo: typeConfig.geo,
              w: typeConfig.w,
              h: typeConfig.h,
              color: typeConfig.color,
              fill: 'none'
            }
          }
        })
        
      case 'supabase':
        // Supabase logo - lightning bolt shape with duplicates for density
        const supabaseDuplicateCount = 12 // Each block appears 12 times
        const supabaseBlockSize = baseSize * 0.3 // 30% of normal size
        const supabaseBlocks: Array<{
          id: string
          type: string
          x: number
          y: number
          opacity: number
          props: {
            geo: string
            w: number
            h: number
            color: string
            fill: string
          }
        }> = []
        
        // Define the Supabase lightning bolt path points
        // The logo is like a arrow/lightning bolt pointing right
        const logoWidth = 400
        const logoHeight = 300
        const logoStartX = centerX - logoWidth / 2
        const logoStartY = centerY - logoHeight / 2
        
        // Define key points of the lightning bolt (normalized 0-1)
        const supabasePoints = [
          // Top part of arrow
          { x: 0.3, y: 0 },
          { x: 0.7, y: 0 },
          { x: 1, y: 0.3 },
          { x: 1, y: 0.4 },
          // Right side indent
          { x: 0.6, y: 0.4 },
          // Bottom part of arrow
          { x: 0.8, y: 1 },
          { x: 0.4, y: 1 },
          { x: 0, y: 0.6 },
          { x: 0, y: 0.5 },
          // Left side indent
          { x: 0.4, y: 0.5 },
          // Close the shape
          { x: 0.3, y: 0 }
        ]
        
        // Create a filled area by distributing blocks within the shape
        let blockIndex = 0
        for (let dup = 0; dup < supabaseDuplicateCount; dup++) {
          blocks.forEach((block, originalIndex) => {
            // Distribute blocks across the shape area
            const t = (blockIndex % (supabasePoints.length * 10)) / (supabasePoints.length * 10)
            
            // Find which segment we're on
            const segmentIndex = Math.floor(t * (supabasePoints.length - 1))
            const segmentT = (t * (supabasePoints.length - 1)) - segmentIndex
            
            const p1 = supabasePoints[segmentIndex]
            const p2 = supabasePoints[Math.min(segmentIndex + 1, supabasePoints.length - 1)]
            
            // Interpolate along the edge
            let edgeX = p1.x + (p2.x - p1.x) * segmentT
            let edgeY = p1.y + (p2.y - p1.y) * segmentT
            
            // Add some inward offset to fill the shape
            const inwardOffset = (Math.random() * 0.3 + 0.1) * (dup % 3 === 0 ? 1 : dup % 3 === 1 ? 0.6 : 0.3)
            const centerBiasX = 0.5 - edgeX
            const centerBiasY = 0.5 - edgeY
            
            edgeX += centerBiasX * inwardOffset
            edgeY += centerBiasY * inwardOffset
            
            // Convert to actual coordinates
            const x = logoStartX + edgeX * logoWidth + (Math.random() - 0.5) * 20
            const y = logoStartY + edgeY * logoHeight + (Math.random() - 0.5) * 20
            
            const typeConfig = getBlockTypeConfig(block, supabaseBlockSize)
            
            supabaseBlocks.push({
              id: `shape:block-${block.id}-dup-${dup}`,
              type: 'geo',
              x: x - typeConfig.w / 2,
              y: y - typeConfig.h / 2,
              opacity: 0,
              props: {
                geo: typeConfig.geo,
                w: typeConfig.w,
                h: typeConfig.h,
                color: typeConfig.color,
                fill: 'none'
              }
            })
            
            blockIndex++
          })
        }
        
        return supabaseBlocks
        
      default:
        // Fallback to circle
        return calculateShapeLayout(blocks, 'circle')
    }
  }

  const getBlockTypeConfig = (block: Block, baseSize: number, importanceMultiplier: number = 1) => {
    const sizeVariation = 0.8 + (block.id % 5) * 0.1
    const size = baseSize * sizeVariation * importanceMultiplier
    
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

  // Calculate importance score for a block
  const getBlockImportance = (block: Block): number => {
    let score = 1
    
    // Blocks with both title and description are more important
    if (block.title && block.description) score += 0.3
    
    // Videos and images are visually important
    if (block.block_type === 'Video' || block.block_type === 'Image') score += 0.2
    
    // Blocks with longer content are more important
    if (block.content && block.content.length > 200) score += 0.2
    if (block.content && block.content.length > 500) score += 0.2
    
    // Recent blocks might be more important (within last 30 days)
    const daysSinceCreated = (Date.now() - new Date(block.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 30) score += 0.2
    
    return Math.min(score, 2) // Cap at 2x size
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
    } else if (viewMode === 'mood') {
      shapes = calculateMoodBoardLayout(blocks)
    } else {
      // Cluster view will be handled by handleAutoArrange
      return
    }

    editor.createShapes(shapes)
    
    // Generate decorations for mood board
    if (viewMode === 'mood') {
      setTimeout(async () => {
        await generateMoodBoardAnnotations(shapes)
      }, 50)
    }
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 200 })
    }, 100)
  }

  // Add blocks when editor is ready or view mode changes
  useEffect(() => {
    if (!editor || !blocks.length) return
    
    if (viewMode === 'cluster' && clusters.length > 0) {
      // Re-apply cluster layout if we have clusters
      applySimilarityLayout()
    } else if (viewMode !== 'cluster') {
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
          rotation: 0, // Reset rotation for clean cluster appearance
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
        const labelX = centerX + maxClusterRadius + 100 // Increased distance from cluster edge to prevent overlap
        
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
    
    // Instead of deleting shapes, update existing ones or create new ones
    const existingShapes = editor.getCurrentPageShapes()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingShapeIds = new Set(existingShapes.map((s: any) => s.id))
    
    // Update existing block shapes
    shapes.forEach(newShape => {
      if (existingShapeIds.has(newShape.id)) {
        // Shape exists, just store its target position - we'll animate it
        const existingShape = editor.getShape(newShape.id)
        if (existingShape) {
          // Keep current position, we'll animate from here
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newShape.x = (existingShape as any).x
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newShape.y = (existingShape as any).y
        }
      } else {
        // Create new shape at starting position
        editor.createShape(newShape)
      }
    })
    
    // Remove any shapes that shouldn't exist (like old labels)
    const newShapeIds = new Set(shapes.map(s => s.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existingShapes.forEach((shape: any) => {
      if (!newShapeIds.has(shape.id) && shape.id.startsWith('shape:')) {
        editor.deleteShape(shape.id)
      }
    })
    
    // Create label shapes (they're new)
    editor.createShapes(labelShapes)
    
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
          
          // Determine animation style based on distance to final position
          const deltaX = finalPos.x - startX
          const deltaY = finalPos.y - startY
          const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          
          // For grid mode: use gentler animation without expansion if blocks are close
          const useExpansion = totalDistance > 200 // Only expand if moving far
          
          // Calculate expansion point (move slightly toward final cluster position)
          const expansionX = useExpansion 
            ? startX + deltaX * 0.3 // Move 30% toward target first
            : startX + deltaX * 0.1 // Just a slight movement
          const expansionY = useExpansion
            ? startY + deltaY * 0.3 - 50 // Also lift up slightly
            : startY + deltaY * 0.1
          
          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            let currentX, currentY
            
            if (useExpansion && progress < 0.3) {
              // Phase 1: Gentle rise/expansion (0-30% of animation)
              const expandProgress = progress / 0.3
              const eased = expandProgress * expandProgress // Ease in quad for smooth start
              
              currentX = startX + (expansionX - startX) * eased
              currentY = startY + (expansionY - startY) * eased
            } else if (useExpansion) {
              // Phase 2: Smooth descent to final position (30-100% of animation)
              const contractProgress = (progress - 0.3) / 0.7
              // Custom easing for smooth arc
              const eased = 1 - Math.pow(1 - contractProgress, 2.5)
              
              currentX = expansionX + (finalPos.x - expansionX) * eased
              currentY = expansionY + (finalPos.y - expansionY) * eased
            } else {
              // Direct smooth transition for close blocks
              const eased = 1 - Math.pow(1 - progress, 3) // Smooth ease out
              currentX = startX + (finalPos.x - startX) * eased
              currentY = startY + (finalPos.y - startY) * eased
            }
            
            editor.updateShape({
              id: shape.id,
              type: shape.type,
              x: currentX,
              y: currentY,
              rotation: 0, // Reset rotation for clean cluster appearance
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

  // Apply timeline layout with animation
  const applyTimelineLayout = (direction: 'horizontal' | 'vertical' = 'horizontal') => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate timeline positions
    const shapes = calculateTimelineLayout(blocks, direction)
    
    // Create shapes
    editor.createShapes(shapes)
    
    // Add date labels
    const sortedBlocks = [...blocks].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    const dateLabels = sortedBlocks.map((block, index) => {
      const date = new Date(block.created_at)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      
      let labelX, labelY
      if (direction === 'horizontal') {
        labelX = 200 + index * 120
        labelY = 350 // Above the blocks
      } else {
        labelX = 300 // Left of the blocks
        labelY = 200 + index * 120
      }
      
      return {
        id: `shape:date-label-${block.id}`,
        type: 'text',
        x: labelX,
        y: labelY,
        opacity: 0.7,
        props: {
          richText: toRichText(dateStr),
          color: 'grey',
          size: 's',
          font: 'sans',
          textAlign: 'middle',
          w: 100,
          autoSize: true,
        }
      }
    })
    
    editor.createShapes(dateLabels)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Apply importance-based layout
  const applyImportanceLayout = () => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate importance positions
    const shapes = calculateImportanceLayout(blocks)
    
    // Create shapes
    editor.createShapes(shapes)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Apply magazine layout
  const applyMagazineLayout = () => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate magazine positions
    const shapes = calculateMagazineLayout(blocks)
    
    // Create shapes
    editor.createShapes(shapes)
    
    // Add page title
    const titleShape = {
      id: 'shape:magazine-title',
      type: 'text',
      x: 150,
      y: 50,
      opacity: 0.9,
      props: {
        richText: toRichText(channelInfo?.title || 'Magazine Layout'),
        color: 'black',
        size: 'xl',
        font: 'serif',
        textAlign: 'start',
        w: 600,
        autoSize: true,
      }
    }
    
    editor.createShape(titleShape)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Apply mood board layout
  const applyMoodBoardLayout = async () => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate mood board positions
    const shapes = calculateMoodBoardLayout(blocks)
    
    // Create shapes
    editor.createShapes(shapes)
    
    // Generate AI annotations after positioning
    setTimeout(async () => {
      await generateMoodBoardAnnotations(shapes)
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Apply presentation layout
  const applyPresentationLayout = (direction: 'horizontal' | 'vertical' = 'horizontal') => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate presentation positions
    const shapes = calculatePresentationLayout(blocks, direction)
    
    // Create shapes
    editor.createShapes(shapes)
    
    // Add slide numbers
    const slides = Math.ceil(blocks.length / 3)
    const slideLabels = Array.from({ length: slides }, (_, i) => {
      const slideX = direction === 'horizontal' 
        ? 200 + i * 1000
        : 600
      const slideY = direction === 'vertical'
        ? 200 + i * 800
        : 100
      
      return {
        id: `shape:slide-number-${i}`,
        type: 'text',
        x: slideX,
        y: slideY - 50,
        opacity: 0.7,
        props: {
          richText: toRichText(`Slide ${i + 1} of ${slides}`),
          color: 'grey',
          size: 's',
          font: 'sans',
          textAlign: 'middle',
          w: 200,
          autoSize: true,
        }
      }
    })
    
    editor.createShapes(slideLabels)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Apply shape-based layout
  const applyShapeLayout = (shape: string) => {
    if (!editor || !blocks.length) return

    setIsAnimating(true)

    // Clear existing shapes
    const allShapes = editor.getCurrentPageShapes()
    if (allShapes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.deleteShapes(allShapes.map((shape: any) => shape.id))
    }

    // Calculate shape positions
    const shapes = calculateShapeLayout(blocks, shape)
    
    // Create shapes
    editor.createShapes(shapes)
    
    // Add shape label
    const labelShape = {
      id: 'shape:shape-label',
      type: 'text',
      x: 800,
      y: 100,
      opacity: 0.7,
      props: {
        richText: toRichText(`${shape.charAt(0).toUpperCase() + shape.slice(1)} arrangement`),
        color: 'grey',
        size: 'm',
        font: 'sans',
        textAlign: 'middle',
        w: 300,
        autoSize: true,
      }
    }
    
    editor.createShape(labelShape)
    
    setTimeout(() => {
      editor.zoomToFit({ duration: 800 })
      setIsAnimating(false)
    }, 100)
  }

  // Handle view mode changes
  const handleViewModeChange = async (mode: ViewMode) => {
    // If clicking the same mode as current (applies to mood), regenerate
    if (mode === 'mood' && viewMode === 'mood') {
      applyLayout() // This will generate new mood board positions
      return
    }
    
    setViewMode(mode)
    
    // If switching to cluster and we don't have clusters yet, fetch them
    if (mode === 'cluster' && clusters.length === 0) {
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
      
      // Get all shapes on the page
      const allShapes = editor.getCurrentPageShapes()
      
      // Find shapes that match our block pattern (including duplicates)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allShapes.forEach((shape: any) => {
        // Match both regular and duplicate shape IDs
        const match = shape.id.match(/shape:block-(\d+)(?:-dup-(\d+))?/)
        if (match) {
          const blockId = match[1]
          const dupIndex = match[2] || '0'
          const bounds = editor.getShapePageBounds(shape)
          if (bounds) {
            // Store position with unique key for duplicates
            const positionKey = dupIndex === '0' ? blockId : `${blockId}-dup-${dupIndex}`
            positions[positionKey] = { 
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

  // Handle chat panel dragging
  useEffect(() => {
    if (!isDraggingChat) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x
      const deltaY = e.clientY - dragStartPos.current.y
      
      // Calculate new position
      let newX = dragStartChatPos.current.x + deltaX
      let newY = dragStartChatPos.current.y + deltaY
      
      // Keep chat panel within viewport bounds
      const chatWidth = 384 // w-96 = 24rem = 384px
      const chatHeight = 600 // max height
      const padding = 20
      
      newX = Math.max(padding, Math.min(window.innerWidth - chatWidth - padding, newX))
      newY = Math.max(padding, Math.min(window.innerHeight - chatHeight - padding, newY))
      
      setChatPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDraggingChat(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingChat])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        forceMobile={false}
        onMount={(editor) => {
          setEditor(editor)
          
          // Track selection changes
          editor.on('change', () => {
            const selectedShapeIds = editor.getSelectedShapeIds()
            const selectedBlocksList: Block[] = []
            
            selectedShapeIds.forEach(shapeId => {
              // Extract block ID from shape ID (format: "shape:block-123")
              const match = shapeId.match(/shape:block-(\d+)/)
              if (match) {
                const blockId = parseInt(match[1])
                const block = blocks.find(b => b.id === blockId)
                if (block) {
                  selectedBlocksList.push(block)
                }
              }
            })
            
            setSelectedBlocks(selectedBlocksList)
          })
          
          // Force theme update after mount
          if (resolvedTheme) {
            editor.user.updateUserPreferences({ 
              colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light' 
            })
          }
        }}
      />
      {/* Channel info and status - bottom right */}
      <div className="absolute bottom-18 right-4 z-50">
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2">
          <h3 className="font-semibold text-sm mb-1">{channelInfo?.title || 'Channel'}</h3>
          <p className="text-xs text-muted-foreground">{blocks.length} blocks loaded</p>
          <p className="text-xs text-muted-foreground">Rendering {visibleBlockCount} of {blocks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Drag to arrange • Quick click to view</p>
        </div>
      </div>
      
      
      {/* Block Image Overlays - with viewport culling */}
      {editor && (() => {
        let visibleCount = 0
        
        // Render all shapes including duplicates
        const renderedBlocks = Object.entries(shapePositions).map(([posKey, pos]) => {
          // Extract block ID from position key
          const blockIdMatch = posKey.match(/^(\d+)(?:-dup-\d+)?$/)
          if (!blockIdMatch) return null
          
          const blockId = parseInt(blockIdMatch[1])
          const block = blocks.find(b => b.id === blockId)
          if (!block) return null
          
          // Get the shape ID (might be duplicate)
          const shapeId = posKey.includes('-dup-') 
            ? `shape:block-${posKey}` 
            : `shape:block-${blockId}`
          
          // Get the shape to check for rotation
          const shape = editor.getShape(shapeId)
          const rotation = shape?.rotation || 0
          
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

          const isSelected = selectedBlocks.some(b => b.id === block.id)
          
          return (
            <div
              key={posKey}
              className={`absolute pointer-events-none overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
                zIndex: 10,
                borderRadius: '8px', // Match tldraw's default shape radius
                transform: `rotate(${rotation}rad)`,
                transformOrigin: 'center',
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
          variant={viewMode === 'cluster' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('cluster')}
          disabled={blocks.length === 0 || isArranging || isAnimating}
          className="rounded-none"
        >
          <Network className="h-4 w-4 mr-1" />
          {isArranging ? 'Analyzing...' : isAnimating ? 'Organizing...' : 'Cluster'}
        </Button>
        <Button
          variant={viewMode === 'mood' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleViewModeChange('mood')}
          disabled={blocks.length === 0}
          className="rounded-none"
          title="Mood board layout"
        >
          <Layers className="h-4 w-4 mr-1" />
          Mood
        </Button>
        <Button
          variant={showChat ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowChat(!showChat)}
          className="rounded-l-none"
          title="Chat with Aryn"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Chat
        </Button>
      </div>


      {/* Floating Chat Panel - Left Side */}
      {showChat && (
        <>
          {/* Backdrop - click to close */}
          <div 
            className="fixed inset-0 z-[99]" 
            onClick={() => setShowChat(false)}
          />
          
          {/* Chat Panel */}
          <div 
            className={`fixed w-96 bg-background/95 backdrop-blur-xl border rounded-xl shadow-2xl z-[100] flex flex-col overflow-hidden animate-in slide-in-from-left-5 duration-200 ${
              isDraggingChat ? 'cursor-move shadow-3xl' : ''
            }`}
            style={{
              left: `${chatPosition.x}px`,
              top: `${chatPosition.y}px`,
              height: 'calc(100vh - 120px)',
              maxHeight: '600px',
              transition: isDraggingChat ? 'none' : 'box-shadow 0.2s'
            }}
          >
          <div 
            className="p-4 border-b flex items-center justify-between bg-muted/30 cursor-move"
            onMouseDown={(e) => {
              setIsDraggingChat(true)
              dragStartPos.current = { x: e.clientX, y: e.clientY }
              dragStartChatPos.current = { ...chatPosition }
              e.preventDefault()
            }}
          >
            <h3 className="font-semibold select-none">Chat with Aryn</h3>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMessages([])
                    setChatInput('')
                  }}
                  className="text-xs"
                >
                  New chat
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowChat(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div 
            className="flex-1 overflow-y-auto 
              [&::-webkit-scrollbar]:w-[3px] 
              [&::-webkit-scrollbar-track]:bg-transparent 
              [&::-webkit-scrollbar-thumb]:bg-transparent
              [&::-webkit-scrollbar-thumb]:rounded-full 
              [&::-webkit-scrollbar-thumb]:transition-colors
              [&:hover::-webkit-scrollbar-thumb]:bg-muted-foreground/20
              [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30
              [scrollbar-width:thin] 
              [scrollbar-color:transparent_transparent]
              hover:[scrollbar-color:rgba(128,128,128,0.2)_transparent]
              scroll-smooth"
          >
            {messages.length === 0 ? (
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    I can help you understand and organize your blocks. Try asking me to arrange them by theme, style, or any other criteria.
                  </p>
                  {selectedBlocks.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-md p-2">
                      Selected: {selectedBlocks.length === 1 
                        ? `"${selectedBlocks[0].title || 'Untitled'}"` 
                        : `${selectedBlocks.length} blocks`}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wide text-center">Suggested actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Arrange in a timeline",
                      "What patterns do you see?", 
                      "Create a presentation",
                      "Show as a spiral"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setChatInput(suggestion);
                          // Auto-submit
                          setTimeout(() => {
                            const form = document.querySelector('form');
                            if (form) {
                              form.dispatchEvent(new Event('submit', { bubbles: true }));
                            }
                          }, 100);
                        }}
                        className="px-3 py-2 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {msg.content}
                      {msg.role === 'assistant' && !isLoading && (
                        <div className="mt-2 space-y-2">
                          {pendingArrangement && pendingArrangement.messageId === msg.id && (
                            <Button
                              onClick={executePendingArrangement}
                              size="sm"
                              disabled={isAnimating}
                              className="w-full"
                            >
                              {isAnimating ? 'Arranging...' : 'Execute Arrangement'}
                            </Button>
                          )}
                          <button
                            onClick={() => pinToCanvas(msg)}
                            className={`text-xs opacity-60 hover:opacity-100 transition-opacity block ${
                              pinnedMessages.has(msg.id) ? 'opacity-100' : ''
                            }`}
                          >
                            {pinnedMessages.has(msg.id) ? '✓ Pinned' : '📌 Pin to canvas'}
                          </button>
                        </div>
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

                // Check if this is an arrangement command
                const isArrangement = isArrangementCommand(userMessage.content)

                // Add spatial context to the message
                let spatialContext = ''
                if (selectedBlocks.length > 0) {
                  if (selectedBlocks.length === 1) {
                    spatialContext = `\n\n[Context: Currently looking at block "${selectedBlocks[0].title || 'Untitled'}" (${selectedBlocks[0].block_type})]`
                  } else {
                    const blockTitles = selectedBlocks.map(b => `"${b.title || 'Untitled'}" (${b.block_type})`).join(', ')
                    spatialContext = `\n\n[Context: Currently looking at ${selectedBlocks.length} blocks: ${blockTitles}]`
                  }
                }
                
                // Count visible blocks (rough estimate based on viewport)
                const visibleBlockCount = Object.keys(shapePositions).length
                if (visibleBlockCount > 0) {
                  spatialContext += `\n[${visibleBlockCount} blocks visible on canvas]`
                }

                // For arrangement commands, add detailed block information
                if (isArrangement) {
                  const blockDetails = blocks.map(b => ({
                    id: b.id,
                    title: b.title || 'Untitled',
                    type: b.block_type,
                    description: b.description?.substring(0, 100),
                    created_at: b.created_at
                  }))
                  
                  // Determine layout type from message
                  let layoutType = 'similarity'
                  const lowerMessage = userMessage.content.toLowerCase()
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const layoutParams: any = {}
                  
                  if (lowerMessage.includes('timeline') || 
                      lowerMessage.includes('chronological') ||
                      lowerMessage.includes('by date')) {
                    layoutType = 'timeline'
                  } else if (lowerMessage.includes('important') ||
                             lowerMessage.includes('larger') ||
                             lowerMessage.includes('emphasize')) {
                    layoutType = 'importance'
                  } else if (lowerMessage.includes('magazine') ||
                             lowerMessage.includes('editorial')) {
                    layoutType = 'magazine'
                  } else if (lowerMessage.includes('mood board') ||
                             lowerMessage.includes('moodboard') ||
                             lowerMessage.includes('collage')) {
                    layoutType = 'moodboard'
                  } else if (lowerMessage.includes('presentation') ||
                             lowerMessage.includes('slides') ||
                             lowerMessage.includes('deck')) {
                    layoutType = 'presentation'
                  } else if (lowerMessage.includes('shape of')) {
                    layoutType = 'shape'
                    // Extract shape name
                    const shapeMatch = lowerMessage.match(/shape of (\w+)/)
                    if (shapeMatch) {
                      layoutParams.shape = shapeMatch[1]
                    }
                  } else if (lowerMessage.includes('circle') ||
                             lowerMessage.includes('heart') ||
                             lowerMessage.includes('star') ||
                             lowerMessage.includes('spiral')) {
                    layoutType = 'shape'
                    if (lowerMessage.includes('circle')) layoutParams.shape = 'circle'
                    else if (lowerMessage.includes('heart')) layoutParams.shape = 'heart'
                    else if (lowerMessage.includes('star')) layoutParams.shape = 'star'
                    else if (lowerMessage.includes('spiral')) layoutParams.shape = 'spiral'
                  } else if (userMessage.content.startsWith('/supabase') ||
                             lowerMessage.includes('supabase') ||
                             lowerMessage.includes('lightning bolt')) {
                    layoutType = 'shape'
                    layoutParams.shape = 'supabase'
                  }
                  
                  spatialContext += `\n\n[ARRANGEMENT_REQUEST]\nCanvas blocks:\n${JSON.stringify(blockDetails, null, 2)}\n\nAnalyze these blocks and return ONLY a JSON object with this structure:\n{\n  "layoutType": "${layoutType}",\n  "groups": [\n    {\n      "theme": "Theme name",\n      "blockIds": [1, 2, 3],\n      "color": "blue"\n    }\n  ],\n  "layoutParams": ${JSON.stringify(layoutParams)}\n}\nFor timeline layouts, group all blocks in one group. For shape-based, mood board, magazine, and presentation layouts, group all blocks in one group. For similarity/importance layouts, group blocks by semantic similarity based on the user's request.`
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
                  isSpatialCanvas: true,
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
                          // In spatial canvas, we don't need to show the thumbnail reference
                          // since blocks are already visible on the canvas
                        }
                      } catch (e) {
                        // If JSON parsing fails, it might be a plain text chunk
                        console.warn('Failed to parse streaming chunk:', e)
                      }
                    }
                  }
                }
                
                // After streaming completes, check if this was an arrangement command
                if (isArrangement && assistantContent) {
                  // Try to extract JSON from the response
                  const jsonMatch = assistantContent.match(/\{[\s\S]*"groups"[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      const arrangementData = JSON.parse(jsonMatch[0]);
                      if (arrangementData.groups && Array.isArray(arrangementData.groups)) {
                        // Store the arrangement for user confirmation instead of auto-executing
                        setPendingArrangement({
                          groups: arrangementData.groups,
                          messageId: assistantMessage.id,
                          layoutType: arrangementData.layoutType || 'similarity',
                          layoutParams: arrangementData.layoutParams || {}
                        });
                      }
                    } catch (parseError) {
                      console.error('Failed to parse arrangement JSON:', parseError);
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
        </>
      )}

      {/* Block Detail Modal - Use portal to escape tldraw's event system */}
      {showModal && selectedBlock && typeof window !== 'undefined' && createPortal(
            <>
              {/* Backdrop with blur and darkening */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9998,
                  pointerEvents: 'auto'
                }}
                onMouseDown={() => setShowModal(false)}
              />
              
              {/* Modal Content */}
              <div 
                className="fixed inset-0 flex items-center justify-center"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 9999,
                  pointerEvents: 'none'
                }}
              >
                <div
                  className="animate-in zoom-in-95 fade-in-0 duration-200"
                  style={{
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => {
                    // Prevent closing when clicking inside modal
                    e.stopPropagation()
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
                  
                  {/* Content (only for text blocks) */}
                  {selectedBlock.content && selectedBlock.block_type === 'Text' && (
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
          </div>
        </div>
      </>,
      document.body
    )}
    </div>
  )
}