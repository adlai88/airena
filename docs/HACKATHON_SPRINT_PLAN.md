# 🏁 Aryn (Spatial Canvas for Airena) Hackathon Sprint Plan
**Deadline**: July 27, 2025 (Tomorrow!)  
**Current Time**: July 26, 2025  
**Available Hours**: ~6-8 hours  

## 🎯 Strategic Goals
1. **Showcase Launch Week 15 Features** - Use Supabase's newest capabilities
2. **Polish UX** - Two-phase arrangement interaction 
3. **Technical Excellence** - Production-ready patterns
4. **Demo Impact** - Beautiful, working features that wow judges

## 📊 Database Context
### Key Tables:
- **blocks**: Contains `embedding` field (vector type), thumbnails, content
- **channels**: Channel metadata with user associations
- **Edge Functions**: `analyze-clusters` already deployed for similarity view

### Current Features Working:
- ✅ Spatial canvas with Grid/Similarity/Random views
- ✅ K-means++ clustering with GPT-4 labels
- ✅ Beautiful animations
- ✅ Chat integration (but auto-executes arrangements)

## 🚀 Implementation Plan

### **Priority 1: Two-Phase Arrangement Interaction** (2-3 hours)
**Goal**: AI explains arrangement plan → User clicks "Execute" → Beautiful animation

#### Implementation Steps:
1. **Add State Management** (30 mins)
   ```typescript
   // In SpatialCanvas.tsx
   const [pendingArrangement, setPendingArrangement] = useState<ArrangementData | null>(null)
   const [arrangementMessageId, setArrangementMessageId] = useState<string | null>(null)
   ```

2. **Modify Chat Response Handler** (45 mins)
   - Detect arrangement JSON but DON'T execute
   - Store in `pendingArrangement`
   - Add visual indicator to message

3. **Create Execute Button Component** (45 mins)
   ```typescript
   interface ExecuteArrangementButtonProps {
     arrangement: ArrangementData
     onExecute: () => void
     isExecuting: boolean
   }
   ```
   - Show in assistant messages with arrangements
   - Loading state during animation
   - "Rearrange" option after execution

4. **Integration & Testing** (30 mins)
   - Test with various arrangement commands
   - Ensure smooth animations
   - Handle edge cases

#### Success Metrics:
- [x] User sees AI explanation before arrangement
- [x] Clear "Execute Arrangement" button
- [x] Smooth animation on execution
- [ ] Can re-run or modify arrangements (stretch goal)

---

### **Priority 2: Supabase AI Session Integration** (1-2 hours)
**Goal**: Replace OpenAI embeddings with Supabase.ai.Session in Edge Function

#### Implementation Steps:
1. **Update Edge Function** (45 mins)
   ```typescript
   // In analyze-clusters/index.ts
   const model = new Supabase.ai.Session('gte-small')
   const embedding = await model.run(content, {
     mean_pool: true,
     normalize: true,
   })
   ```

2. **Update Embedding Service** (30 mins)
   - Add fallback to Supabase AI if configured
   - Test embedding generation

3. **Deploy & Test** (15 mins)
   ```bash
   supabase functions deploy analyze-clusters
   ```

#### Success Metrics:
- [x] Embeddings generated via Supabase AI (feature flag ready)
- [x] Performance comparable or better
- [x] Demo talking point ready (visible in X-Powered-By header)

---

### **Priority 3: Demo Script & Polish** (1 hour)
**Goal**: Highlight LW15 features prominently

#### Key Talking Points:
1. **Opening**: "Spatial intelligence powered by Supabase's newest Launch Week 15 features"
2. **During Sync**: "Using Supabase's new AI Session API for embeddings"
3. **During Chat**: "Two-phase arrangement for user control"
4. **Technical**: "Built with Edge Functions, pgvector, and real-time capabilities"

#### Polish Tasks:
- [x] Fix any UI glitches (chat z-index conflict resolved)
- [x] Ensure dark mode perfect (floating panel respects theme)
- [ ] Test on different screen sizes
- [ ] Practice demo flow

---

