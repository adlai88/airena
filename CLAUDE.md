# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Aryn v2 - Open Source Project

## Project Overview

Aryn transforms curated Are.na channels into an intelligence agent that generates content from your own research. Instead of searching through bookmarks manually, users can generate newsletters, reports, and insights using AI powered by their personally curated content.

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

**Live Application**: https://www.aryn.im/  
**Open Source Repository**: https://github.com/adlai88/aryn

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

## Task Management

We use Linear for project management and issue tracking. Check the Linear workspace for active issues and priorities.

## Contributing Guidelines

### Code Style
- Follow existing patterns in the codebase
- Use TypeScript for type safety
- Leverage existing utilities and libraries
- Maintain responsive design principles

### Database Changes
- Always use SINGULAR table names
- Create proper migrations
- Test with both auth systems during transition

### Testing
- Verify changes work with Better Auth
- Test subscription flows with Polar
- Ensure mobile responsiveness

## Self-Hosting

For self-hosting instructions, see [/docs/SELF_HOSTING.md](/docs/SELF_HOSTING.md)

## Additional Documentation

- [Spatial Canvas Implementation](/docs/SPATIAL_PROTOTYPE_PLAN.md)
- [Better Auth Testing Guide](/docs/BETTER_AUTH_TESTING_GUIDE.md)
- [Migration History](/docs/CLERK_TO_POLAR_MIGRATION_PLAN_SUPABASE.md)

## Recent Changes

### Latest Updates
- **CSV Import Tool**: Added `scripts/csv-to-arena.js` for bulk importing reading lists from CSV to Are.na channels
- **Template Cleanup**: Removed deprecated brainstorm template from generation system
- **Clerk References**: Cleaned up remaining references after migration to Better Auth
- **Usage Caps**: Currently disabled pending pricing restructure (search "TEMPORARILY DISABLED" in codebase)