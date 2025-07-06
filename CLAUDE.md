# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Airena v2 - Active Development Plan

## Project Overview

Airena transforms curated Are.na channels into an intelligence agent that generates content from your own research. Instead of searching through bookmarks manually, users can generate newsletters, reports, and insights using AI powered by their personally curated content.

**Core Value**: Your curation advantage becomes your intelligence advantage.

## Tech Stack
- **Frontend**: Next.js 15 + React with Vercel AI SDK
- **Backend**: Vercel Edge Functions + Supabase (pgvector)
- **AI**: OpenAI embeddings + GPT-4 generation + GPT-4V vision
- **Content**: Are.na API + Jina AI extraction + vision analysis
- **UI**: shadcn/ui design system with mobile-responsive foundation

## 📈 Current Status: Complete Multimodal Intelligence Achieved

✅ **MVP Features Complete**  
✅ **Professional UI with shadcn/ui**  
✅ **Image processing with GPT-4V**  
✅ **Video processing with YouTube Data API v3**  
✅ **Intelligent curation companion**  
✅ **Deletion sync for perfect bidirectional sync**  
✅ **Successfully deployed to Vercel**  
✅ **Phase 9: Mobile Experience Finesse** (COMPLETED - MVP-focused mobile optimization)
✅ **Phase 9.5: Video Intelligence** (COMPLETED - YouTube API integration)
✅ **Phase 9.6: PDF Processing** (COMPLETED - Document intelligence added)
🔄 **Phase 10: Open Source Strategy + Monetization** (READY - Community-driven growth)

**Live Application**: https://airena-mu.vercel.app/

## Where We Are

**Complete multimodal intelligence platform with all content types:**
- **Are.na Integration**: Full channel sync with Link + Image + Media + Attachment block processing
- **AI Pipeline**: OpenAI embeddings + GPT-4 generation + GPT-4V vision analysis + YouTube Data API v3
- **Video Intelligence**: Official YouTube API with rich metadata, descriptions, chapters, and tags
- **Document Intelligence**: PDF processing with Jina AI extraction (59K+ chars extracted from academic papers)
- **Bidirectional Sync**: Deletion sync ensures perfect synchronization between Are.na and Airena
- **User Experience**: Professional shadcn/ui design with mobile-responsive foundation
- **Intelligence Layer**: Smart curation companion that never shuts down users
- **Deployment**: Live on Vercel with Supabase backend

**What's Next**: Launch with complete feature set:
1. **Phase 10.1 (Week 1)**: Quick monetization implementation with Polar.sh + basic tiers  
2. **Phase 10.2 (Week 2)**: Open source preparation and repository cleanup
3. **Phase 10.3 (Week 3)**: Launch with "Complete multimodal intelligence" positioning

## 📋 Phase 9.5: Video Intelligence ✅ **COMPLETED**

### **🎯 Achievement: Official YouTube Data API v3 Integration**

**Problem Solved**: The `youtube-transcript` package was unreliable due to YouTube's anti-scraping measures, causing video processing to fail with "0 new blocks processed" despite videos being visible in Are.na channels.

**Solution Implemented**: Complete YouTube Data API v3 integration with robust fallback strategies.

#### **Key Features Delivered:**

✅ **Deletion Sync** - Perfect bidirectional synchronization
- Detects blocks removed from Are.na and deletes them from Airena knowledge base
- Reports: "Removed X blocks that were deleted from Are.na"
- Ensures knowledge base exactly matches Are.na channel contents

✅ **Media Block Support** - Full video processing pipeline
- Added `getDetailedMediaBlocks()` to Arena client for video discovery
- Updated sync service to process Link + Image + Media blocks
- Videos from Are.na browser extension (Link blocks with YouTube URLs) now processed

✅ **YouTube Data API v3 Integration** - Official, reliable video processing
- **Rich metadata extraction**: Title, channel, description, tags from official API
- **Chapter detection**: Automatic timestamp parsing from descriptions
- **10K requests/day free tier** - Sufficient for most use cases
- **Robust fallback strategy**: API → description → generic fallback

