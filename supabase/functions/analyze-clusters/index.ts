// Deno Edge Function for semantic clustering analysis
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

// Simple k-means clustering implementation
function kMeansClustering(
  blocks: Array<{ id: number; embedding: number[] }>,
  k: number,
  maxIterations: number = 50
): { clusters: number[]; centroids: number[][] } {
  const n = blocks.length
  const dimensions = blocks[0].embedding.length
  
  // Initialize random centroids
  const centroids: number[][] = []
  const usedIndices = new Set<number>()
  
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n)
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx)
      centroids.push([...blocks[idx].embedding])
    }
  }
  
  let clusters = new Array(n).fill(0)
  let hasChanged = true
  let iteration = 0
  
  while (hasChanged && iteration < maxIterations) {
    hasChanged = false
    
    // Assign each block to nearest centroid
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity
      let bestCluster = 0
      
      for (let j = 0; j < k; j++) {
        // Calculate Euclidean distance
        let distance = 0
        for (let d = 0; d < dimensions; d++) {
          const diff = blocks[i].embedding[d] - centroids[j][d]
          distance += diff * diff
        }
        distance = Math.sqrt(distance)
        
        if (distance < minDistance) {
          minDistance = distance
          bestCluster = j
        }
      }
      
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
          for (let d = 0; d < dimensions; d++) {
            centroids[j][d] = clusterBlocks.reduce(
              (sum, block) => sum + block.embedding[d],
              0
            ) / clusterBlocks.length
          }
        }
      }
    }
    
    iteration++
  }
  
  return { clusters, centroids }
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
          content: `Based on these block titles and types, create a short 2-3 word label for this theme:
          
Titles: ${sampleTitles.join(', ')}
Types: ${uniqueTypes.join(', ')}

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

    // Calculate similarity matrix
    const similarities: Record<string, Record<string, number>> = {}
    
    for (let i = 0; i < blocks.length; i++) {
      const blockA = blocks[i]
      similarities[blockA.id] = {}
      
      for (let j = 0; j < blocks.length; j++) {
        if (i === j) {
          similarities[blockA.id][blocks[j].id] = 1 // Self-similarity is 1
        } else {
          const blockB = blocks[j]
          const similarity = cosineSimilarity(
            blockA.embedding as number[],
            blockB.embedding as number[]
          )
          similarities[blockA.id][blockB.id] = similarity
        }
      }
    }

    // Determine optimal number of clusters (between 3 and 7)
    const k = Math.min(Math.max(3, Math.floor(blocks.length / 7)), 7)
    
    // Run k-means clustering
    const { clusters } = kMeansClustering(blocks as any, k)
    
    // Group blocks by cluster
    const clusterGroups: Record<number, typeof blocks> = {}
    blocks.forEach((block, idx) => {
      const clusterId = clusters[idx]
      if (!clusterGroups[clusterId]) {
        clusterGroups[clusterId] = []
      }
      clusterGroups[clusterId].push(block)
    })
    
    // Generate labels for each cluster
    const clusterData = []
    
    for (const [clusterId, clusterBlocks] of Object.entries(clusterGroups)) {
      // Sample titles and content from cluster
      const sampleTitles = clusterBlocks
        .filter(b => b.title)
        .slice(0, 5)
        .map(b => b.title)
      
      const blockTypes = clusterBlocks.map(b => b.block_type)
      const uniqueTypes = [...new Set(blockTypes)]
      
      const label = await generateClusterLabel(sampleTitles, uniqueTypes)
      
      clusterData.push({
        id: parseInt(clusterId),
        label,
        blockIds: clusterBlocks.map(b => b.id),
        blockCount: clusterBlocks.length
      })
    }
    
    // Map each block to its cluster
    const blockClusters: Record<number, number> = {}
    blocks.forEach((block, idx) => {
      blockClusters[block.id] = clusters[idx]
    })

    const result = {
      similarities,
      blockIds: blocks.map(b => b.id),
      blockCount: blocks.length,
      clusters: clusterData,
      blockClusters,
      k
    }

    // Note: Caching disabled as Deno KV is not available
    // TODO: Implement alternative caching solution in future iteration

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-clusters function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})