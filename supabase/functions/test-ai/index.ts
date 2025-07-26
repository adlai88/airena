// Test Edge Function for Supabase AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    console.log('Testing Supabase AI with text:', text)
    
    // Try to use Supabase AI
    try {
      // @ts-ignore - Supabase global is available in Edge Functions
      const model = new Supabase.ai.Session('gte-small')
      const embedding = await model.run(text, {
        mean_pool: true,
        normalize: true,
      })
      
      return new Response(
        JSON.stringify({ 
          success: true,
          embedding: embedding,
          dimensions: embedding.length,
          provider: 'Supabase AI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (aiError) {
      console.error('Supabase AI error:', aiError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: aiError.message,
          provider: 'Supabase AI (failed)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})