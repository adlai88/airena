# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Airena v2 - Implementation Plan

## Project Overview

Airena transforms curated are.na channels into an intelligence agent that generates content from your own research. Instead of searching through bookmarks manually, users can generate newsletters, reports, and insights using AI powered by their personally curated content.

**Core Value**: Your curation advantage becomes your intelligence advantage.

## MVP Architecture

### Tech Stack
- **Frontend**: React with Vercel AI SDK (`useChat`, `useCompletion`)
- **Backend**: Node.js + Vercel Edge Functions  
- **Database**: Supabase with pgvector for vector storage
- **AI**: OpenAI embeddings + completions via Vercel AI SDK
- **Content Extraction**: Jina AI for websites (MVP focus)
- **Payments**: Polar.sh (later phase)
- **Deployment**: Vercel + Supabase

## Application Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React)       │    │   (Vercel)      │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Setup Page    │◄──►│ • API Routes    │◄──►│ • Are.na API    │
│ • Generation    │    │ • Edge Functions│    │ • Jina AI       │
│ • Chat Interface│    │ • Sync Service  │    │ • OpenAI        │
│ • AI SDK Hooks  │    │ • Vector Search │    │ • Supabase      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Architecture
```
1. User Input → Channel Slug
2. Are.na API → Fetch Channel & Blocks
3. Jina AI → Extract Website Content
4. OpenAI → Generate Embeddings
5. Supabase → Store Vectors & Metadata
6. User Query → Vector Search → Context Retrieval
7. OpenAI + Context → Generate Response
8. Vercel AI SDK → Stream to Frontend
```

### Core Components

#### 1. **Content Ingestion Pipeline**
- **Are.na Client**: Fetches channel metadata and blocks
- **Content Extractor**: Processes website URLs via Jina AI
- **Embedding Service**: Creates vector representations
- **Sync Service**: Orchestrates the entire pipeline

#### 2. **Vector Knowledge Base**
- **Supabase Database**: Stores blocks, embeddings, and metadata
- **Vector Search**: Semantic similarity using pgvector
- **Context Builder**: Assembles relevant content for AI generation

#### 3. **AI Generation Layer**
- **Template Engine**: Structured prompts for different output types
- **Streaming Service**: Real-time response generation
- **Context Management**: Maintains conversation state

#### 4. **Frontend Interface**
- **Setup Flow**: Channel connection and sync monitoring
- **Generation Interface**: Template-based content creation
- **Chat Interface**: Conversational knowledge base queries
- **Real-time Updates**: Streaming responses via AI SDK

### Database Schema
```sql
channels (
  id, arena_id, title, slug, 
  user_id, last_sync, created_at
)

blocks (
  id, arena_id, channel_id, title, 
  description, content, url, block_type,
  created_at, updated_at, embedding[1536]
)

-- Future: users, generations, chat_sessions
```

### API Architecture
```
/api/
├── sync/           # Channel synchronization
├── generate/       # Content generation (streaming)
├── chat/          # Conversational interface (streaming)
├── search/        # Vector similarity search
└── channels/      # Channel management
```

### MVP Scope (Single Channel, Websites Only)
1. Connect one are.na channel
2. Extract and process website content only
3. Generate embeddings and store in vector database
4. One generation template (newsletter digest)
5. Basic chat interface for querying content
6. Streaming responses for real-time feedback

## Implementation Steps

### Phase 1: Project Setup (Week 1)

#### 1.1 Initialize Project
```bash
# Create Next.js app with TypeScript
npx create-next-app@latest airena --typescript --tailwind --eslint --app
cd airena

# Install core dependencies
npm install ai @ai-sdk/openai
npm install @supabase/supabase-js
npm install axios cheerio

# Install dev dependencies
npm install -D @types/cheerio
```

#### 1.2 Environment Configuration
Create `.env.local`:
```
ARENA_API_KEY=your_arena_api_key
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JINA_API_KEY=your_jina_api_key
```

