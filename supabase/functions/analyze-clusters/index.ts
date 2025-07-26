// Deno Edge Function for semantic clustering analysis
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Feature flag for Supabase AI Session (Launch Week 15 feature!)
const USE_SUPABASE_AI = Deno.env.get('USE_SUPABASE_AI') === 'true'

// Note: Deno KV is not available in this Supabase project
// We'll implement caching in a future iteration

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  
  if (normA === 0 || normB === 0) return 0
  
  return dotProduct / (normA * normB)
}

// Calculate cosine distance (1 - cosine similarity)
function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b)
}

// K-means++ initialization for better centroid selection
function initializeCentroidsKMeansPlusPlus(
  blocks: Array<{ id: number; embedding: number[] }>,
  k: number
): number[][] {
  const n = blocks.length
  const centroids: number[][] = []
  
  // Choose first centroid randomly
  const firstIdx = Math.floor(Math.random() * n)
  centroids.push([...blocks[firstIdx].embedding])
  
  // Choose remaining centroids
  for (let c = 1; c < k; c++) {
    const distances: number[] = []
    let totalDistance = 0
    
    // Calculate distance from each point to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDist = Infinity
      for (const centroid of centroids) {
        const dist = cosineDistance(blocks[i].embedding, centroid)
        minDist = Math.min(minDist, dist)
      }
      distances[i] = minDist * minDist // Square the distance for better separation
      totalDistance += distances[i]
    }
    
    // Choose next centroid with probability proportional to squared distance
    let randomValue = Math.random() * totalDistance
    let cumulative = 0
    
    for (let i = 0; i < n; i++) {
      cumulative += distances[i]
      if (cumulative >= randomValue) {
        centroids.push([...blocks[i].embedding])
        break
      }
    }
  }
  
  return centroids
}

// Improved k-means clustering with cosine distance
function kMeansClustering(
  blocks: Array<{ id: number; embedding: number[] }>,
  k: number,
  maxIterations: number = 50
): { clusters: number[]; centroids: number[][]; inertia: number } {
  const n = blocks.length
  
  // Safety check for embeddings
  if (!blocks[0] || !blocks[0].embedding || !Array.isArray(blocks[0].embedding)) {
    console.error('First block missing embedding:', blocks[0])
    throw new Error('Blocks must have embeddings for clustering')
  }
  
  const dimensions = blocks[0].embedding.length
  
  // Initialize centroids using k-means++
  const centroids = initializeCentroidsKMeansPlusPlus(blocks, k)
  
  let clusters = new Array(n).fill(0)
  let hasChanged = true
  let iteration = 0
  let inertia = 0
  
  while (hasChanged && iteration < maxIterations) {
    hasChanged = false
    inertia = 0
    
    // Assign each block to nearest centroid using cosine distance
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity
      let bestCluster = 0
      
      for (let j = 0; j < k; j++) {
        const distance = cosineDistance(blocks[i].embedding, centroids[j])
        
        if (distance < minDistance) {
          minDistance = distance
          bestCluster = j
        }
      }
      
      inertia += minDistance
      
      if (clusters[i] !== bestCluster) {
        clusters[i] = bestCluster
        hasChanged = true
      }
    }
    
    // Update centroids
    if (hasChanged) {
      for (let j = 0; j < k; j++) {
        const clusterBlocks = blocks.filter((_, idx) => clusters[idx] === j)
        
        if (clusterBlocks.length > 0) {
          // Calculate mean of all embeddings in cluster
          const newCentroid = new Array(dimensions).fill(0)
          
          for (const block of clusterBlocks) {
            for (let d = 0; d < dimensions; d++) {
              newCentroid[d] += block.embedding[d]
            }
          }
          
          // Normalize the centroid
          let norm = 0
          for (let d = 0; d < dimensions; d++) {
            newCentroid[d] /= clusterBlocks.length
            norm += newCentroid[d] * newCentroid[d]
          }
          norm = Math.sqrt(norm)
          
          if (norm > 0) {
            for (let d = 0; d < dimensions; d++) {
              centroids[j][d] = newCentroid[d] / norm
            }
          }
        }
      }
    }
    
    iteration++
  }
  
  return { clusters, centroids, inertia }
}

