# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Aryn spatial canvas project.

## Functions

### analyze-clusters

Performs semantic clustering analysis on channel blocks using k-means clustering and GPT-4 labels.

**Features:**
- K-means clustering with pgvector embeddings
- GPT-4 generated cluster labels
- Deno KV caching (1-hour cache)
- 97% faster boot times with Deno 2.1
- CORS support for browser requests

**Deployment:**

1. Set required environment variables:
```bash
supabase secrets set OPENAI_API_KEY=your-openai-key
```

2. Deploy the function:
```bash
supabase functions deploy analyze-clusters
```

3. Test locally:
```bash
supabase functions serve analyze-clusters
```

**Usage:**

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-clusters`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    channelSlug: 'your-channel-slug'
  })
})

const data = await response.json()
// Returns: { similarities, clusters, blockClusters, k }
```

**Benefits over API Route:**
- Edge deployment for lower latency
- Persistent caching with Deno KV
- Better scalability for hackathon demo
- Showcases Supabase Edge Functions v2 features