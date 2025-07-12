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

## 📈 Current Status: Open Source Launch Ready

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
✅ **Phase 10.3: Visual Enhancement & Channel Limits** (COMPLETED - Channel thumbnails + 3-channel free tier limit)
✅ **Latest Status Update**: Enhanced UX with visual channel identification and proper freemium incentive structure

**Live Application**: https://www.airena.io/

## Latest Updates (Phase 10.3: Visual Enhancement & Channel Limits)

### ✅ Channel Thumbnails Feature
- **Database**: Added `thumbnail_url` column to channels table
- **Backend**: Automatic thumbnail generation from first image block during sync
- **Frontend**: Visual 40x40px thumbnails in channel selectors with fallback design
- **UX**: Letter-based placeholders for channels without images
- **Coverage**: Applied to both setup page and usage dashboard

### ✅ 3-Channel Limit for Free Tier
- **Business Model Fix**: Prevents free users from getting more blocks than paid users
- **Implementation**: Server-side validation with proper error handling
- **UX Flow**: Authentication-aware upgrade messaging
  - Authenticated: "Upgrade to Starter" → `/pricing`
  - Unauthenticated: "Create free account" → `/sign-up?redirect=/pricing`
- **Grandfathering**: Existing users unaffected, only applies to new channel additions
- **Re-sync Support**: Can always refresh existing channels regardless of limit

### 🔧 Technical Infrastructure
- **Migration**: `20250712_add_channel_thumbnails.sql` 
- **API Endpoints**: `/api/channel-limits` for limit checking
- **Type Safety**: Enhanced TypeScript interfaces for channel data
- **Error Handling**: Proper build fixes for Vercel deployment

### 📊 Updated Tier Structure
**Free Tier**: 25 blocks/channel × 3 channels max = 75 blocks total
**Starter Tier**: 200 blocks/month × unlimited channels  
**Pro Tier**: 500 blocks/month × unlimited channels

This creates a logical upgrade path and fixes the incentive structure where free users could theoretically process unlimited blocks.

[Rest of the file remains unchanged]