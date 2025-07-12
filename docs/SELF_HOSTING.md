# Self-Hosting Guide

This guide will help you deploy Airena on your own infrastructure to process public Are.na channels with complete multimodal intelligence.

## 🏗️ Architecture Overview

Airena consists of:
- **Frontend**: Next.js application
- **Backend**: Vercel Edge Functions / Node.js API routes
- **Database**: PostgreSQL with pgvector extension
- **AI Services**: OpenAI API for embeddings and chat
- **Content Processing**: Jina AI, YouTube Data API

## 📋 Prerequisites

### Required
- **Node.js 18+** and npm
- **PostgreSQL database** with pgvector extension
- **OpenAI API key** for embeddings and GPT-4

### Optional (Enhances functionality)
- **Are.na API key** - Enables private channel access
- **YouTube Data API key** - Improves video content extraction
- **Jina AI API key** - Better web content extraction (has free tier)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/airena.git
cd airena

# Install dependencies
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL and pgvector extension
# macOS with Homebrew
brew install postgresql pgvector

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
```

Create database and enable pgvector:
```sql
CREATE DATABASE airena;
\c airena;
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Option B: Hosted PostgreSQL

**Supabase (Recommended)**:
1. Create project at [supabase.com](https://supabase.com)
2. pgvector is pre-installed
3. Get connection string from project settings

**Alternative providers**:
- **Neon**: Supports pgvector
- **Railway**: PostgreSQL with extensions
- **AWS RDS**: Manual pgvector setup required

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```bash
# Required - Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Required - OpenAI API
OPENAI_API_KEY="sk-your-openai-api-key"

# Optional - Are.na API (for private channels)
ARENA_API_KEY="your-arena-api-key"

# Optional - YouTube Data API (for better video processing)
YOUTUBE_API_KEY="your-youtube-api-key"  

# Optional - Jina AI (for enhanced web extraction)
JINA_API_KEY="your-jina-api-key"

# Optional - Application URL (for production)
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 4. Database Migration

Run the database setup script:
```bash
npm run db:setup
```

Or manually run migrations:
```bash
# Apply database schema
psql $DATABASE_URL -f supabase/migrations/*.sql
```

### 5. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000` to access Airena.

## 🔧 Production Deployment

### Vercel (Recommended)

1. **Push to GitHub** and connect to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - automatic builds from main branch

```bash
# Optional: Deploy via CLI
npm install -g vercel
vercel --prod
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t airena .
docker run -p 3000:3000 --env-file .env.local airena
```

### Traditional VPS

```bash
# Build for production
npm run build

# Start with PM2
npm install -g pm2
pm2 start npm --name "airena" -- start

# Or use forever
npm install -g forever
forever start npm start
```

## 🔑 API Key Setup Guide

### OpenAI API Key (Required)
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create account and add billing method
3. Generate API key in API Keys section
4. **Cost**: ~$0.10-0.50 per channel sync (varies by content)

### Are.na API Key (Optional)
1. Visit [dev.are.na](https://dev.are.na)
2. Log in with Are.na account
3. Create new application
4. Copy API key from application settings
5. **Enables**: Private channel access

### YouTube Data API Key (Optional)
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create credentials → API Key
5. **Enables**: Enhanced video content extraction
6. **Free tier**: 10,000 requests/day

### Jina AI API Key (Optional)
1. Visit [jina.ai](https://jina.ai)
2. Create account
3. Get API key from dashboard
4. **Enables**: Better web content extraction
5. **Free tier**: 1,000 requests/month

## 📊 Database Schema

The database includes these main tables:

```sql
-- Channels table
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT,
  username TEXT,
  last_sync TIMESTAMP
);

-- Blocks table  
CREATE TABLE blocks (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL,
  channel_id INTEGER REFERENCES channels(id),
  title TEXT,
  content TEXT,
  source_url TEXT,
  block_type TEXT,
  embedding vector(1536) -- OpenAI embedding dimension
);

-- Usage tracking
CREATE TABLE channel_usage (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES channels(id),
  session_id TEXT,
  total_blocks_processed INTEGER DEFAULT 0
);
```

## ⚡ Performance Optimization

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_blocks_channel_id ON blocks(channel_id);
CREATE INDEX idx_blocks_embedding ON blocks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_channels_arena_id ON channels(arena_id);
```

### Resource Requirements

**Minimum**:
- 512MB RAM
- 1 CPU core
- 1GB storage

**Recommended**:
- 1GB+ RAM
- 2+ CPU cores  
- 5GB+ storage
- SSD for database

### Rate Limiting

Airena includes built-in rate limiting:
- **Are.na API**: 100ms delays between requests
- **OpenAI API**: Batch processing with exponential backoff
- **Content extraction**: Parallel processing with limits

## 🔒 Security Considerations

### Environment Variables
- Store API keys in environment variables only
- Never commit `.env.local` to version control
- Use strong database passwords

### Database Security
```sql
-- Create restricted user for application
CREATE USER airena_app WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO airena_app;
```

### Network Security
- Use HTTPS in production
- Configure firewall rules
- Consider VPN for database access

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

**OpenAI API Errors**
```bash
# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Debugging

Enable debug logging:
```bash
# Set debug environment
DEBUG=airena:* npm run dev
```

Check logs:
```bash
# View application logs
tail -f logs/app.log

# View database logs (Postgres)
tail -f /var/log/postgresql/postgresql-*.log
```

## 📈 Monitoring & Maintenance

### Health Checks
```bash
# API health check endpoint
curl http://localhost:3000/api/health
```

### Database Maintenance
```sql
-- Clean up old sessions (run monthly)
DELETE FROM channel_usage WHERE created_at < NOW() - INTERVAL '30 days';

-- Vacuum database for performance
VACUUM ANALYZE;
```

### Backup Strategy
```bash
# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup_20231201.sql
```

## 📞 Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Community support
- **Documentation**: Check [README.md](../README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)

## 🚀 What's Next?

After successful deployment:

1. **Test with public channels** - Start with small Are.na channels
2. **Monitor resource usage** - Watch CPU, memory, and API costs
3. **Configure backups** - Set up automated database backups
4. **Join the community** - Contribute back to the project

---

**Need help?** Open an issue on GitHub or check our community discussions!