#### 1.3 Supabase Setup
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create blocks table
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER UNIQUE NOT NULL,
    channel_id INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,
    url TEXT,
    block_type TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

-- Create index for vector similarity search
CREATE INDEX blocks_embedding_idx ON blocks USING ivfflat (embedding vector_cosine_ops);

-- Create channels table
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    user_id TEXT,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: Are.na Integration (Week 1-2)

#### 2.1 Are.na API Client (`lib/arena.ts`)
```typescript
interface ArenaBlock {
  id: number;
  title: string;
  description: string;
  source_url: string;
  class: 'Link' | 'Text' | 'Image' | 'Media';
  created_at: string;
  updated_at: string;
}

interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  contents: ArenaBlock[];
}

class ArenaClient {
  async getChannel(slug: string): Promise<ArenaChannel>
  async getChannelContents(id: number): Promise<ArenaBlock[]>
}
```

#### 2.2 Content Extraction Service (`lib/extraction.ts`)
```typescript
class ContentExtractor {
  async extractWebsite(url: string): Promise<string> {
    // Use Jina AI Reader API
    // https://jina.ai/reader/
    // GET https://r.jina.ai/{url}
  }
  
  async processBlock(block: ArenaBlock): Promise<ProcessedBlock> {
    // Only handle Link blocks for MVP
    // Extract full content using Jina AI
  }
}
```

### Phase 3: Vector Database Pipeline (Week 2)

#### 3.1 Embedding Service (`lib/embeddings.ts`)
```typescript
import { openai } from '@ai-sdk/openai';

class EmbeddingService {
  async createEmbedding(text: string): Promise<number[]> {
    // Use OpenAI text-embedding-3-small
    // Chunk text if longer than 8000 tokens
  }
  
  async storeBlock(block: ProcessedBlock): Promise<void> {
    // Store in Supabase with embedding
  }
}
```

#### 3.2 Sync Service (`lib/sync.ts`)
```typescript
class SyncService {
  async syncChannel(channelSlug: string): Promise<void> {
    // 1. Fetch channel from are.na
    // 2. Get existing blocks from database
    // 3. Process new/updated blocks
    // 4. Extract content for website blocks
    // 5. Generate embeddings
    // 6. Store in database
  }
}
```

### Phase 4: AI Generation (Week 3)

#### 4.1 API Route for Generation (`app/api/generate/route.ts`)
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { prompt, channelId } = await req.json();
  
  // 1. Get relevant blocks using vector similarity
  // 2. Build context from retrieved blocks
  // 3. Generate response using streamText
  // 4. Return streaming response
}
```

#### 4.2 Newsletter Template (`lib/templates.ts`)
```typescript
const NEWSLETTER_TEMPLATE = `
You are creating a newsletter digest from curated research blocks.

Context from research:
{context}

Create a newsletter with:
1. Executive summary (2-3 sentences)
2. Key insights (3-5 bullet points)
3. Notable resources (2-3 items with descriptions)
4. One actionable takeaway

Style: Professional but conversational, like a research analyst sharing insights.
`;
```

### Phase 5: Frontend Interface (Week 3-4)

#### 5.1 Channel Setup Page (`app/setup/page.tsx`)
```typescript
export default function SetupPage() {
  // Form to input are.na channel slug
  // Trigger sync process
  // Show sync progress
}
```

#### 5.2 Generation Interface (`app/generate/page.tsx`)
```typescript
import { useCompletion } from 'ai/react';

export default function GeneratePage() {
  const { completion, input, handleSubmit, isLoading } = useCompletion({
    api: '/api/generate',
  });
  
  // Newsletter generation form
  // Real-time streaming output
  // Save/export functionality
}
```

#### 5.3 Chat Interface (`app/chat/page.tsx`)
```typescript
import { useChat } from 'ai/react';

