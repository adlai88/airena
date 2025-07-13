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
🎯 **Next Phase**: Phase 10.4b - Intelligence Score Development + Community Building

**Live Application**: https://www.airena.io/  
**Open Source Repository**: https://github.com/adlai88/airena

## Latest Updates (Phase 10.4a: Open Source Launch - COMPLETED ✅)

### 🎉 **Major Milestone Achieved: Open Source Launch**

**Repository**: https://github.com/adlai88/airena  
**Launch Date**: July 13, 2025  
**Status**: **LIVE and fully functional**

### ✅ **What Was Accomplished**

#### **Complete Self-Hosting Validation**
- **End-to-end testing** with fresh Supabase instance
- **Database schema audit** - synchronized production schema with self-hosting setup
- **Systematic issue resolution** - fixed all missing columns, constraints, and indexes
- **Full functionality verified** - sync, embedding, and chat all working perfectly

#### **Production-Ready Documentation**
- **Comprehensive README.md** - features, setup, contribution guidelines
- **Complete SELF_HOSTING.md** - step-by-step deployment guide for multiple platforms
- **Professional CONTRIBUTING.md** - detailed contributor guidelines and project structure
- **Proper environment setup** - `.env.example` with all required variables documented

#### **Repository Standards**
- **MIT License** - proper open source licensing
- **Package.json metadata** - repository URLs, license, homepage links
- **Professional structure** - clean codebase organization ready for contributors

#### **Technical Achievements**
- **Database Schema Synchronization** - self-hosting database now matches production exactly
- **Missing Component Resolution** - fixed all self-hosting blockers systematically
- **Performance Optimization** - proper indexes and constraints for scalability
- **Validation Through Testing** - confirmed 12/12 blocks sync + chat functionality

#### **Key Fixes During Testing**
1. **Missing .env.example file** - created comprehensive example
2. **Database setup issues** - fixed environment variable loading
3. **Schema mismatches** - synchronized all missing columns and constraints
4. **Unique constraint errors** - added proper `blocks_arena_id_key` constraint
5. **Documentation gaps** - updated Supabase connection instructions

### 🎯 **Strategic Impact**

**Open Source Positioning**: 
- **Complete multimodal AI platform** available for self-hosting
- **Clear value separation** between open source and hosted service
- **Community-first approach** with professional documentation standards

**Technical Validation**:
- **Self-hosting works end-to-end** - verified with systematic testing
- **Documentation is accurate** - tested from fresh environment setup
- **Repository is contributor-ready** - professional standards throughout

---

## 🚀 **Next Phase: Phase 10.4b - Intelligence Score Development**

**Strategic Timing**: Begin Intelligence Score development now that open source foundation is solid and community building can happen in parallel.

### 🎯 **Current Priorities**

#### **Immediate (Week 1-2)**
1. **Monitor open source community** - respond to issues, gather feedback
2. **Optional community outreach** - share on relevant platforms when ready
3. **Begin Intelligence Score research** - Are.na API capabilities, scoring algorithms

#### **Development Focus (Week 2-4)** 
- **Intelligence Score MVP** - core algorithm and basic UI
- **Community feedback integration** - improve self-hosting based on user reports
- **Documentation refinements** - based on real user experiences

### 🚧 Phase 10.4b: Intelligence Score Foundation (NEXT)

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