✅ **Enhanced Content Quality** - Superior to transcript-based approach
- **Structured content**: Chapters with timestamps (00:00:11 Product so good people tell friends)
- **Context-rich descriptions**: Y Combinator program details, curriculum info
- **Channel credibility**: "Y Combinator" channel context adds authority
- **Searchable tags**: "YC, Y Combinator, Sam Altman, Startup School"
- **1,486 characters** of meaningful content vs. empty transcripts

#### **Technical Implementation:**

**New Components:**
- `lib/youtube-api.ts` - Official YouTube Data API v3 client
- Enhanced `lib/video-extraction.ts` - Hybrid extraction with multiple fallbacks
- Updated sync pipeline - Deletion detection and Media block processing

**API Integration:**
```typescript
// Rich video content extraction
const content = await YouTubeOfficialAPI.extractVideoContent(url);
// Result: Title + Channel + Description + Tags + Chapters
```

**Sync Results Example:**
```
Found 22 processable blocks (22 links, 0 images, 0 media)
Removed 4 blocks that were deleted from Are.na  ← Deletion sync
Processing 3 new blocks...  ← Video reprocessing
```

#### **User Experience Impact:**

**Before**: 
- Generic titles: "YouTube Video (dHVMujryp40)"
- Empty content: "Video transcript unavailable"
- Broken chat responses with wrong video titles

**After**:
- Real titles: "Sam Altman - How to Succeed with a Startup" 
- Rich content: Descriptions + chapters + context + tags
- Accurate chat responses with proper video attribution

**Production Impact**: All video processing now reliable and information-rich, enabling true multimodal intelligence for Are.na channels with video content.

## 📋 Phase 9: Mobile Experience Finesse ✅ **COMPLETED**

### Goals & Context
**Why Mobile First**: Are.na's user base is heavily mobile-focused, and we have a solid responsive foundation with shadcn/ui. These were polish optimizations rather than major rewrites.

**Strategic Result**: Mobile experience is now production-ready with touch-friendly navigation, native sharing, and optimized performance for Are.na's mobile-heavy user base.

### Implementation Phases

#### Phase 9.1: Mobile Navigation & Interaction ✅ **COMPLETED**
**Goal**: Optimize touch interactions and navigation flow
- [x] **Touch interaction audit** - Audited navigation.tsx component for mobile issues
- [x] **Tab navigation enhancement** - Added 44px min-height, responsive text sizing (`text-sm sm:text-base`), optimized touch padding (`px-3 sm:px-4`), improved container width (`max-w-sm sm:max-w-md`)
- [x] **Mobile keyboard optimization** - Added auto-scroll, viewport handling, input focus management, mobile keyboard attributes
- [ ] **Navigation timing** - Reduce perceived load times with optimistic navigation

**Changes made**: 
- Updated `/src/components/navigation.tsx` with mobile-optimized tab dimensions, responsive typography, and compact mobile layout (reduced padding, smaller text/icons, tighter spacing)
- Enhanced `/src/app/chat/page.tsx` with mobile keyboard optimizations: auto-scroll to bottom, viewport resize handling, proper input attributes for mobile keyboards
- Fixed navigation crowding on mobile: reduced padding (`px-2`), smaller tabs (`text-xs`), compact avatar (`h-7 w-7`), tighter gaps
- Improved setup page layout: changed from narrow to standard container width, increased max-width to `max-w-2xl` for better mobile usability
- Added native sharing to `/src/app/generate/page.tsx` - Web Share API with clipboard fallback for generated content
- Added sharing buttons to `/src/app/chat/page.tsx` - Share individual assistant responses with mobile share sheet
- Added proper SSR safety checks for all browser APIs (`typeof navigator !== 'undefined'`, `typeof window !== 'undefined'`)
- Added mobile performance optimizations to `/src/app/globals.css` - touch-action, scroll performance, input optimizations
- Updated `/src/app/layout.tsx` with mobile-friendly viewport configuration and PWA meta tags

#### Phase 9.2: Essential Mobile Features (MVP-Focused) ✅ **COMPLETED**
**Goal**: High-impact mobile functionality for core user flows
- [x] **Native sharing integration** - iOS/Android share sheet for generated content (high value for Are.na users)
- [x] **Basic gesture support** - Skipped for MVP (complex implementation, low ROI)

