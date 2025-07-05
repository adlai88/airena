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

## 📈 Current Status: Production Ready → Mobile & Open Source Growth

✅ **MVP Features Complete**  
✅ **Professional UI with shadcn/ui**  
✅ **Image processing with GPT-4V**  
✅ **Intelligent curation companion**  
✅ **Successfully deployed to Vercel**  
🔄 **Phase 9: Mobile Experience Finesse** (IN PROGRESS - MVP-focused mobile optimization)
🔄 **Phase 10: Open Source Strategy + Monetization** (AFTER - Community-driven growth)

**Live Application**: https://airena-mu.vercel.app/

## Where We Are

**Production-ready MVP with all core features working end-to-end:**
- **Are.na Integration**: Full channel sync with Link + Image block processing
- **AI Pipeline**: OpenAI embeddings + GPT-4 generation + GPT-4V vision analysis  
- **User Experience**: Professional shadcn/ui design with responsive foundation
- **Intelligence Layer**: Smart curation companion that never shuts down users
- **Deployment**: Live on Vercel with Supabase backend

**What's Next**: Two-phase approach prioritizing user experience before monetization:
1. **Phase 9 (Mobile)**: Polish the responsive foundation for Are.na's mobile-heavy user base
2. **Phase 10 (Open Source)**: Launch community-driven growth with $9/$19/$99 pricing tiers

## 📋 Phase 9: Mobile Experience Finesse ✅ **NEXT PRIORITY**

### Goals & Context
**Why Mobile First**: Are.na's user base is heavily mobile-focused, and we have a solid responsive foundation with shadcn/ui. These are polish optimizations rather than major rewrites, making this the logical next step before open source launch.

**Strategic Timing**: Complete mobile polish while the codebase is still simple, before adding monetization complexity. This ensures community sees the best possible experience when we launch open source.

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

#### Phase 9.2: Essential Mobile Features (MVP-Focused) ✅ **IN PROGRESS**
**Goal**: High-impact mobile functionality for core user flows
- [x] **Native sharing integration** - iOS/Android share sheet for generated content (high value for Are.na users)
- [ ] **Basic gesture support** - Swipe between tabs (if easy to implement)

#### Phase 9.3: Core Performance & Responsiveness (MVP-Focused)
**Goal**: Essential mobile UX optimizations that affect every interaction
- [ ] **Touch responsiveness** - Eliminate 300ms tap delay, improve scroll performance
- [ ] **Mobile loading performance** - Basic lazy loading, optimize critical rendering path
- [ ] **Keyboard handling** - Better mobile keyboard behavior in chat interface

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

## 📋 Phase 10: Open Source Strategy + Monetization ✅ **AFTER MOBILE**

### Goals & Strategic Context
**Why After Mobile**: Launch open source with the best possible user experience. Mobile polish ensures community's first impression is professional and polished.

**Strategic Approach**: Open Core Model - open source the intelligence layer, monetize the infrastructure layer. This builds community trust while creating sustainable revenue.

### Implementation Phases

#### Phase 10.1: Repository Restructure
**Goal**: Prepare codebase for open source release
- [ ] **Repository organization** - Create `core/`, `hosted/`, `enterprise/`, `docs/` structure
- [ ] **Environment detection** - Feature flags for hosted vs self-hosted capabilities
- [ ] **Security audit** - Remove sensitive configs, create comprehensive `.env.example`
- [ ] **Self-hosting documentation** - Complete setup guide with Docker option
- [ ] **Contribution guidelines** - Clear process for community contributions

#### Phase 10.2: Community Features
**Goal**: Enable community-driven growth and contributions
- [ ] **Template marketplace** - Community-contributed prompt templates with rating system
- [ ] **Public channel showcase** - Opt-in directory of interesting channels
- [ ] **GitHub discussions** - Feature requests, community feedback, template sharing
- [ ] **API documentation** - Enable third-party integrations and extensions
- [ ] **Plugin architecture** - Allow community to extend content extraction

#### Phase 10.3: Hosted Service Launch
**Goal**: Implement tiered monetization with community-friendly pricing
- [ ] **Polar.sh integration** - Open source billing platform setup
- [ ] **Usage tracking system** - Block consumption counting and transparent limits
- [ ] **Tier management** - Starter ($9), Pro ($19), Enterprise ($99) implementation
- [ ] **Usage-based billing** - $0.20 per additional block over limit
- [ ] **User dashboard** - Usage monitoring, billing transparency, upgrade flows

#### Phase 10.4: Value Positioning & Growth
**Goal**: Position as "curation intelligence" rather than generic AI
- [ ] **Marketing messaging** - "ChatGPT gives you generic AI, Airena gives you YOUR intelligence"
- [ ] **Onboarding flow** - Position as ChatGPT complement, not replacement
- [ ] **Pricing page** - Clear value proposition for each tier
- [ ] **Community testimonials** - Are.na users explaining the value
- [ ] **Launch strategy** - GitHub release, Hacker News, Product Hunt coordination

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