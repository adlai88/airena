// Edge Function for generating embeddings using Supabase AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    if (!text) {
      throw new Error('Text is required');
    }
    
    // Generate embedding using Supabase AI
    // @ts-ignore - Supabase global is available in Edge Functions
    const model = new Supabase.ai.Session('gte-small')
    const embedding = await model.run(text, {
      mean_pool: true,
      normalize: true,
    })
    
    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating embedding:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})