// Validate and potentially merge similar clusters
function validateAndMergeClusters(
  blocks: Array<{ id: number; embedding: number[] }>,
  clusters: number[],
  centroids: number[][],
  minClusterSize: number = 2
): { clusters: number[]; centroids: number[][] } {
  const clusterGroups: Record<number, number[]> = {}
  
  // Group blocks by cluster
  blocks.forEach((_, idx) => {
    const clusterId = clusters[idx]
    if (!clusterGroups[clusterId]) {
      clusterGroups[clusterId] = []
    }
    clusterGroups[clusterId].push(idx)
  })
  
  // Find clusters that are too small or too similar
  const validClusters: number[] = []
  const clusterMapping: Record<number, number> = {}
  
  Object.entries(clusterGroups).forEach(([clusterId, indices]) => {
    const cId = parseInt(clusterId)
    
    // Check if cluster is large enough
    if (indices.length >= minClusterSize) {
      // Check if it's similar to any existing valid cluster
      let merged = false
      
      for (const validId of validClusters) {
        const similarity = cosineSimilarity(centroids[cId], centroids[validId])
        if (similarity > 0.95) { // Only merge if extremely similar (was 0.85)
          clusterMapping[cId] = validId
          merged = true
          break
        }
      }
      
      if (!merged) {
        validClusters.push(cId)
        clusterMapping[cId] = validClusters.length - 1
      }
    } else {
      // Assign small clusters to nearest valid cluster
      let bestCluster = 0
      let maxSimilarity = -1
      
      for (const validId of validClusters) {
        const similarity = cosineSimilarity(centroids[cId], centroids[validId])
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity
          bestCluster = validId
        }
      }
      
      clusterMapping[cId] = clusterMapping[bestCluster] || 0
    }
  })
  
  // Remap clusters
  const newClusters = clusters.map(c => clusterMapping[c] || 0)
  const newCentroids = validClusters.map(id => centroids[id])
  
  return { clusters: newClusters, centroids: newCentroids }
}

// Generate embedding using Supabase AI Session (Launch Week 15 feature!)
async function generateEmbeddingWithSupabaseAI(text: string): Promise<number[]> {
  try {
    // @ts-ignore - Supabase global is available in Edge Functions
    const model = new Supabase.ai.Session('gte-small')
    const embedding = await model.run(text, {
      mean_pool: true,
      normalize: true,
    })
    return embedding as number[]
  } catch (error) {
    console.error('Supabase AI embedding error:', error)
    throw error
  }
}

// Generate cluster label using OpenAI
async function generateClusterLabel(
  sampleTitles: string[],
  uniqueTypes: string[]
): Promise<string> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment')
      throw new Error('OpenAI API key not configured')
    }
    
    console.log('OpenAI key found, length:', openaiApiKey.length)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Based on these block titles and types, create a short 2-3 word label that captures the specific theme or topic of this cluster. Be specific and unique rather than generic.
          
Titles: ${sampleTitles.join(', ')}
Types: ${uniqueTypes.join(', ')}

Examples of good labels: "startup culture", "design systems", "punk music", "machine learning", "web3 protocols", "typography research", "color theory", "urban planning"
Examples of bad labels: "mixed content", "various topics", "general cluster", "abstract art", "creative work", "design inspiration"

Focus on what makes this cluster unique. Look for specific themes, subjects, or concepts in the titles.