export default function ChatPage() {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  
  // Conversational interface
  // Query knowledge base
  // Show source blocks
}
```

### Phase 6: Chat Implementation (Week 4)

#### 6.1 Chat API Route (`app/api/chat/route.ts`)
```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // 1. Get last user message
  // 2. Vector search for relevant blocks
  // 3. Build context with retrieved content
  // 4. Generate streaming response
  // 5. Include source attribution
}
```

## 🚀 Current Implementation Status

### ✅ **COMPLETED PHASES (Fully Tested & Working)**

#### **Phase 1: Project Setup** 
- Next.js 15 with TypeScript and Tailwind CSS
- All dependencies installed: AI SDK, Supabase, content extraction tools
- Environment variables configured
- Database schema deployed in Supabase with pgvector extension

#### **Phase 2: Are.na Integration**
- Complete Are.na API client (`lib/arena.ts`)
- Handles authentication and rate limiting
- Fetches detailed block info to access source URLs
- Content extraction service (`lib/extraction.ts`) with Jina AI + fallbacks
- **Tested with real channel**: Successfully processed 8 link blocks

#### **Phase 3: Vector Database Pipeline** 
- OpenAI embedding service (`lib/embeddings.ts`)
- Complete sync service (`lib/sync.ts`) with progress tracking
- Vector similarity search with Supabase pgvector
- **Real Data**: 8 startup/founder-mode articles embedded and stored

#### **Phase 4: AI Generation** ✅ **COMPLETED**
- Intelligent prompt templates with customizable options (`lib/templates.ts`)
- Streaming newsletter generation API (`src/app/api/generate/route.ts`)
- Streaming chat API with vector search (`src/app/api/chat/route.ts`)
- Channel sync API endpoint (`src/app/api/sync/route.ts`)
- Complete frontend interface:
  - **Home page** (`src/app/page.tsx`) - Landing with feature overview
  - **Setup page** (`src/app/setup/page.tsx`) - Channel sync interface
  - **Generate page** (`src/app/generate/page.tsx`) - Newsletter creation with streaming
  - **Chat page** (`src/app/chat/page.tsx`) - Interactive Q&A with research

#### **Phase 5: Production Deployment** ✅ **COMPLETED**
- Fixed all TypeScript and ESLint errors for Vercel deployment
- Implemented Next.js 15 Suspense boundaries for `useSearchParams()` usage
- Replaced `force-dynamic` exports with proper static generation
- Code quality improvements: proper typing, removed unused variables
- **Successfully deployed to Vercel**: https://airena-ku2c5uzys-adlai88s-projects.vercel.app/

### 🎉 **MVP COMPLETE & DEPLOYED WITH PROFESSIONAL UI**
**Full end-to-end application working in production:**
- Real-time streaming AI responses
- Vector search for contextual content retrieval
- Source attribution with URLs
- **✅ Fixed digest generation**: Now properly uses real channel content (10 embedded articles from r-startups-founder-mode)
- **✨ Professional shadcn/ui design system**
- **🎨 Consistent navigation and footer across all pages**
- **📱 Mobile-responsive template-based workflows**
- **🔧 Resolved Supabase connection issues in generate API**
- **Live deployment**: https://airena-ku2c5uzys-adlai88s-projects.vercel.app/

## 🚀 Quick Start Guide

1. **Start the app**: `npm run dev`
2. **Visit**: http://localhost:3000
3. **Try the demo**: Click "r-startups-founder-mode" link to test with existing data
4. **Or sync new channel**: Click "Get Started" → enter your Are.na channel slug

## User Journey

### **Home Page** (`/`)
- Landing page with feature overview
- Direct link to demo channel (already has data)
- Navigation to setup, generate, or chat

### **Setup Page** (`/setup`)  
- Enter Are.na channel slug or URL
- Sync process with progress tracking
- Automatically redirects to generate page on success

### **Generate Page** (`/generate`)
- Configure newsletter options (tone, length, focus)
- Real-time streaming AI generation
- Copy to clipboard functionality
- Switch to chat interface

### **Chat Page** (`/chat`)
- Interactive Q&A with your research
- Suggested questions to get started
- Streaming responses with source attribution
- Switch back to generation mode

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check

# Testing commands
npm run test:setup        # Test all API integrations
npm run test:arena        # Test Are.na API client
npm run test:pipeline     # Test full pipeline with auto-discovery
npm run test:channel      # Test specific channel sync
npm run debug:channel     # Debug channel contents and block types

# Frontend development
npm run dev               # Start development server at localhost:3000
```

