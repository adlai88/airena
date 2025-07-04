-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create channels table
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER UNIQUE NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    user_id TEXT,
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create blocks table
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    arena_id INTEGER UNIQUE NOT NULL,
    channel_id INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,
    url TEXT,
    block_type TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    embedding vector(1536)
);

-- Create index for vector similarity search
CREATE INDEX blocks_embedding_idx ON blocks USING ivfflat (embedding vector_cosine_ops);

-- Create foreign key constraint
ALTER TABLE blocks 
ADD CONSTRAINT fk_blocks_channel_id 
FOREIGN KEY (channel_id) REFERENCES channels(arena_id);

-- Create indexes for better performance
CREATE INDEX idx_blocks_channel_id ON blocks(channel_id);
CREATE INDEX idx_blocks_block_type ON blocks(block_type);
CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_channels_user_id ON channels(user_id);