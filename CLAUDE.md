# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Arin v2 - Open Source Project

## Project Overview

Arin transforms curated Are.na channels into an intelligence agent that generates content from your own research. Instead of searching through bookmarks manually, users can generate newsletters, reports, and insights using AI powered by their personally curated content.

**Core Value**: Your curation advantage becomes your intelligence advantage.

## Tech Stack
- **Frontend**: Next.js 15 + React with Vercel AI SDK
- **Backend**: Vercel Edge Functions + Supabase (pgvector)
- **AI**: Supabase AI embeddings (384-dim) + GPT-4 generation + GPT-4V vision
- **Content**: Are.na API + Jina AI extraction + vision analysis
- **UI**: shadcn/ui design system with mobile-responsive foundation
- **Embeddings**: Supabase AI Session API (LW15 feature) - migrated from OpenAI

## Important Database Conventions

### Table Naming: SINGULAR (not plural)
**⚠️ CRITICAL**: Our database uses **SINGULAR** table names following Better Auth's convention:
- ✅ `user` (NOT `users`)
- ✅ `session` (NOT `sessions`)
- ✅ `account` (NOT `accounts`)
- ✅ `verification` (NOT `verifications`)

This is because Better Auth created these tables and uses singular naming. All new tables should follow this convention for consistency. DO NOT attempt to rename these tables to plural as it will break authentication.

## 📈 Project Status

✅ **MVP Features Complete**  
✅ **Professional UI with shadcn/ui**  
✅ **Image processing with GPT-4V**  
✅ **Video processing with YouTube Data API v3**  
✅ **Intelligent curation companion**  
✅ **Deletion sync for perfect bidirectional sync**  
✅ **Successfully deployed to Vercel**  
✅ **Mobile Experience** - MVP-focused mobile optimization
✅ **Spatial Canvas** - Transform channels into self-organizing knowledge maps
✅ **Better Auth + Polar** - Unified auth/billing system
✅ **Supabase AI Migration** - Native embeddings integration
✅ **Open Source Launch** - Repository public with self-hosting support
✅ **Codebase Cleanup** - Removed deprecated features and legacy code  
✅ **CSV to Are.na Import Tool** - Added standalone script for bulk importing reading lists
✅ **Domain Rebrand Complete** - Fully migrated from airena.io to arin.im across all services
✅ **UI/UX Improvements** - Fixed cursor pointer on interactive elements, enhanced chat UI
✅ **Sign-in Reliability** - Fixed production redirect issues with Better Auth
✅ **Hackathon Winner** - Successfully won hackathon with Arin project 🏆
✅ **Polar Migration Complete** - New Arin organization setup with $7/month founding tier

**Live Application**: https://www.arin.im/  
**Open Source Repository**: https://github.com/adlai88/arin

## Architecture Highlights

### Authentication System
- **Better Auth** with Supabase adapter
- **Polar.sh** for billing and subscriptions
- **OAuth Support**: Google and GitHub authentication implemented
- Password reset functionality implemented

### Spatial Intelligence Canvas
- Transform Are.na channels into self-organizing knowledge maps
- Three-way view system: Grid, Similarity (semantic clusters), Random
- Advanced K-means++ clustering with cosine distance
- pgvector semantic analysis for block similarity
- tldraw integration for professional canvas experience

### Content Processing
- All 5 Are.na block types supported
- Multimodal processing: text, images, PDFs, videos, media
- YouTube transcript extraction
- PDF text extraction with page analysis
- GPT-4V for image understanding

## Supabase Access
- If you need to check supabase, remember u only have read access. u can use supabase mcp or ask me to run a sql query for you in supabase

## Important Instruction Reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## 📋 Task Management with Linear

We use a hybrid approach:
- **Linear**: For bugs, features, and research tasks that benefit from tracking
- **CLAUDE.md**: For quick fixes, internal notes, and sensitive planning

### Linear Integration
- **Team**: Arin (ID: cec7d78e-2a34-4ceb-9600-f2d23823c1c5)
- **Active Issues**: Check Linear for current sprint
- **Devin Integration**: See ARY-6 for learnings about using Devin for research/investigation

## 🚀 Current Phase: Phase 13 - Founding Member Launch (LIVE!)

**LAUNCH COMPLETE**: Polar.sh billing infrastructure successfully deployed and founding member signups are LIVE at $7/month.

### ✅ COMPLETED: Polar Migration & Launch
- ✅ **New Polar Organization**: `arin` organization created and operational
- ✅ **Founding Member Product**: $7/month subscription live (increased from $5 to match Are.na Premium pricing)
- ✅ **Production Infrastructure**: Webhooks, API keys, and environment variables configured
- ✅ **Build & Deployment**: All TypeScript/ESLint errors resolved, production stable
- ✅ **Founding Member Signups**: Enabled and ready for conversions

### 🎯 Current Focus: Growth & Optimization
1. **Monitor Founding Member Signups** - Track conversions and optimize checkout flow
2. **User Experience Refinement** - Address any subscription management issues
3. **Feature Development** - Prepare enhanced research report template