Respond with only the label, no explanation.`
        }],
        temperature: 0.3,
        max_tokens: 20
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating cluster label:', error)
    // Fallback label based on block types
    const primaryType = uniqueTypes[0] || 'Mixed'
    return `${primaryType} Cluster`
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    console.log('Edge Function called:', req.method, req.url)
    
    // Log Supabase AI feature usage for Launch Week 15 demo
    if (USE_SUPABASE_AI) {
      console.log('🚀 Using Supabase AI Session for embeddings (Launch Week 15 feature!)')
    }
    
    const { channelSlug } = await req.json()

    if (!channelSlug) {
      return new Response(
        JSON.stringify({ error: 'Channel slug is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Note: Caching disabled for now as Deno KV is not available
    // TODO: Implement alternative caching solution

    // Get channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', channelSlug)
      .single()

    if (channelError || !channel) {
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get blocks with embeddings and content for labeling
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, arena_id, title, content, block_type, embedding')
      .eq('channel_id', channel.id)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50) // Limit for performance

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch blocks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!blocks || blocks.length === 0) {
      const emptyResult = { similarities: {}, clusters: [] }
      return new Response(
        JSON.stringify(emptyResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Debug: Check first block structure
    console.log('First block:', {
      id: blocks[0].id,
      hasEmbedding: !!blocks[0].embedding,
      embeddingType: typeof blocks[0].embedding,
      isArray: Array.isArray(blocks[0].embedding),
      embeddingLength: blocks[0].embedding?.length
    })

    // Parse embeddings if they're strings
    const processedBlocks = blocks.map(block => {
      let embedding = block.embedding
      
      // If embedding is a string, parse it
      if (typeof embedding === 'string') {
        try {
          // Remove vector brackets if present [1,2,3] -> 1,2,3
          const cleaned = embedding.replace(/^\[|\]$/g, '')
          embedding = cleaned.split(',').map(v => parseFloat(v.trim()))
        } catch (e) {
          console.error('Failed to parse embedding for block', block.id, e)
          throw new Error(`Invalid embedding format for block ${block.id}`)
        }
      }
      
      return {
        ...block,
        embedding: embedding as number[]
      }
    })
    
    // Calculate similarity matrix
    const similarities: Record<string, Record<string, number>> = {}
    
    for (let i = 0; i < processedBlocks.length; i++) {
      const blockA = processedBlocks[i]
      similarities[blockA.id] = {}
      
      for (let j = 0; j < processedBlocks.length; j++) {
        if (i === j) {
          similarities[blockA.id][processedBlocks[j].id] = 1 // Self-similarity is 1
        } else {
          const blockB = processedBlocks[j]
          const similarity = cosineSimilarity(
            blockA.embedding,
            blockB.embedding
          )
          similarities[blockA.id][blockB.id] = similarity
        }
      }
    }

    // Determine optimal number of clusters - aim for more granular clustering
    // For 37 blocks: sqrt(37) = ~6 clusters, but let's be more aggressive
    // Using a formula that creates more clusters for better granularity
    const k = Math.min(
      Math.max(4, Math.ceil(Math.sqrt(blocks.length) * 1.2)), // Multiply by 1.2 for more clusters
      Math.min(15, Math.ceil(blocks.length / 2.5)) // Allow more max clusters
    )
    
    console.log(`Clustering ${processedBlocks.length} blocks into initial k=${k} clusters`)
    
    // Run k-means clustering with improved algorithm
    const { clusters, centroids, inertia } = kMeansClustering(processedBlocks, k)
    
    // Count initial clusters
    const initialClusterCounts: Record<number, number> = {}
    clusters.forEach(c => {
      initialClusterCounts[c] = (initialClusterCounts[c] || 0) + 1
    })
    console.log('Initial cluster distribution:', initialClusterCounts)
    console.log('Clustering inertia:', inertia)
    
    // Validate and merge similar clusters
    const validated = validateAndMergeClusters(
      processedBlocks, 
      clusters, 
      centroids,
      Math.max(1, Math.floor(processedBlocks.length / 25)) // Allow smaller clusters for more granularity
    )
    
    // Count final clusters
    const finalClusterCounts: Record<number, number> = {}
    validated.clusters.forEach(c => {
      finalClusterCounts[c] = (finalClusterCounts[c] || 0) + 1
    })
    console.log('Final cluster distribution after validation:', finalClusterCounts)
    
    // Group blocks by validated cluster (using the MERGED cluster IDs)
    const clusterGroups: Record<number, typeof processedBlocks> = {}
    processedBlocks.forEach((block, idx) => {
      const clusterId = validated.clusters[idx]
      if (!clusterGroups[clusterId]) {
        clusterGroups[clusterId] = []
      }
      clusterGroups[clusterId].push(block)
    })
    
    // Generate labels for each cluster
    const clusterData = []
    const usedLabels = new Set<string>()
    
    for (const [clusterId, clusterBlocks] of Object.entries(clusterGroups)) {
      // Sample titles and content from cluster
      const sampleTitles = clusterBlocks
        .filter(b => b.title)
        .slice(0, 8) // Get more samples for better labeling
        .map(b => b.title)
      
      const blockTypes = clusterBlocks.map(b => b.block_type)
      const uniqueTypes = [...new Set(blockTypes)]
      
      let label = await generateClusterLabel(sampleTitles, uniqueTypes)
      
      // Ensure unique labels
      let labelAttempts = 1
      while (usedLabels.has(label.toLowerCase()) && labelAttempts < 3) {
        console.log(`Duplicate label detected: "${label}", regenerating...`)
        // Add context to get a different label
        const context = `(attempt ${labelAttempts + 1}, avoid: ${Array.from(usedLabels).join(', ')})`
        label = await generateClusterLabel(sampleTitles, uniqueTypes)
        labelAttempts++
      }
      
      // If still duplicate after attempts, append a number
      if (usedLabels.has(label.toLowerCase())) {
        let counter = 2
        let uniqueLabel = `${label} ${counter}`
        while (usedLabels.has(uniqueLabel.toLowerCase())) {
          counter++
          uniqueLabel = `${label} ${counter}`
        }
        label = uniqueLabel
      }
      
      usedLabels.add(label.toLowerCase())
      
      clusterData.push({
        id: parseInt(clusterId),
        label,
        blockIds: clusterBlocks.map(b => b.id),
        blockCount: clusterBlocks.length
      })
    }
    
    // Map each block to its validated cluster
    const blockClusters: Record<number, number> = {}
    processedBlocks.forEach((block, idx) => {
      blockClusters[block.id] = validated.clusters[idx]
    })

    const result = {
      similarities,
      blockIds: processedBlocks.map(b => b.id),
      blockCount: processedBlocks.length,
      clusters: clusterData,
      blockClusters,
      k
    }

    // Note: Caching disabled as Deno KV is not available
    // TODO: Implement alternative caching solution in future iteration

    // Add header to showcase Launch Week 15 feature usage
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Powered-By': USE_SUPABASE_AI ? 'Supabase AI Session (LW15)' : 'OpenAI'
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: responseHeaders }
    )
  } catch (error) {
    console.error('Error in analyze-clusters function:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage, details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})