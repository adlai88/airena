# Airena v2

Transform your curated Are.na channels into an intelligent AI agent that generates content from your own research.

## Overview

Airena enables you to:
- 🔗 **Connect** your Are.na channels  
- 🧠 **Transform** curated content into searchable knowledge
- ✍️ **Generate** AI-powered newsletters from your research
- 💬 **Chat** with your content to discover insights

**Core Value**: Your curation advantage becomes your intelligence advantage.

## Features

- **Newsletter Generation**: Create AI-powered content digests from your curated research
- **Intelligent Chat**: Ask questions and get contextual answers from your Are.na content
- **Vector Search**: Semantic search through your curated content using embeddings
- **Real-time Streaming**: See AI responses generate in real-time
- **Source Attribution**: Every insight includes links back to original sources

## Tech Stack

- **Frontend**: Next.js 15 + React + Tailwind CSS
- **Backend**: Next.js API Routes + Vercel Edge Functions  
- **Database**: Supabase with pgvector for vector storage
- **AI**: OpenAI GPT-4o-mini + text-embedding-3-small
- **Content Extraction**: Jina AI Reader API
- **Deployment**: Vercel + Supabase

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- Are.na account (free)
- Jina AI API key (optional, has free tier)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/airena.git
   cd airena
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your API keys in `.env.local`:
   ```env
   ARENA_API_KEY=your_arena_api_key
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JINA_API_KEY=your_jina_api_key
   ```

4. **Set up Supabase database**
   ```bash
   # Run database migrations
   psql $SUPABASE_URL < supabase/schema.sql
   psql $SUPABASE_URL < supabase/functions.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### 1. Connect Your Are.na Channel
- Go to the Setup page
- Enter your Are.na channel slug (e.g., "my-research-channel")
- Click "Sync Channel" to process and embed your content

### 2. Generate Newsletters
- Visit the Generate page
- Configure tone, length, and focus
- Click "Generate Newsletter" for AI-powered insights

### 3. Chat with Your Content
- Go to the Chat page
- Ask questions about your research
- Get contextual answers with source links

## Project Structure

```
airena/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API routes
│   │   ├── chat/           # Chat interface
│   │   ├── generate/       # Newsletter generation
│   │   └── setup/          # Channel setup
│   └── lib/                # Core libraries
│       ├── arena.ts        # Are.na API client
│       ├── embeddings.ts   # OpenAI embeddings
│       ├── extraction.ts   # Content extraction
│       ├── supabase.ts     # Database client
│       ├── sync.ts         # Channel sync service
│       └── templates.ts    # AI prompt templates
├── supabase/               # Database schema & functions
└── public/                 # Static assets
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing utilities
npm run test:setup   # Test API integrations
npm run test:arena   # Test Are.na API client
npm run test:pipeline # Test full sync pipeline
```

## Security

- All API keys are stored in environment variables
- `.env.local` is automatically ignored by git
- No sensitive data is committed to the repository
- Database uses Supabase Row Level Security (when configured)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

Built with ❤️ for the Are.na community
