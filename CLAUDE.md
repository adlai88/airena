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
🎯 **Next Phase**: Phase 10.4c - Intelligence Score Development + Community Building

**Live Application**: https://www.airena.io/  
**Open Source Repository**: https://github.com/adlai88/airena

## Latest Updates (Phase 10.4b: Tiered Channel Discovery - COMPLETED ✅)

### 🎯 **Major System Enhancement: Smart Channel Discovery & Security**

**Implementation Date**: July 14, 2025  
**Status**: **LIVE and fully functional**  
**Impact**: **Resolved critical security vulnerability + Enhanced user experience**

### ✅ **What Was Accomplished**

#### **🔒 Critical Security Vulnerability Resolution**
- **Fixed private channel exposure** - private channels were accessible to all users
- **Implemented proper user isolation** - Row Level Security (RLS) policies enforced
- **Channel ownership tracking** - all channels now properly associated with users
- **Privacy by design** - public channels shareable, private channels user-specific

#### **🎯 Smart Channel Discovery System**
- **Tiered access model** - public channels visible to everyone, private channels premium-only
- **Enhanced /setup experience** - no more empty channel lists for new users
- **Tabbed interface** - seamless switching between "Public Channels" and "Private Channels"
- **Upgrade motivation** - clear value proposition for private channel access

#### **💰 Enhanced Subscription System**
- **Unified Polar integration** - all tier changes (including downgrades) through Polar checkout
- **Improved checkout UX** - redirects back to pricing page with success confirmation
- **Fixed sync errors** - resolved monthly_usage table schema issues for premium users
- **Smart privacy detection** - automatic public/private classification during sync

#### **🚀 API & Database Improvements**
- **Enhanced /api/recent-channels** - supports `?type=public|private` filtering
- **Database migrations** - added `is_private` column and proper constraints
- **RLS policies** - users can see public channels OR their own private channels
- **Schema synchronization** - fixed column naming inconsistencies

#### **🎨 User Experience Enhancements**
- **Suspense boundaries** - fixed Next.js build errors with proper async handling
- **Success messaging** - checkout completion flows back to pricing with confirmation
- **Visual indicators** - "Private" badges on private channels
- **Responsive design** - tabs work seamlessly across device sizes

#### **🔧 Technical Achievements**
- **Zero-downtime deployment** - all changes backward compatible
- **Type safety** - enhanced TypeScript interfaces for channel privacy
- **Error handling** - graceful fallbacks for missing channels or permissions
- **Performance optimization** - efficient queries with proper indexing

### 🎯 **Strategic Impact**

**Security & Privacy**:
- **Enterprise-ready security** - proper user isolation and privacy protection
- **Compliance foundation** - RLS policies ensure data access compliance
- **Trust building** - users can confidently sync private content

**User Experience**:
- **Eliminated confusion** - new users immediately see available content
- **Clear value proposition** - users understand premium benefits
- **Seamless workflows** - consistent experience across all user tiers

**Business Model**:
- **Enhanced conversion funnel** - free users see locked premium features
- **Reduced support burden** - self-service upgrade flows
- **Platform scalability** - architecture supports growth

---

## 🚀 **Next Phase: Phase 10.4c - Intelligence Score Development**

**Strategic Timing**: With security vulnerabilities resolved and discovery system in place, focus on advanced features that drive engagement and retention.

### 🎯 **Current Priorities**

#### **Immediate (Week 1-2)**
1. **Monitor system stability** - ensure tiered discovery system performs well under load
2. **User feedback collection** - gather insights on new channel discovery experience
3. **Intelligence Score research** - Are.na API capabilities, personalization algorithms

#### **Development Focus (Week 2-4)** 
- **Intelligence Score MVP** - personalized content analysis and recommendations
- **Enhanced analytics** - user engagement tracking and optimization
- **Performance monitoring** - ensure new features don't impact sync speeds

### 🚧 Phase 10.4c: Intelligence Score Foundation (NEXT)

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

[Rest of the file remains unchanged]