#### Phase 9.3: Core Performance & Responsiveness (MVP-Focused) ✅ **COMPLETED**
**Goal**: Essential mobile UX optimizations that affect every interaction
- [x] **Touch responsiveness** - Eliminated 300ms tap delay with `touch-action: manipulation`
- [x] **Mobile loading performance** - Added mobile viewport meta tags, scroll optimizations, input performance tweaks
- [x] **Scroll performance** - Added `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain`

## 📋 Phase 9.4: Video Processing Integration ✅ **COMPLETED**

### Strategic Achievement: Complete Multimodal Intelligence
**Mission Accomplished**: Now process ALL Are.na content types - websites, PDFs (via Jina), images (via GPT-4V), and videos (via youtube-transcript).

**Strategic Pivot**: Chose youtube-transcript over Whisper for faster MVP completion (1 day vs 3 days, free vs expensive, handles 80% of video use cases).

### Implementation Results ✅ **ALL COMPLETE**

#### Video Processing Pipeline **COMPLETED**
- [x] **YouTube transcript extraction** - Fast, free caption scraping via youtube-transcript package
- [x] **Video URL detection** - Automatic identification in Link blocks with comprehensive pattern matching
- [x] **Content extraction integration** - Seamless routing in existing `src/lib/extraction.ts` pipeline
- [x] **Type-safe architecture** - `ProcessedVideoBlock` interface with transcript metadata
- [x] **Error handling** - Graceful fallbacks for videos without captions
- [x] **Rate limiting optimization** - 750ms delay for video processing (balanced between images/websites)

#### Production Validation **COMPLETED**
- [x] **Real video testing** - Successfully processed YouTube content with transcript extraction
- [x] **Batch processing** - Accurate counting and progress tracking for all content types
- [x] **Block type classification** - Videos correctly identified as `blockType: 'Video'`
- [x] **Metadata extraction** - Video ID, title, transcript availability tracking
- [x] **Pipeline integration** - Videos processed alongside websites and images in unified workflow

### Technical Implementation Details
**Architecture**: Video URLs → YouTube caption scraping → text processing → embedding + storage
**Content Types Covered**: ✅ Websites, ✅ PDFs, ✅ Images, ✅ Videos (COMPLETE COVERAGE)
**Positioning Impact**: **"Complete multimodal intelligence for your Are.na channels"**

**Files Created/Modified**:
- `lib/video-extraction.ts` - Complete video processing service
- `src/lib/extraction.ts` - Integrated video routing and batch processing
- `scripts/test-video-integration.ts` - Production validation testing

**Test Results**:
```
🎉 Video Integration Success:
✅ Video URL detection working
✅ Block type classification (blockType: 'Video') 
✅ Metadata extraction (video ID, transcript status)
✅ Batch processing: "1 websites, 1 videos, 0 images"
```

#### Post-MVP Mobile Features (Phase 11+)
**Deferred until after open source launch:**
- Progressive Web App (PWA) features
- Haptic feedback and voice input
- Offline capability and advanced caching
- Bundle size optimization and image format optimization
- Memory optimization and advanced performance tuning

### Mobile-First Design Considerations

**Screen Size Optimization:**
- **320px (iPhone SE)**: Minimum viable layout
- **375px (iPhone 12/13)**: Primary design target
- **414px (iPhone Pro Max)**: Enhanced layout utilization
- **768px+ (iPad)**: Tablet-optimized interface

**Are.na Mobile User Patterns:**
- **Discovery-first**: Mobile users browse and discover more than desktop
- **Quick interactions**: Generate content on-the-go, read later
- **Sharing-heavy**: Mobile users share generated content more frequently
- **Attention-sensitive**: Shorter attention spans, need faster feedback

### Success Criteria
- **Performance**: < 2s load time on 3G networks
- **Interaction**: All touch targets ≥ 44px, smooth 60fps animations
- **Accessibility**: Screen reader compatible, high contrast support
- **User Experience**: Intuitive mobile-first navigation, minimal friction

## 📋 Phase 10: Simultaneous Open Source + Monetization Launch ✅ **NEXT**

### Goals & Strategic Context
**Why Simultaneous Launch**: Are.na's professional user base values complete, polished experiences. Launching open source with a working business model builds more trust than a free-then-paid approach.

**Strategic Approach**: "Open source intelligence layer + optional hosted convenience" - complete story from day one with immediate revenue potential.

### Hybrid Implementation Strategy

