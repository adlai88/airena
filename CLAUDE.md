# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Airena v2 - Active Development Plan

## Project Overview

Airena transforms curated Are.na channels into an intelligence agent that generates content from your own research. Instead of searching through bookmarks manually, users can generate newsletters, reports, and insights using AI powered by their personally curated content.

**Core Value**: Your curation advantage becomes your intelligence advantage.

## Tech Stack
- **Frontend**: Next.js 15 + React with Vercel AI SDK
- **Backend**: Vercel Edge Functions + Supabase (pgvector)
- **AI**: Supabase AI embeddings (384-dim) + GPT-4 generation + GPT-4V vision
- **Content**: Are.na API + Jina AI extraction + vision analysis
- **UI**: shadcn/ui design system with mobile-responsive foundation
- **Embeddings**: Supabase AI Session API (LW15 feature) - migrated from OpenAI

## 📈 Current Status: Open Source Launched Successfully 🎉

✅ **MVP Features Complete**  
✅ **Professional UI with shadcn/ui**  
✅ **Image processing with GPT-4V**  
✅ **Video processing with YouTube Data API v3**  
✅ **Intelligent curation companion**  
✅ **Deletion sync for perfect bidirectional sync**  
✅ **Successfully deployed to Vercel**  
✅ **Phase 9: Mobile Experience Finesse** (COMPLETED - MVP-focused mobile optimization)
✅ **Phase 9.5: Video Intelligence** (COMPLETED - YouTube API integration)
✅ **Phase 9.6: PDF Processing** (COMPLETED - Production tested with real PDFs)
✅ **Phase 9.7: Complete Block Type Coverage** (COMPLETED - All 5 Are.na block types supported)
✅ **Phase 9.8: Intelligence Enhancement** (COMPLETED - Hybrid knowledge mode + UI polish)
✅ **Phase 9.9: Usage Tracking & Limits** (COMPLETED - 25-block free tier + monthly tracking infrastructure)
✅ **Phase 10.0: Tier-Optimized Performance** (COMPLETED - Usage dashboard + overage pricing)
✅ **Phase 10.1: Complete Monetization Platform** (COMPLETED - Popup checkout + Polar.sh billing + Dark mode UI)
✅ **Phase 10.2: Open Source Preparation** (COMPLETED - Repository structure + Documentation + Self-hosting guides)
✅ **Phase 10.3: Visual Enhancement & Channel Limits** (COMPLETED - Channel thumbnails + 3-channel free tier limit + Large channel warnings)
✅ **Phase 10.4a: Open Source Launch** (COMPLETED - Repository public, documentation complete, self-hosting validated)
✅ **Phase 10.4b: Tiered Channel Discovery** (COMPLETED - Smart public/private channel separation + Enhanced subscription system)
✅ **Phase 10.4c: Enhanced User Experience & Block Selection** (COMPLETED - Preset-based block limits + Customer portal fixes + UI polish)
✅ **Phase 10.5: Spatial Canvas** (COMPLETED - Supabase LW15 Hackathon Feature) - [See detailed plan](./docs/SPATIAL_PROTOTYPE_PLAN.md)
✅ **Phase 10.6: Better Auth + Polar Migration** (COMPLETED - Unified auth/billing system)
✅ **Phase 10.7: Supabase AI Migration** (COMPLETED - Full migration to Supabase AI embeddings)
🎯 **Current Phase**: Phase 10.4d - Template Enhancement + System Testing

**Live Application**: https://www.airena.io/  
**Open Source Repository**: https://github.com/adlai88/airena

## Latest Updates (Phase 10.7: Supabase AI Migration - COMPLETED ✅)

### 🚀 **Complete Migration to Supabase AI Embeddings**

**Implementation Date**: July 26, 2025  
**Status**: **LIVE - All embeddings now use Supabase AI**  
**Impact**: **Native Supabase integration with LW15 AI Session API**

### ✅ **What Was Accomplished**

#### **🧠 Supabase AI Session Integration**
- **Full migration** - Switched from OpenAI embeddings (1536-dim) to Supabase AI (384-dim)
- **Database schema update** - Modified pgvector column and all RPC functions for 384 dimensions
- **Edge Function deployment** - `/supabase/functions/generate-embedding/` using AI Session API
- **Application integration** - Updated embedding service with Supabase AI + OpenAI fallback
- **Production tested** - Successfully re-embedded all channels with Supabase AI

