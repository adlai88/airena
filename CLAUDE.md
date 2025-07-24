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
✅ **Phase 10.5: Spatial Canvas** (COMPLETED - Supabase LW15 Hackathon Feature)
🎯 **Next Phase**: Phase 10.6 - Clerk → Polar Auth Migration

**Live Application**: https://www.airena.io/  
**Open Source Repository**: https://github.com/adlai88/airena

## Latest Updates (Phase 10.4c: Enhanced User Experience & Block Selection - COMPLETED ✅)

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

## 🎯 **Latest Update: Phase 10.5 - Spatial Canvas (COMPLETED)**

### **Supabase LW15 Hackathon Submission**

**Implementation Date**: July 24-25, 2025  
**Branch**: `aryn-spatial` (ready to merge)  
**Feature**: Transform Are.na channels into self-organizing knowledge maps

### ✅ **What Was Built**

#### **🗺️ Spatial Intelligence Canvas**
- **Three-way view system** - Grid (default), Similarity (semantic clusters), Random (exploration)
- **K-means clustering** - Automatic semantic grouping with GPT-4 generated labels
- **Viewport culling** - Only renders visible blocks for performance
- **Edge Function deployment** - Cluster analysis moved to Supabase Edge Function
- **tldraw integration** - Professional canvas with drag-and-drop spatial manipulation
- **Spatial-aware chat** - Context-aware AI chat that knows what you're looking at

#### **🚀 Technical Achievements**
- **pgvector semantic analysis** - Block similarity calculations using embeddings
- **Performance optimized** - Handles 50+ blocks smoothly with viewport culling
- **Dark mode support** - Seamless theme integration
- **Mobile responsive** - Works on all devices

### **Ready for Hackathon**
- Core features complete and polished
- Edge cases handled
- Demo channels identified
- Code cleaned up (removed debug logs, test files)

---

## 🚀 **Next Phase: Phase 10.6 - Clerk → Polar Auth Migration**

### **Strategic Rationale**
With zero existing users and potential hackathon traffic incoming, now is the perfect time to migrate from dual auth/billing systems to Polar's unified solution.

### **Migration Benefits**
1. **Single system** for authentication + billing
2. **Works in development** without special Clerk setup
3. **Simpler architecture** - no metadata syncing between systems
4. **Better user tracking** from day one
5. **Reduced complexity** - one less service dependency

### **Planned Approach**
1. **Require authentication** for all users (no more anonymous access complexity)
2. **Use Polar OAuth** for sign up/sign in
3. **Direct integration** - user data and subscription in one place
4. **Update messaging** - "Free to start" instead of "No signup required"

### **Timeline**
- After spatial canvas is merged and deployed
- Complete before major user acquisition begins
- Test thoroughly with the single existing user (you!)

---

## 🚀 **Previous Phase: Phase 10.4d - Template Enhancement + System Testing**

**Strategic Timing**: With user experience polished, focus on immediate value-add features before complex intelligence scoring.

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

## 🔐 Phase 10.6: Authentication Migration - Clerk to Polar

### Current Auth Architecture (Clerk)

**Key Integration Points:**
1. **Middleware** (`src/middleware.ts`)
   - Protects routes using `clerkMiddleware()`
   - Public routes: home, setup, pricing, legal pages, API routes
   - Protected routes: channels, generate, usage, settings

2. **User Management**
   - Users table synced via Clerk webhooks (`/api/webhooks/clerk`)
   - User ID mapping: `clerk_user_id` → `users.id`
   - Email and metadata stored locally

3. **Auth Hooks & Components**
   - `useAuth()` hook used throughout for user state
   - `SignIn`/`SignUp` components from `@clerk/nextjs`
   - `UserButton` for account management

4. **API Protection**
   - Routes check `auth().userId` for authentication
   - User lookup via `clerk_user_id` in database

5. **Key Dependencies**
   - `@clerk/nextjs`: UI components and hooks
   - Clerk environment variables: `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`

### Known Issues to Address

1. **Unauthenticated Sync Bug**
   - New/unauthenticated users can't sync channels
   - Error: "User not found" in sync endpoint
   - Need to handle guest/anonymous syncing

2. **User Data Migration**
   - Only 1 user currently (makes migration simpler)
   - Need to map Clerk user ID to Polar customer ID

### Polar Integration Considerations

**What we know:**
- Polar already handles payments/subscriptions
- Has customer portal for subscription management
- Email-based customer identification
- Need to review Polar's auth capabilities

**Migration Strategy (High-Level):**
1. Review Polar auth documentation
2. Create migration plan preserving existing user data
3. Update middleware and auth checks
4. Replace Clerk components with Polar equivalents
5. Update API endpoints to use Polar auth
6. Test thoroughly with existing user account

**Database Considerations:**
- Add `polar_customer_id` to users table
- Maintain `clerk_user_id` during transition
- Eventually remove Clerk fields after migration

[Rest of the file remains unchanged]