### 🚧 Template Enhancement Strategy

#### 📋 Template Implementation Plan

**Premium Tier Template**: Enhanced Research Report
- **Current Status**: Basic version exists, needs Firecrawl integration
- **Function**: Combines curated content with intelligent web research
- **Value**: Transforms static curation into dynamic research assistant
- **Implementation**: See `/_ai-docs/enhanced-research-report-template.md`

#### 📊 Reset System Testing Requirements

**Monthly Reset System** (currently implemented but untested):
- **Free Tier**: 10 chat messages + 2 generations per channel per month
- **Starter Tier**: 200 blocks per month (unlimited chat/generations)
- **Pro Tier**: 500 blocks per month (unlimited chat/generations)

**Weekly Reset System** (future implementation):
- **Only needed for new free tier strategy**: 1 channel, 25 blocks total, weekly reset
- **Current priority**: Test monthly resets first

### 🚧 Phase 10.4e: Intelligence Score Foundation (LATER)

#### 🔮 Core Intelligence Score Feature
Based on pricing strategy: *"Shows specific, personalized value locked behind upgrade"*

**Implementation Tasks:**
- [ ] **Are.na account analysis API** - fetch user's private channel metadata
- [ ] **Intelligence Score calculation** - analyze channel richness, topic diversity
- [ ] **Personalized upgrade preview** - show potential newsletters, report count
- [ ] **Privacy-first design** - metadata only, no content access
- [ ] **Upgrade flow integration** - seamless transition to Starter tier

#### 📊 Intelligence Score Display Components
```
🔮 Your Intelligence Potential
📊 Private Channels Detected: 8 channels, 1,247 total blocks
🎯 High-Value Channels:
   • "Design Research" (347 blocks) → 14 potential newsletters
   • "AI Papers" (298 blocks) → High knowledge density
💡 Intelligence Coverage: 12 topics
🚀 Upgrade Impact: 50x more content available
```

#### 🎯 Conversion Psychology Elements
- **FOMO Creation**: Specific, personalized value locked behind upgrade
- **Quantified Potential**: Numbers make upgrade value concrete  
- **Curiosity Gap**: Users want to know what insights their channels contain
- **Non-Pushy Presentation**: Helpful insight, not aggressive sales

### 🚧 Phase 10.4c: Enhanced Free Tier (LATER)

#### 📈 New Free Tier Strategy
**Current**: 3 channels, 25 blocks per channel, chat only
**New**: 1 channel, 25 blocks total, weekly reset + 1 generation/week

**Implementation Tasks:**
- [ ] **Weekly reset system** - habit formation mechanics
- [ ] **Generation limit tracking** - 1 generation per week for free users  
- [ ] **Enhanced generation templates** - newsletters, insights, reports
- [ ] **Weekly engagement emails** - remind users when reset occurs

## 🎯 Current Pricing Structure (2-Tier System)

### Free Tier
- **50 blocks lifetime limit** - Enforced and displayed in UI
- **Public channels only** - Private channels require upgrade
- **Chat with your channels** - Unlimited conversations
- **Generate content** - Unlimited generations
- **Spatial canvas view** - Full canvas functionality

### Founding Member ($7/month forever) - LIVE & AVAILABLE
- **Unlimited blocks** - No processing limits
- **Private channels access** - Sync and process private Are.na channels
- **Priority support** - Direct access to founder
- **Early access to features** - Get new features first
- **Status**: ✅ LIVE - Signups enabled and operational

## ✅ COMPLETED: Usage System Cleanup (August 2025)

**Simplified Pricing Model**: Removed complex monthly chat/generation limits in favor of simple 50-block lifetime limit for free tier.

**What Was Cleaned Up**:
1. **Monthly chat limits** - Removed deprecated 10 messages/month per channel limit
2. **Monthly generation limits** - Removed deprecated 2 generations/month per channel limit  
3. **Channel count limits** - Removed 3-channel limit (not aligned with current strategy)
4. **Complex tracking code** - Cleaned up `UsageTracker.checkChatGenerationLimits` usage

**Current System**:
- **Free Tier**: 50 blocks lifetime limit (enforced via `SimpleUsageTracker`)
- **Paid Tiers**: Unlimited everything
- **Clean codebase**: No temporary disable comments or unused imports

## 🐛 Known Issues & Edge Cases

### Lifetime Blocks Can Exceed Limit
**Issue**: Users can end up with more lifetime_blocks_used than their limit (e.g., 94/50)
**Cause**: Failed sync attempts may still record block usage, or multiple concurrent syncs could exceed the limit
**Impact**: UI shows confusing numbers like "94/50 (0 remaining)"
**TODO**: Add database constraint or application logic to prevent lifetime_blocks_used from exceeding 50 for free tier

**Temporary Fix**: Reset user's blocks via SQL:
```sql
UPDATE "user" 
SET lifetime_blocks_used = 0
WHERE email = 'user@example.com';
```

## 📧 Future Enhancements

### Image Generation in Spatial Canvas
Future enhancement idea for the spatial canvas: Allow users to generate new images using existing blocks as visual references.

