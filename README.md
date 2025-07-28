# Aryn: Spatial Intelligence for Are.na Channels

Transform any Are.na channel into an intelligent knowledge base. Experience multimodal AI across websites, PDFs, images, and videos.

## ✨ Try It Now (No Signup Required)
Paste any public Are.na channel URL → Instant AI intelligence

**Live Demo**: https://www.aryn.im/

## 🎯 Perfect For

- **Designers** discovering patterns in visual research
- **Researchers** extracting insights from academic collections  
- **Creators** exploring connections across curated content
- **Teams** building intelligence from shared knowledge

## 🚀 Features

### Complete Multimodal Intelligence
- **Websites**: Extract and analyze web content using Jina AI
- **PDFs**: Process documents and research papers
- **Images**: Visual analysis with GPT-4V
- **Videos**: YouTube content extraction with official API
- **Text blocks**: Index user annotations and thoughts

### Intelligent Chat Interface
- **Hybrid knowledge mode**: Prioritizes your curated content while providing helpful general knowledge
- **Visual context**: See thumbnails of referenced content
- **Source attribution**: Direct links to original Are.na blocks

### Content Generation
- **Newsletter creation**: Transform research into readable insights
- **Research summaries**: Extract key patterns and themes
- **Custom templates**: Generate content tailored to your needs

### 🗺️ Spatial Canvas (NEW - Supabase LW15 Feature)
- **Semantic clustering**: Automatically organizes blocks by meaning using pgvector
- **Three-way view**: Grid (default), Similarity (semantic clusters), Random (exploration)
- **Drag-and-drop**: Rearrange and explore your knowledge spatially
- **Spatial chat**: AI understands what you're looking at on the canvas

## 💡 Quick Start

### Option 1: Try the Hosted Service
Visit [www.aryn.im](https://www.aryn.im/) and paste any public Are.na channel URL.

### Option 2: Self-Host (Open Source)
```bash
# Clone the repository
git clone https://github.com/adlai88/airena.git
cd airena

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Set up database
npm run db:setup

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database with pgvector extension
- OpenAI API key (for embeddings and GPT-4)
- Are.na API key (optional, for private channels)

## 🔧 Environment Setup

Required environment variables for self-hosting:

```bash
# Core Configuration
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."

# Optional (for private channels)
ARENA_API_KEY="your-arena-api-key"

# Optional (for video processing)
YOUTUBE_API_KEY="your-youtube-api-key"

# Optional (for enhanced web extraction)
JINA_API_KEY="your-jina-api-key"
```

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for detailed setup instructions.

## 🏗️ Architecture

```
src/
├── app/              # Next.js app router pages
├── components/       # React UI components  
├── lib/              # Core intelligence layer
│   ├── arena.ts      # Are.na API client
│   ├── extraction.ts # Content processing pipeline
│   ├── embeddings.ts # Vector similarity search
│   └── chat.ts       # AI conversation interface
└── hooks/           # React state management
```

**Open Source Core**: Complete multimodal intelligence pipeline
**Hosted Service**: Adds user accounts, private channels, higher limits

## 📊 Supported Content Types

| Type | Source | Processing | Status |
|------|--------|------------|--------|
| **Websites** | Link blocks | Jina AI extraction | ✅ Complete |
| **PDFs** | Attachment blocks | Jina AI processing | ✅ Complete |
| **Images** | Image blocks | GPT-4V analysis | ✅ Complete |
| **Videos** | Media/Link blocks | YouTube API extraction | ✅ Complete |
| **Text** | Text blocks | Direct indexing | ✅ Complete |

## 🎨 Built With

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui design system
- **Backend**: Vercel Edge Functions, Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI (embeddings + GPT-4 + GPT-4V), YouTube Data API v3
- **Content**: Are.na API, Jina AI Reader

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test locally
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Areas for Contribution
- **Templates**: New content generation templates
- **Integrations**: Additional content sources and APIs
- **UI/UX**: Design improvements and accessibility
- **Documentation**: Setup guides and tutorials
- **Testing**: Expanded test coverage

## 📚 Documentation

- [Self-Hosting Guide](docs/SELF_HOSTING.md)
- [API Documentation](docs/API.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 💰 Hosted Service vs Self-Hosting

### Open Source (Self-Hosted)
- ✅ Complete multimodal intelligence
- ✅ Public channel processing
- ✅ Unlimited usage
- ✅ Full source code access
- ❌ Requires technical setup
- ❌ Public channels only

### Hosted Service
- ✅ Zero setup required
- ✅ Private channel access
- ✅ User account management
- ✅ Professional support
- 💰 **Starter**: $5/month (200 blocks, private channels)
- 💰 **Pro**: $14/month (500 blocks, advanced features)

## 🌟 Community & Support

- **GitHub Discussions**: Community support and feature requests
- **Issues**: Bug reports and technical problems
- **Are.na**: Follow our [Are.na channel](https://www.are.na/aryn) for updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Are.na** for creating an incredible platform for thoughtful curation
- **The Are.na community** for inspiration and feedback
- **OpenAI** for GPT-4 and embedding capabilities
- **Jina AI** for excellent content extraction
- **shadcn/ui** for the beautiful component system

---

**Made with 🧠 for the Are.na community**

Transform your curation advantage into your intelligence advantage.