#### Phase 10.1: Quick Monetization Implementation (Week 1)
**Goal**: Basic but functional monetization ready for launch
- [ ] **Polar.sh integration** - Open source billing platform setup
- [ ] **Basic tier management** - Starter ($9), Pro ($19), Enterprise ($99)
- [ ] **Usage tracking** - Simple block consumption counting
- [ ] **User dashboard** - Basic usage monitoring and billing
- [ ] **Pricing page** - Clear value proposition for each tier

#### Phase 10.2: Open Source Preparation (Week 2)
**Goal**: Clean, professional open source release
- [ ] **Security audit** - Remove sensitive configs, create comprehensive `.env.example`
- [ ] **Self-hosting documentation** - Complete setup guide with clear instructions
- [ ] **Contribution guidelines** - Community contribution process
- [ ] **README polish** - Professional project presentation
- [ ] **Repository cleanup** - Remove any proprietary elements

#### Phase 10.3: Coordinated Launch (Week 3)
**Goal**: Single launch moment with complete offering
- [ ] **Launch messaging** - "Open source curation intelligence - self-host free or use hosted service"
- [ ] **Community channels** - GitHub discussions, template sharing
- [ ] **Launch strategy** - Coordinated GitHub release, Hacker News, Product Hunt
- [ ] **Onboarding flow** - Clear path from open source to hosted service
- [ ] **Value positioning** - "ChatGPT gives you generic AI, Airena gives you YOUR intelligence"

#### Phase 10.4: Post-Launch Growth (Week 4+)
**Goal**: Build community and iterate based on feedback
- [ ] **Template marketplace** - Community-contributed prompt templates
- [ ] **Public channel showcase** - Opt-in directory of interesting channels
- [ ] **API documentation** - Enable third-party integrations
- [ ] **Community testimonials** - Are.na users explaining the value
- [ ] **Feature iteration** - Based on user feedback and usage patterns

### Monetization Strategy

**Tier Structure:**
- **Open Source (Free)**: Self-hosted, unlimited usage, community support
- **Starter ($9/month)**: 25 blocks/month, 1 channel, hosted convenience
- **Pro ($19/month)**: 100 blocks/month, 3 channels, premium templates
- **Enterprise ($99/month)**: Unlimited usage, white-label, SLA support

**Usage-Based Add-On**: $0.20 per additional block over limit with transparent tracking

### What's Open Source vs Proprietary

**Open Source Core (Free):**
- Are.na API integration and content extraction pipeline
- Vector embedding logic and basic chat interface
- Standard prompt templates and self-deployment docs
- Core intelligence layer (the "secret sauce")

**Hosted Service Features (Proprietary):**
- Managed user accounts, billing, and multi-channel orchestration
- Advanced analytics dashboard and webhook infrastructure
- Premium prompt templates and auto-scaling logic
- Operational convenience layer

**Enterprise Features (Proprietary):**
- SSO integrations, custom branding, advanced security
- SLA monitoring and custom integrations
- White-label solutions

### Strategic Benefits

**Community as Distribution:**
- Are.na community → GitHub growth → Hacker News → Product Hunt momentum
- Network effects: Community improves templates faster than solo development
- Trust building: Transparent development shows value of hosted service

**Competitive Positioning:**
- **Moat**: Are.na community knowledge + infrastructure execution, not code
- **Positioning**: "Curation intelligence" vs generic AI capabilities
- **Market**: Complement to ChatGPT, not replacement

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
```

## Quick Reference

**Live Application**: https://airena-mu.vercel.app/
**Repository**: Current working directory
**Database**: Supabase with pgvector extension
**Current Channel**: r-startups-founder-mode (default with demo data)

## Implementation History

For complete implementation history (Phases 1-8), architecture details, and resolved issues, see:
- `docs/CLAUDE-archive.md` - Full implementation history
- `docs/architecture.md` - Technical architecture (to be created)
- `docs/deployment.md` - Deployment guide (to be created)

## Next Steps After Phase 10

1. **Multi-channel orchestration**: Advanced channel combination features
2. **Advanced templates**: Research reports, brainstorming, analysis
3. **Enterprise features**: SSO, custom branding, advanced security
4. **Community ecosystem**: Plugin marketplace, third-party integrations
5. **Auto-sync**: Webhook integration for real-time updates