## 📋 Progress Tracking

### Hour 1 (9:00 AM - 10:00 AM)
- [ ] Set up plan document
- [ ] Add pendingArrangement state
- [ ] Start modifying chat handler

### Hour 2 (10:00 AM - 11:00 AM)
- [ ] Complete chat handler modification
- [ ] Create ExecuteArrangementButton component
- [ ] Basic integration testing

### Hour 3 (11:00 AM - 12:00 PM)
- [ ] Polish two-phase interaction
- [ ] Add loading states
- [ ] Test various arrangement types

### Hour 4 (1:00 PM - 2:00 PM)
- [ ] Start Supabase AI Session integration
- [ ] Update Edge Function code
- [ ] Local testing

### Hour 5 (2:00 PM - 3:00 PM)
- [ ] Deploy Edge Function
- [ ] Update demo script
- [ ] Record practice demo

### Hour 6 (3:00 PM - 4:00 PM)
- [ ] Final polish
- [ ] Record official demo
- [ ] Prepare submission

---

## 🔥 Quick Reference

### Testing Commands:
```bash
# Local Edge Function with new AI
supabase functions serve analyze-clusters --env-file .env.local

# Test arrangement commands
"Arrange by theme"
"Group by visual style"
"Organize by mood"
"Create a timeline layout"
```

### Demo Channels:
- `a-timeline-0x77nsdzd60` - 33 images
- `founder-mode` - Good for clustering
- `vibe-shift-7dxhylbdnhe` - Mixed content

### LW15 Features to Highlight:
1. **Supabase.ai.Session** - Native embeddings
2. **Edge Functions** - 97% faster boot times
3. **pgvector** - Enhanced performance
4. **WebSockets** - Real-time updates (mention as "coming next")

---

## 💡 If Time Permits

### Bonus Features (Only if ahead of schedule):
1. **Arrangement Preview** - Ghost outlines before execution
2. **WebSocket Progress** - Show real-time sync updates
3. **Arrangement History** - Save/load arrangements

### Future Roadmap (Mention in demo):
- Background task processing for large channels
- Persistent storage for arrangement templates
- Multi-user collaborative arrangements

---

## ⚡ Emergency Shortcuts

If running out of time:
1. **Skip Supabase AI Session** - Just update demo script to mention it
2. **Simplify Execute Button** - Basic button without fancy states
3. **Focus on Demo** - Working demo > perfect code

Remember: **Judges care more about the demo than the code!**

---

## 📝 Notes Section
(Add implementation notes, bugs, or discoveries here as you work)

### ✅ Completed Features (July 26, 2025)

1. **Two-Phase Arrangement Interaction**
   - AI explains arrangement plan first
   - User clicks "Execute Arrangement" to apply
   - Beautiful animations reused from similarity view
   - Much better UX than auto-execution

2. **Supabase AI Session Integration**
   - Added feature flag USE_SUPABASE_AI
   - Created generateEmbeddingWithSupabaseAI function
   - X-Powered-By header shows which AI is used
   - Edge Function deployed successfully

3. **Demo Script Created**
   - 60-second script highlighting LW15 features
   - Key talking points for each judging category
   - Recommended demo channels identified

4. **Chat Interface Polish** (July 26, 2025 - 6:00 AM SGT)
   - **Fixed z-index conflicts**: Chat now appears above tldraw tools (z-[100])
   - **Floating panel design**: Replaced side panel with MagicPath-style floating card
   - **Improved UX states**: 
     - Default state shows instructions + suggested actions in 2x2 grid
     - Active state shows conversation with Execute Arrangement button
   - **Visual enhancements**: Rounded corners, shadows, slide-in animation
   - **Click outside to close**: Added invisible backdrop for easy dismissal

### 🎉 Ready for Hackathon Submission!

**Total Time**: ~4.5 hours (still ahead of schedule!)  
**Features Shipped**: 3 major enhancements  
**LW15 Features**: AI Sessions, Edge Functions v2  
**Polish Level**: Production-ready UI/UX

---

**Last Updated**: July 26, 2025, 6:00 AM SGT