**Interaction concept:**
- User selects multiple image blocks on the canvas
- Opens a generation panel showing selected images as references
- User provides text prompt (e.g., "combine these aesthetics into a new mood board image")
- System generates new images that blend visual elements from references
- Generated images appear on canvas and can be saved back to Are.na

**Technical considerations:**
- Use image-to-image generation APIs (DALL-E 3, Stable Diffusion XL, Midjourney)
- Extract style characteristics (colors, composition, textures) from source images
- Leverage existing embeddings for semantic understanding
- Support iterative refinement and variations
- Enable mask/inpainting for combining specific elements

This would transform the spatial canvas from an organizational tool into a generative creative companion, extending the "curation to creation" philosophy.

### Real-time Embedding Pipeline
**Highest UX Impact Enhancement** analyzed in detail on August 25, 2025.

**Current State**: Manual embedding during sync cycles creates delays between content addition and searchability.

**Enhancement**: Automatic database triggers for real-time embedding generation would transform Arin from "batch processor" to "live research companion."

**User Experience**: Add block to Are.na → Ask about it within seconds instead of waiting for next sync.

**See detailed analysis**: `/_ai-docs/backlog/supabase-ai-feature-analysis-2025-08-25.md`

## Recent Changes

### Latest Updates (August 2025)
- **Polar Migration**: Complete migration from `airena` to `arin` Polar organization
  - ✅ New organization setup with proper branding alignment
  - ✅ Founding Member product configured at $7/month (increased from $5)
  - ✅ Production webhooks and API keys deployed
  - ✅ Zero downtime migration with full feature parity
- **Build & Deployment**: Resolved all production blockers
  - ✅ Fixed TypeScript errors in usage-stats and sync functions
  - ✅ Cleaned up unused imports and ESLint violations
  - ✅ Updated tier configuration to match 2-tier system (free/founding)
  - ✅ Successful production deployment via Vercel
- **Domain Rebrand**: Complete migration from airena.io to arin.im
  - Updated all environment variables, webhooks, and service configurations
  - Updated Polar webhook URLs and Better Auth trusted origins
- **Sign-in Fix**: Resolved production redirect issue with Better Auth
  - Added timeout delay to ensure session establishment before redirect
  - Uses `window.location.href` for reliable production redirects
- **UI/UX Improvements**: 
  - Fixed cursor pointer missing on buttons, selects, and tabs (Tailwind v4 Preflight issue)
  - Enhanced chat UI with glass morphism effects on channel badges
  - Increased spacing between chat messages for better readability
  - Updated all pricing displays to reflect $7/month founding tier
- **CSV Import Tool**: Added `scripts/csv-to-arena.js` for bulk importing reading lists from CSV to Are.na channels
- **Template Cleanup**: Removed deprecated brainstorm template from generation system
- **Clerk References**: Cleaned up remaining references after migration to Better Auth
- **Usage System**: Simplified to 50-block lifetime limit only (monthly limits removed)
- **Documentation Consolidation**: Merged CLAUDE.md and CLAUDE.local.md into single private file

## Self-Hosting

For self-hosting instructions, see `/_ai-docs/SELF_HOSTING.md`

## Additional Documentation

- [Spatial Canvas Implementation](/_ai-docs/SPATIAL_PROTOTYPE_PLAN.md)
- [Better Auth Testing Guide](/_ai-docs/BETTER_AUTH_TESTING_GUIDE.md)
- [Migration History](/_ai-docs/CLERK_TO_POLAR_MIGRATION_PLAN_SUPABASE.md)
- [Polar Migration Plan](/_ai-docs/polar-migration-plan.md) - Complete Arin organization setup

## ✅ Recent Completions (August 2025)
- ✅ **2-Tier System Refactoring** - Simplified from free/starter/pro to free/founding structure
- ✅ **UI Updates for New Tiers** - Updated usage and pricing pages with clean founding member copy
- ✅ **Database Migration Complete** - Converted existing users to founding tier, added tier constraints
- ✅ **50-block lifetime limit system tested and working** - Database shows proper enforcement
- ✅ **OAuth Authentication** - Google and GitHub login fully implemented and working
- ✅ **Password Reset Emails** - Resend integration complete for production email delivery
- ✅ **Navigation UX Fix** - Resolved dropdown focus issues affecting sticky navigation
- ✅ **Polar Migration Complete** - Successfully migrated from `airena` to `arin` organization
- ✅ **Founding Member Launch** - $7/month tier live with zero downtime deployment

## 🎯 Next Steps

### 📊 Current Priorities: Growth & Revenue
1. **Monitor Founding Member Conversions** - Track signup rates and optimize pricing page
2. **Subscription Management** - Ensure seamless customer portal experience
3. **User Onboarding** - Optimize new user flow for private channel setup

### 📈 Growth Features (After Launch)
- **Enhanced research report** with web search integration
- **Intelligence Score Feature**: Analyze private channels for upgrade conversion

## Environment Variables to Clean Up
**Completed**: Clerk environment variables have been removed from .env.local (migration complete)