## Key Implementation Notes

### Vector Search Strategy
- Use cosine similarity for semantic search
- Implement hybrid search (embeddings + keyword) for better results
- Chunk long content (max 8000 tokens per embedding)
- Store original URLs for source attribution

### Content Processing Pipeline
1. **Fetch**: Get blocks from are.na API
2. **Filter**: Only process Link blocks (websites) for MVP
3. **Extract**: Use Jina AI to get full content
4. **Chunk**: Split long content into manageable pieces
5. **Embed**: Generate OpenAI embeddings
6. **Store**: Save to Supabase with metadata

### Streaming UX
- Use Vercel AI SDK for real-time generation
- Show progress indicators during content processing
- Provide immediate feedback for user actions
- Handle errors gracefully with retry options

### Performance Considerations
- Cache are.na API responses
- Implement rate limiting for API calls
- Use Edge Functions for faster response times
- Optimize vector search with proper indexing

## Testing Strategy

### Unit Tests
- Content extraction functions
- Embedding generation
- Vector search queries

### Integration Tests
- Are.na API integration
- Supabase database operations
- End-to-end content processing

### Manual Testing Checklist
- [ ] Channel sync works with real are.na channel
- [ ] Content extraction produces readable text
- [ ] Vector search returns relevant results
- [ ] Newsletter generation includes source attribution
- [ ] Chat interface responds contextually
- [ ] Streaming works without interruptions

## Deployment

### Vercel Deployment
```bash
# Deploy to Vercel
npx vercel --prod

# Environment variables needed:
# ARENA_API_KEY
# OPENAI_API_KEY
# SUPABASE_URL
# SUPABASE_ANON_KEY
# JINA_API_KEY
```

### Supabase Configuration
- Enable Row Level Security
- Set up proper database indexes
- Configure connection pooling
- Monitor usage and performance

## Success Metrics for MVP

### Technical Metrics
- Channel sync time < 2 minutes
- First token generation < 2 seconds
- Vector search response < 500ms
- 99% uptime

### User Experience Metrics
- Setup completion rate > 80%
- Generated content quality (manual review)
- Chat relevance (source attribution accuracy)
- User retention for second generation

## 🔄 Current Status (January 2025)

### ✅ **PRODUCTION READY WITH CONSISTENT DESIGN SYSTEM**
- **Live Application**: https://airena-ku2c5uzys-adlai88s-projects.vercel.app/
- **Full MVP**: All core features working end-to-end
- **Code Quality**: TypeScript strict mode, ESLint clean, Next.js 15 compliant
- **Demo Data**: Pre-loaded with startup/founder-mode research for testing
- **✨ NEW: Consistent Layout System**: Standardized headers, typography, and spacing across all pages
- **✨ NEW: Improved Navigation**: Theme toggle consistently positioned, clean design

### 📋 **Design System Completed**
- **Reusable Components**: PageHeader component with flexible variants
- **Typography Hierarchy**: Consistent `text-4xl` headers and `text-xl` subtitles
- **Spacing Standards**: Unified vertical rhythm with `py-12` containers
- **Build Quality**: Zero ESLint errors, successful Vercel deployments

## 📋 Phase 6: UI Enhancement Implementation Plan

