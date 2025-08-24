# Contributing to Aryn

We love your input! We want to make contributing to Aryn as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests Welcome
Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Tech Stack

- **Frontend**: Next.js 15 + React with Vercel AI SDK
- **Backend**: Vercel Edge Functions + Supabase (pgvector)
- **AI**: Supabase AI embeddings (384-dim) + GPT-4 generation + GPT-4V vision
- **Content**: Are.na API + Jina AI extraction + vision analysis
- **UI**: shadcn/ui design system with mobile-responsive foundation
- **Embeddings**: Supabase AI Session API (LW15 feature) - migrated from OpenAI
- **Authentication**: Better Auth with Supabase adapter
- **Billing**: Polar.sh for subscriptions

## Important Database Conventions

### Table Naming: SINGULAR (not plural)
**⚠️ CRITICAL**: Our database uses **SINGULAR** table names following Better Auth's convention:
- ✅ `user` (NOT `users`)
- ✅ `session` (NOT `sessions`)
- ✅ `account` (NOT `accounts`)
- ✅ `verification` (NOT `verifications`)

This is because Better Auth created these tables and uses singular naming. All new tables should follow this convention for consistency. DO NOT attempt to rename these tables to plural as it will break authentication.

### Database Changes
- Always use SINGULAR table names
- Create proper migrations
- Test with both auth systems during transition

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

## Getting Started

### Development Setup

```bash
# Fork and clone your fork
git clone https://github.com/your-username/aryn.git
cd aryn

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys and configuration

# Required for basic functionality:
# - DATABASE_URL (Supabase PostgreSQL with pgvector)
# - SUPABASE_URL and SUPABASE_ANON_KEY 
# - BETTER_AUTH_SECRET (generate with: openssl rand -base64 32)
# - OPENAI_API_KEY (for chat completions)

# Optional for enhanced features:
# - ARENA_API_KEY (private channels)
# - YOUTUBE_API_KEY (better video processing)
# - JINA_API_KEY (enhanced web extraction)
# - POLAR_* (billing/subscriptions)

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation

# Testing commands
npm run test:setup   # Test API integrations
npm run test:arena   # Test Are.na client
npm run test:pipeline # Test sync pipeline
```

## Code Style

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for public functions

```typescript
/**
 * Extract content from an Are.na block
 * @param block - The Are.na block to process
 * @returns Processed block with extracted content
 */
async function processBlock(block: ArenaBlock): Promise<ProcessedBlock> {
  // Implementation
}
```

### React Components
- Use functional components with hooks
- Props should have TypeScript interfaces
- Use shadcn/ui components when possible

```typescript
interface ChannelCardProps {
  channel: ArenaChannel;
  onSelect: (slug: string) => void;
}

export function ChannelCard({ channel, onSelect }: ChannelCardProps) {
  // Component implementation
}
```

### File Organization
```
src/
├── app/              # Next.js pages and API routes
├── components/       # Reusable React components
├── lib/              # Core business logic
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions
```

## Areas for Contribution

### 🎨 Templates & Content Generation
Help expand content generation capabilities:

- **Newsletter templates**: Different styles and formats
- **Report templates**: Academic, business, creative briefs
- **Prompt engineering**: Improve AI response quality

Example contribution:
```typescript
// src/lib/templates/research-report.ts
export const researchReportTemplate = {
  name: "Research Report",
  description: "Academic-style research summary",
  prompt: `Create a research report from this content...`
};
```

### 🔗 Integrations & APIs
Add support for new content sources:

- **New block types**: Support for additional Are.na content
- **External APIs**: Alternative content extraction services
- **Export formats**: PDF, DOCX, various output formats

### 🎯 UI/UX Improvements
Enhance the user experience:

- **Mobile responsiveness**: Better mobile interactions
- **Accessibility**: ARIA labels, keyboard navigation
- **Design polish**: Animations, micro-interactions
- **Dark mode**: Comprehensive dark theme support

### 📚 Documentation
Help others understand and use Aryn:

- **Tutorials**: Step-by-step guides
- **API documentation**: Function and endpoint docs
- **Architecture guides**: System design explanations
- **Use case examples**: Real-world scenarios

### 🧪 Testing & Quality
Improve reliability and performance:

- **Unit tests**: Individual function testing
- **Integration tests**: End-to-end workflows
- **Performance optimization**: Speed and memory improvements
- **Error handling**: Better error messages and recovery

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/aryn/issues).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS, Windows, Linux]
 - Browser [e.g. chrome, safari]
 - Node.js version [e.g. 18.17.0]

**Additional context**
Add any other context about the problem here.
```

## Feature Requests

We use GitHub Discussions for feature requests and ideas. 

Before submitting a feature request:
1. Check if it already exists in discussions
2. Consider if it aligns with project goals
3. Think about implementation complexity

**Great Feature Requests** include:
- Clear problem statement
- Proposed solution
- Alternative solutions considered
- Additional context and examples

## Community Guidelines

### Code of Conduct
This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community

### Quality Standards
- Write clear commit messages
- Add tests for new functionality
- Update documentation for changes
- Follow the existing code style

## Recognition

Contributors who make significant improvements will be:
- Added to the README contributors section
- Mentioned in release notes
- Invited to join the core team (for ongoing contributors)

## Questions?

Don't hesitate to ask questions! You can:
- Open a discussion on GitHub
- Comment on relevant issues
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.