#### **🔧 Technical Implementation**
- **Model**: `gte-small` via Supabase.ai.Session
- **Dimensions**: 384 (vs OpenAI's 1536) - smaller, faster, more efficient
- **Feature flag**: `NEXT_PUBLIC_USE_SUPABASE_AI=true` enables Supabase AI
- **Migration SQL**: `/supabase/migrations/20250726_migrate_to_supabase_ai.sql`
- **Zero downtime**: Clean migration with data reset approach

#### **🎯 Benefits**
- **Native integration** - No external AI API dependencies
- **Performance** - Smaller vectors = faster similarity searches
- **Cost efficiency** - Free during LW15 (pricing TBD)
- **Future-proof** - Ready for Supabase AI enhancements

---

## Previous Updates (Phase 10.4c: Enhanced User Experience & Block Selection - COMPLETED ✅)

### 🎯 **Major UX Enhancement: Smart Block Selection & Customer Portal**

**Implementation Date**: July 14, 2025  
**Status**: **LIVE and fully functional**  
**Impact**: **Intelligent block limiting + Fixed subscription management + Enhanced user control**

### ✅ **What Was Accomplished**

#### **🎯 Intelligent Block Selection System**
- **Preset-based block limits** - smart options (25, 50, 100 blocks, all remaining) replace binary all-or-nothing choice
- **Dynamic presets** - options adapt based on user's remaining monthly allowance  
- **Large channel warnings** - enhanced modal with block count selection instead of "Process Anyway"
- **Backend block limiting** - sync API and service respect user-selected block limits
- **Visual feedback** - clear selection state and warnings for limit exceedance

#### **🔧 Customer Portal Integration** 
- **Fixed 404 customer portal** - implemented proper Polar.sh Next.js SDK integration
- **Pre-authenticated access** - automatic customer ID lookup via Clerk user email
- **Proper SDK usage** - replaced hardcoded URLs with `@polar-sh/nextjs` CustomerPortal utility
- **Error handling** - graceful fallback to manual portal if API issues occur
- **Environment security** - proper API key and organization ID configuration

#### **🎨 UI/UX Polish & Enhancements**
- **Dismissible success banners** - added close button to success messages for better interface visibility
- **Responsive design** - preset selection works seamlessly across device sizes
- **Smart defaults** - automatically selects maximum available blocks as default
- **Accessibility improvements** - proper ARIA labels and keyboard navigation

#### **🚀 API & Backend Improvements**
- **Block limit parameter** - sync API accepts and respects `blockLimit` from frontend
- **Enhanced sync service** - applies user-selected limits during processing pipeline
- **Customer lookup** - Polar.sh customer search by email for portal access
- **Environment configuration** - proper development and production environment setup

#### **🔧 Technical Achievements**
- **Zero-breaking changes** - all enhancements backward compatible
- **Type safety** - proper TypeScript interfaces for block limiting
- **Error resilience** - comprehensive error handling throughout sync pipeline
- **Performance maintained** - block limiting doesn't impact sync speeds

### 🎯 **Strategic Impact**

**User Experience & Control**:
- **Intelligent resource management** - users choose exactly how many blocks to process instead of all-or-nothing
- **Reduced friction** - no more binary "Process Anyway" vs "Cancel" decisions for large channels
- **Transparency** - clear understanding of block usage and remaining allowances
- **Subscription management** - working customer portal reduces support burden

**Technical Excellence**:
- **Professional integrations** - proper SDK usage instead of hardcoded workarounds
- **User-centric design** - features built around actual user needs and feedback
- **Maintainable codebase** - clean implementations that follow best practices
- **Error resilience** - comprehensive fallback strategies for edge cases

**Business Value**:
- **Improved retention** - users feel more in control of their block usage
- **Reduced support tickets** - working customer portal and clear UI reduce confusion
- **Professional polish** - attention to small details builds user trust
- **Platform maturity** - sophisticated block management shows product evolution

---

## 🎯 **Latest Update: Phase 10.5 - Spatial Canvas (COMPLETED & ENHANCED)**

### **Supabase LW15 Hackathon Submission**

**Implementation Date**: July 24-25, 2025  
**Branch**: `aryn-spatial` (ready to merge)  
**Feature**: Transform Are.na channels into self-organizing knowledge maps

### ✅ **What Was Built**

#### **🗺️ Spatial Intelligence Canvas**
- **Three-way view system** - Grid (default), Similarity (semantic clusters), Random (exploration)
- **Advanced K-means++ clustering** - Improved initialization with cosine distance for better semantic grouping
- **Organic scroll layout** - Vertical cluster arrangement for intuitive navigation
- **Viewport culling** - Only renders visible blocks for performance
- **Edge Function deployment** - Cluster analysis moved to Supabase Edge Function
- **tldraw integration** - Professional canvas with invisible shapes and drag-and-drop spatial manipulation
- **Modal detail view** - Click thumbnails for enlarged view with proper event isolation
- **Spatial-aware chat** - Context-aware AI chat that knows what you're looking at

#### **🚀 Technical Achievements**
- **pgvector semantic analysis** - Block similarity calculations using cosine distance
- **Improved clustering algorithm** - K-means++ initialization, cluster validation, merge threshold at 0.95
- **Performance optimized** - Handles 50+ blocks smoothly with viewport culling
- **Dark mode support** - Seamless theme integration
- **Mobile responsive** - Works on all devices
- **Bug fixes** - Resolved tldraw multiple instances warning, Next.js SWC issues, modal closing problems

### **Latest Improvements (July 25, 2025)**
- **K-means++ initialization** - Better centroid selection for more accurate clusters
- **Cosine distance** - Replaced Euclidean distance for high-dimensional embeddings
- **Dynamic k selection** - Uses sqrt(n) * 1.2 formula for optimal cluster count
- **Cluster validation** - Merges similar clusters (>0.95 similarity) and handles small clusters
- **Vertical scroll layout** - Organic arrangement with consistent hexagonal packing
- **Modal enhancements** - Fixed closing issues with proper tldraw event handling
- **Invisible shapes** - Clean visual appearance using opacity: 0 at top level

### **Ready for Hackathon**
- Core features complete and polished
- Edge cases handled (8 distinct clusters on founder-mode channel!)
- Demo channels identified
- Code cleaned up (removed debug logs, test files)

For full implementation details, see [SPATIAL_PROTOTYPE_PLAN.md](./docs/SPATIAL_PROTOTYPE_PLAN.md)

---

## ✅ **Phase 10.6: Better Auth + Polar Migration (COMPLETED)**

### **Strategic Achievement**
Successfully migrated from Clerk + Polar dual system to Better Auth + Polar unified authentication, while preserving anonymous access for demo users.

### **Implementation Date**: July 25, 2025  
**Status**: **LIVE and fully functional**  
**Impact**: **Simplified architecture + Better development experience + Anonymous access preserved**

### **What Was Accomplished**

#### **🔐 Better Auth Integration**
- **Supabase-native auth** - Better Auth configured with Supabase adapter
- **Database schema** - Added user, session, account, and verification tables
- **Field mapping** - Handled camelCase to snake_case conversions
- **Edge runtime compatibility** - Fixed crypto module issues with middleware

#### **💳 Polar Unified System**
- **Single auth/billing system** - Polar handles both authentication and payments
- **Webhook integration** - Subscription events update user tiers automatically
- **Customer portal** - Direct access to subscription management
- **Development-friendly** - Works locally without complex Clerk setup

#### **🚀 Migration Success**
- **User data preserved** - Migrated existing user from Clerk to Better Auth
- **Route updates** - Renamed /setup to /channels for clarity
- **Anonymous access** - Fixed public channel viewing for non-authenticated users
- **Session tracking** - Anonymous users can sync channels without signup

#### **🔧 Technical Improvements**
- **Feature flags** - NEXT_PUBLIC_USE_BETTER_AUTH for gradual rollout
- **Unified auth hooks** - Single useAuth() works with both systems
- **Anonymous sync fix** - Removed channels.user_id NOT NULL constraint
- **CORS handling** - Dynamic origin detection for local development

### ✅ **Clerk Removal Complete** (July 25, 2025)
- ✅ Removed all Clerk imports and code from middleware.ts
- ✅ Deleted Clerk webhook endpoint (/api/webhooks/clerk/route.ts)
- ✅ Removed Clerk dependencies from package.json (@clerk/nextjs, @clerk/themes)
- ✅ Fixed all TypeScript errors in Better Auth webhook handlers
- **Note**: Clerk environment variables need manual removal from .env.local:
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
  - CLERK_WEBHOOK_SECRET
  - NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
  - NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

### **Future Enhancement: OAuth Providers**
- **Google OAuth** - Add social login with Google accounts
- **GitHub OAuth** - Add developer-friendly GitHub authentication
- Better Auth supports both providers out of the box

### ✅ **Password Reset Implementation** (July 25, 2025)
- **Forgot Password Page** - Form to request password reset via email
- **Reset Password Page** - Token-based password reset form with validation
- **Better Auth Integration** - Console-based email logging for development
- **Middleware Fix** - Updated BETTER_AUTH_URL to correct port (3001)
- **Full Flow Working** - Complete password reset functionality tested and operational
- **Production Ready** - Needs email service (Resend/SendGrid) for actual email delivery

---

## 🚀 **Current Phase: Phase 10.4d - Template Enhancement + System Testing**

**Strategic Timing**: With authentication migration complete, focus on immediate value-add features before complex intelligence scoring.

### 🎯 **Current Priorities**

#### **Immediate (Week 1-2)**
1. **Test monthly reset system** - ensure existing monthly limits work correctly
2. **Activate brainstorm template** - enable creative free tier template
3. **Plan enhanced research report** - design Firecrawl integration for premium tier

#### **Development Focus (Week 2-4)** 
- **Template Priority 1**: Activate brainstorm template for free tier (encourages creativity)
- **Template Priority 2**: Enhanced research report with Firecrawl integration (premium justification)
- **System validation** - monthly reset testing before any weekly reset implementation

### 🚧 **Template Enhancement Strategy**

#### **📋 Template Implementation Plan**

**Free Tier Template**: Brainstorm Template
- **Current Status**: Coded but not active in UI
- **Function**: Generates creative ideas from existing channel content
- **Value**: Encourages engagement without web research costs
- **Implementation**: Activate in generate page UI

**Premium Tier Template**: Enhanced Research Report
- **Current Status**: Basic version exists, needs Firecrawl integration
- **Function**: Combines curated content with intelligent web research
- **Value**: Transforms static curation into dynamic research assistant
- **Implementation**: See `/docs/enhanced-research-report-template.md`

#### **📊 Reset System Testing Requirements**

**Monthly Reset System** (currently implemented but untested):
- **Free Tier**: 10 chat messages + 2 generations per channel per month
- **Starter Tier**: 200 blocks per month (unlimited chat/generations)
- **Pro Tier**: 500 blocks per month (unlimited chat/generations)

**Weekly Reset System** (future implementation):
- **Only needed for new free tier strategy**: 1 channel, 25 blocks total, weekly reset
- **Current priority**: Test monthly resets first

### 🚧 Phase 10.4e: Intelligence Score Foundation (LATER)

#### **🔮 Core Intelligence Score Feature**
Based on pricing strategy: *"Shows specific, personalized value locked behind upgrade"*

**Implementation Tasks:**
- [ ] **Are.na account analysis API** - fetch user's private channel metadata
- [ ] **Intelligence Score calculation** - analyze channel richness, topic diversity
- [ ] **Personalized upgrade preview** - show potential newsletters, report count
- [ ] **Privacy-first design** - metadata only, no content access
- [ ] **Upgrade flow integration** - seamless transition to Starter tier

#### **📊 Intelligence Score Display Components**
```
🔮 Your Intelligence Potential
📊 Private Channels Detected: 8 channels, 1,247 total blocks
🎯 High-Value Channels:
   • "Design Research" (347 blocks) → 14 potential newsletters
   • "AI Papers" (298 blocks) → High knowledge density
💡 Intelligence Coverage: 12 topics
🚀 Upgrade Impact: 50x more content available
```

#### **🎯 Conversion Psychology Elements**
- **FOMO Creation**: Specific, personalized value locked behind upgrade
- **Quantified Potential**: Numbers make upgrade value concrete  
- **Curiosity Gap**: Users want to know what insights their channels contain
- **Non-Pushy Presentation**: Helpful insight, not aggressive sales

### 🚧 Phase 10.4c: Enhanced Free Tier (LATER)

#### **📈 New Free Tier Strategy**
**Current**: 3 channels, 25 blocks per channel, chat only
**New**: 1 channel, 25 blocks total, weekly reset + 1 generation/week

**Implementation Tasks:**
- [ ] **Weekly reset system** - habit formation mechanics
- [ ] **Generation limit tracking** - 1 generation per week for free users  
- [ ] **Enhanced generation templates** - newsletters, insights, reports
- [ ] **Weekly engagement emails** - remind users when reset occurs

### 🛠 Technical Implementation Strategy

#### **Phase 10.4a: Open Source (1-2 days)**
1. Add LICENSE file and update package.json
2. Test self-hosting end-to-end with fresh setup
3. Make repository public
4. Launch on communities (r/MachineLearning, Are.na, etc.)

#### **Phase 10.4b: Intelligence Score (1-2 weeks)**  
1. **Week 1**: Are.na API integration + scoring algorithm
2. **Week 2**: UI components + upgrade flow integration

#### **Phase 10.4c: Enhanced Free Tier (1 week)**
1. Weekly reset infrastructure  
2. Generation templates and limits
3. Engagement mechanics

### 📊 Success Metrics

**Open Source Launch:**
- GitHub stars and forks growth
- Community discussions and contributions
- Self-hosting adoption feedback

**Intelligence Score:**
- Free → Starter conversion rate improvement (target: >25%)
- User engagement with Intelligence Score feature
- Upgrade click-through rates

**Enhanced Free Tier:**
- Weekly return visit rates
- Generation feature adoption
- Weekly reset engagement

### 🎯 Current Focus
**Immediate**: Complete open source launch preparation
**Next**: Validate community traction before Intelligence Score development
**Goal**: Build sustainable community foundation for long-term growth

---

## 📧 Future Enhancements

### **Email Service for Password Reset (Resend)**
Currently, password reset emails are only logged to console in development. To enable actual email delivery in production:

1. **Sign up for Resend** at https://resend.com
2. **Verify your domain** (airena.io) in Resend dashboard
3. **Get your API key** from Resend
4. **Add to Vercel environment variables**:
   - `RESEND_API_KEY` = your-resend-api-key
   - `NODE_ENV` = production

The code is already set up to use Resend when the API key is present. This will enable:
- Password reset emails
- Future: Welcome emails, notification emails, weekly digests

### **Image Generation in Spatial Canvas**
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

---

## ⚠️ TEMPORARY: Usage Caps Disabled (July 26, 2025)

**Context**: All usage limits and tracking have been temporarily disabled to allow for pricing restructure planning.

**What's Disabled**:
1. **Block processing limits** - No 25-block free tier limit
2. **Channel count limits** - No 3-channel free tier limit
3. **Chat message limits** - No 10 messages/month limit
4. **Generation limits** - No 2 generations/month limit
5. **Usage tracking** - No recording of usage to database

**Files Modified** (search for "TEMPORARILY DISABLED"):
- `/src/lib/sync.ts` - Block and channel limit checks bypassed
- `/src/app/api/chat/route.ts` - Chat limits and recording bypassed
- `/src/app/api/generate/route.ts` - Generation limits and recording bypassed

**ESLint Suppressions Added**:
- Unused variables (`userId`, `userSessionId`, `UsageTracker`) have eslint-disable comments

**To Re-enable**:
1. Search codebase for "TEMPORARILY DISABLED"
2. Uncomment the original code blocks
3. Remove the temporary mock `usageInfo` object
4. Remove eslint-disable comments for the variables
5. Test all limit enforcement and recording

**Why**: User reported being on Starter plan but system treating as Free tier. Decision made to disable all caps while redesigning pricing structure.

---

## 🚀 Phase 10.8: Authentication Requirement & Simple Usage Tracking (July 27, 2025)

### **Major Architecture Change: Remove Anonymous Access**

**Implementation Date**: July 27, 2025  
**Status**: **COMPLETED ✅**  
**Impact**: **All users must authenticate + 50-block lifetime limit for free tier**

### **What Was Accomplished**

#### **🔐 Authentication Required for All Features**
- **Middleware updated** - `/channels` and `/canvas` routes now require authentication
- **API routes secured** - `/api/sync`, `/api/chat`, `/api/generate` all require auth
- **Landing page updated** - Changed "Try Demo" to "Get Started Free" with "50 blocks free • No credit card required"
- **No more anonymous access** - All features require user sign-in

#### **📊 Simple Usage Tracking System**
- **New SimpleUsageTracker class** - Replaces complex session-based tracking
- **50-block lifetime limit** - Free users get 50 blocks total (not per month)
- **Database migration** - Added `lifetime_blocks_used` column to users table
- **RPC function** - `increment_lifetime_blocks` for atomic usage updates
- **Sync service updated** - Integrated with SimpleUsageTracker for usage checks and recording

#### **🎨 UI Updates for Lifetime Usage**
- **New API endpoint** - `/api/lifetime-usage` returns current usage stats
- **Channels page** - Shows "Lifetime Blocks: 32/50 (18 remaining)" with warnings
- **Success messages** - Display remaining blocks after sync completion
- **Usage dashboard** - Free tier shows lifetime usage with progress bar
- **Visual indicators** - Orange warning at ≤10 blocks, upgrade prompt at 0 blocks

#### **🧹 Session ID Removal**
- **Frontend cleanup** - Removed all sessionId state and localStorage logic
- **API updates** - Removed x-session-id headers from all requests
- **Components updated** - SpatialCanvas, channels page, all API routes
- **Authentication required** - All endpoints now require authenticated users

#### **🔧 Technical Implementation**
- **Fixed TypeScript errors** - Added proper type annotations to Supabase queries
- **ESLint fixes** - Removed unused variables and imports
- **Clean build** - All TypeScript and ESLint errors resolved
- **Deployment successful** - Live on Vercel with all changes

#### **📝 Complete File Changes**
- `/src/lib/simple-usage.ts` - New simplified usage tracking (50-block lifetime limit)
- `/src/lib/sync.ts` - Updated to use SimpleUsageTracker instead of complex usage system
- `/src/app/api/sync/route.ts` - Requires authentication, no more sessionId
- `/src/app/api/chat/route.ts` - Requires authentication, removed unused UsageTracker
- `/src/app/api/generate/route.ts` - Requires authentication, removed unused UsageTracker
- `/src/app/api/lifetime-usage/route.ts` - NEW: Returns lifetime usage stats
- `/src/app/api/channel-limits/route.ts` - Requires auth, no sessionId
- `/src/app/api/large-channel-check/route.ts` - Requires auth, no sessionId
- `/src/middleware.ts` - Protected `/channels` and `/canvas` routes
- `/src/app/page.tsx` - Updated messaging for authentication requirement
- `/src/app/channels/page.tsx` - Added lifetime usage display, removed sessionId
- `/src/app/usage/page.tsx` - Shows lifetime usage for free tier
- `/src/components/SpatialCanvas.tsx` - Removed sessionId from chat

### **🎯 Current Pricing Structure**

#### **Free Tier**
- **50 blocks lifetime limit** - Enforced and displayed in UI
- **3 channel limit** - TEMPORARILY DISABLED
- **No chat/generation limits** - TEMPORARILY DISABLED
- **Public channels only** - Private channels require upgrade

#### **Starter Tier ($5/month)**
- **No lifetime limit** - Unlimited lifetime processing
- **Monthly limits** - TEMPORARILY DISABLED (was 200 blocks/month)
- **Unlimited channels**
- **Private channel access**

#### **Pro Tier ($19/month)**
- **No lifetime limit** - Unlimited lifetime processing
- **Monthly limits** - TEMPORARILY DISABLED (was 500 blocks/month)
- **Unlimited channels**
- **Private channel access**

### **🎯 Next Steps**
- Test the 50-block lifetime limit system thoroughly
- Re-enable monthly limits after testing
- Add OAuth providers (Google, GitHub) to Better Auth
- Consider weekly reset for free tier engagement