### **🎯 Goals & Scope**
- Gradually migrate from basic Tailwind to professional shadcn/ui component system
- Improve homepage messaging and overall app styling
- Add post-sync options page for Generate/Chat mode selection
- Implement template-based generation starting with "Digest" template
- Maintain production stability throughout migration

### **🏗️ Component Migration Strategy**
- **Incremental Approach**: Replace components page-by-page, feature-by-feature
- **Foundation First**: Install shadcn/ui and core components before page updates
- **High-Impact Priority**: Focus on user-facing pages (home, generate, chat)
- **Testing**: Verify each migration works before moving to next component

### **📈 Implementation Phases** - ✅ **ALL PHASES COMPLETE**

> **🎉 SUCCESS**: Full UI enhancement completed! The app now features a professional shadcn/ui design system with consistent navigation, styling, and user experience across all pages.

#### **Phase 6.1: Foundation Setup** ✅ **COMPLETED**
**Goal**: Install component library and update homepage
- [x] Install and configure shadcn/ui component library
- [x] Set up base components: Button, Card, Input, Select
- [x] Update homepage with v0 messaging and styling
- [x] Test build and deployment
- **Success Criteria**: ✅ Homepage shows new messaging, build passes, components work

#### **Phase 6.2: Core User Flow** ✅
**Goal**: Implement post-sync options and Digest template
- [x] Create post-sync options page (Generate vs Chat mode selection)
- [x] Update setup page to redirect to options after sync
- [x] Design Digest template system for generate page
- [x] Implement template selection UI with Digest as first option
- [x] Multi-stage workflow (template-selection → customization → generation → result)
- [x] Fixed ESLint errors and successful build
- **Success Criteria**: ✅ Users can choose Generate/Chat, Digest template works

#### **Phase 6.3: Generate Page Enhancement** ✅
**Goal**: Complete template-based generation experience
- [x] Replace generate page with template-driven interface
- [x] Implement Digest template with structured prompts
- [x] Add template customization options (tone, length, focus)
- [x] Improve streaming UI with better loading states
- **Success Criteria**: ✅ Digest generates better output than current free-form

#### **Phase 6.4: Chat Page Enhancement** ✅
**Goal**: Apply new styling to chat interface
- [x] Update chat page with shadcn/ui components
- [x] Improve message display and input styling
- [x] Add better loading states and error handling
- [x] Enhance suggested questions UI
- **Success Criteria**: ✅ Chat interface matches new design system

#### **Phase 6.5: Setup Page Enhancement** ✅
**Goal**: Improve onboarding experience
- [x] Add progress tracking during sync process
- [x] Better error handling and user feedback
- [x] Improve form styling and validation
- [x] Add channel preview/stats after sync
- **Success Criteria**: ✅ Sync process feels more guided and professional

#### **Phase 6.6: Navigation & Layout** ✅
**Goal**: Complete design system implementation
- [x] Add proper header navigation (without auth for now)
- [x] Implement footer with standard links
- [x] Ensure consistent styling across all pages
- [x] Mobile responsiveness testing
- **Success Criteria**: ✅ Cohesive design throughout app

#### **Phase 6.7: Layout System Standardization** ✅ **COMPLETED**
**Goal**: Implement consistent header typography and spacing across all pages
- [x] **Created reusable PageHeader component** (`src/components/page-header.tsx`)
  - Consistent `text-4xl font-bold` headers with `text-xl` subtitles
  - Standardized spacing: `mb-6` header, `mb-8` subtitle, `py-12` container
  - Flexible container variants: `narrow`, `standard`, `wide`
- [x] **Updated Setup page** - Uses PageHeader with narrow variant for focused layout
- [x] **Updated Generate page** - Consistent headers across all 4 stages (template selection, customization, generation, result)
- [x] **Updated Chat page** - Clean header with standard typography
- [x] **Updated Options page** - Unified with consistent styling
- [x] **Fixed theme toggle positioning** - Consistently on left side of navigation
- [x] **Resolved deployment errors** - Removed unused Card imports causing ESLint failures
- **Success Criteria**: ✅ All pages use consistent header hierarchy and spacing

