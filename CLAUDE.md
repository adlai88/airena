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

**Live Application**: https://www.arin.im/  
**Open Source Repository**: https://github.com/adlai88/arin

## Architecture Highlights

### Authentication System
- **Better Auth** with Supabase adapter
- **Polar.sh** for billing and subscriptions
- **OAuth Support** ready for Google/GitHub providers
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

## 🚀 Current Phase: Phase 11 - Post-Hackathon Growth & Polish

**Strategic Timing**: After winning the hackathon 🏆, leverage the momentum for growth features and user engagement improvements.

### 🎯 Current Priorities

#### Immediate (Week 1)
1. **Monitor founding member signups** - track waitlist growth and engagement
2. **Test lifetime block limits** - ensure 50-block free tier works correctly

#### Growth Features (Week 2-3)
- **Enhanced research report** - with web search integration (premium value)
- **OAuth Integration**: Add Google/GitHub login for easier onboarding
- **Email Service**: Set up Resend for password resets and notifications

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

## 🎯 Current Pricing Structure

### Free Tier
- **50 blocks lifetime limit** - Enforced and displayed in UI
- **Unlimited chat and generations** - No monthly limits for free tier
- **Public channels only** - Private channels require upgrade

### Founding Member ($5/month forever) - LIMITED TO FIRST 100 MEMBERS
- **Everything unlimited forever** - No block or channel limits
- **Private channels access** - Sync and process private Are.na channels
- **Priority support** - Direct access to founder
- **All future Pro features** - Automatically included
- **70-75% savings** - Compared to future Pro pricing
- **Status**: Waitlist active, not yet available for purchase

### Pro Tier ($15-19/month) - COMING LATER
- **Everything unlimited** - No restrictions
- **Private channels access** - Full Are.na integration
- **API access** - Programmatic access
- **Webhook support** - Real-time integrations
- **MCP server generation** - Custom AI tools
- **Status**: Future pricing, not yet available

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

### Email Service for Password Reset (Resend)
Currently, password reset emails are only logged to console in development. To enable actual email delivery in production:

1. **Sign up for Resend** at https://resend.com
2. **Verify your domain** (aryn.im) in Resend dashboard
3. **Get your API key** from Resend
4. **Add to Vercel environment variables**:
   - `RESEND_API_KEY` = your-resend-api-key
   - `NODE_ENV` = production

The code is already set up to use Resend when the API key is present. This will enable:
- Password reset emails
- Future: Welcome emails, notification emails, weekly digests

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

## Recent Changes

### Latest Updates (August 2025)
- **Domain Rebrand**: Complete migration from airena.io to aryn.im
  - Updated all environment variables, webhooks, and service configurations
  - Updated Polar webhook URLs and Better Auth trusted origins
- **Sign-in Fix**: Resolved production redirect issue with Better Auth
  - Added timeout delay to ensure session establishment before redirect
  - Uses `window.location.href` for reliable production redirects
- **UI/UX Improvements**: 
  - Fixed cursor pointer missing on buttons, selects, and tabs (Tailwind v4 Preflight issue)
  - Enhanced chat UI with glass morphism effects on channel badges
  - Increased spacing between chat messages for better readability
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

## ✅ Recent Completions (August 2025)
- ✅ **50-block lifetime limit system tested and working** - Database shows proper enforcement
- ✅ **Usage system cleanup completed** - Removed deprecated monthly limits, clean codebase
- ✅ **Google OAuth added to Better Auth** - Sign-in/up forms include Google authentication
- ✅ **GitHub OAuth added to Better Auth** - Sign-in/up forms include GitHub authentication

## 🎯 Next Steps

### 📧 Resend Email Setup (Required for Production)
To enable password reset emails and future email features:

1. **Domain Verification** (DNS setup required):
   - Login to [Resend Dashboard](https://resend.com/domains)
   - Add domain: `arin.im`
   - Add these DNS records to your domain:
     ```
     Type: TXT
     Name: arin.im
     Value: [Resend will provide verification record]
     
     Type: MX
     Name: arin.im  
     Value: [Resend MX record]
     
     Type: TXT
     Name: _dmarc.arin.im
     Value: [Resend DMARC record]
     ```

2. **Environment Variables** (already configured):
   - `RESEND_API_KEY` - ✅ Already set in .env.local
   - `NODE_ENV=production` - ✅ Already set

3. **Test Email Functionality**:
   - After domain verification, test password reset emails
   - Future: Welcome emails, notification emails, weekly digests

### 🚀 Growth & Engagement Features
- **Template Priority 1**: Activate brainstorm template (increases engagement)
- **Template Priority 2**: Enhanced research report with web search (premium value)
- **Intelligence Score Feature**: Analyze private channels for upgrade conversion
- **Weekly reset system**: For enhanced free tier engagement strategy
  - Test password reset email functionality in production

## Environment Variables to Clean Up
**Completed**: Clerk environment variables have been removed from .env.local (migration complete)