### **🎨 Design System Components Priority**
1. **Core**: Button, Card, Input, Select, Textarea
2. **Layout**: Navigation, Footer, Container, Grid
3. **Feedback**: Loading, Toast, Alert, Progress
4. **Advanced**: Dialog, Dropdown, Tabs, Accordion

### **📝 Template Roadmap**
- **Phase 6.2-6.3**: Digest Template (synthesize curated content)
- **Future Phase 7**: Report Template (digest + additional web research)
- **Future Phase 8**: Brief Template (ultra-short summary)
- **Future Phase 9**: Analysis Template (deep analytical insights)

### **🧪 Testing Strategy**
- [ ] Verify build passes after each phase
- [ ] Test core user flows (sync → options → generate/chat)
- [ ] Mobile responsiveness check
- [ ] Performance impact assessment
- [ ] User feedback on improved flows

### **🚫 Out of Scope (Future Phases)**
- Authentication and user accounts
- Pricing page implementation
- Multi-channel support
- Advanced templates beyond Digest
- Payment integration

### **📊 Success Metrics**
- **Technical**: Build time ≤ 15s, no TypeScript errors, no runtime errors
- **User Experience**: Improved flow completion rates, better visual hierarchy
- **Performance**: Page load times ≤ 2s, smooth animations
- **Quality**: Consistent design language, professional appearance

## Next Steps After UI Enhancement

1. **Multi-content support**: Add PDF, YouTube, image processing
2. **Multiple channels**: Support for channel combinations
3. **Advanced templates**: Research reports, brainstorming
4. **Payment integration**: Polar.sh subscription management
5. **Auto-sync**: Webhook integration for real-time updates

## Common Issues & Solutions

### Are.na API - Source URLs Missing
**Problem**: Channel contents don't include source URLs  
**Solution**: Use `getDetailedLinkBlocks()` to fetch individual block details via `/blocks/:id` endpoint

### Jina AI Authentication 
**Problem**: 401 errors from Jina AI Reader API when using API key  
**Solution**: Multiple fallback strategies implemented:

1. **Primary**: Authenticated request with `Authorization: Bearer ${JINA_API_KEY}`
2. **Fallback**: Unauthenticated request to `https://r.jina.ai/{url}` (works for many sites)  
3. **Rate limits**: Jina AI has usage limits, but unauthenticated access often sufficient for MVP

**Code location**: `lib/extraction.ts` - `extractWebsite()` method has try/catch with fallback

**For production**: Get valid Jina AI key from https://jina.ai for higher rate limits and better reliability

### Vector Search Returning No Results
**Problem**: Search function not finding embedded content  
**Solution**: Check Supabase function deployment and similarity thresholds (try 0.5-0.7)

### Content Extraction Failures
- Graceful fallbacks for failed extractions
- Retry mechanisms with different methods
- User feedback for processing errors

### Are.na API Rate Limits
- Implement exponential backoff (100ms delays implemented)
- Cache responses when possible
- Process blocks in batches

### Digest Generation Issues (RESOLVED)
**Problem**: Digest showing "Generated from 0 curated sources" instead of using real channel content  
**Root Cause**: Supabase connection failure (`TypeError: fetch failed`) in generate API route  
**Solution**: Fixed Supabase client initialization - environment variables were available but connection wasn't properly established  
**Result**: Digest now successfully uses real content from 10 embedded articles in r-startups-founder-mode channel

---

This implementation plan provides a clear roadmap for building the MVP while maintaining focus on core functionality and user value.

## 📈 **Current Status: Production Ready**

✅ **MVP Features Complete**  
✅ **Professional UI with shadcn/ui**  
✅ **Real content generation working**  
✅ **Successfully deployed to Vercel**  
✅ **All major bugs resolved**  

**Ready for**: User feedback, feature enhancements, additional templates, multi-channel support