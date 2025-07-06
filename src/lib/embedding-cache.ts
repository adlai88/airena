// Simple in-memory cache for embeddings to reduce OpenAI API calls
import crypto from 'crypto';

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

class EmbeddingCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 100; // Maximum cache entries

  private generateKey(text: string): string {
    return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    if (this.cache.size <= this.MAX_SIZE) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  get(text: string): number[] | null {
    const key = this.generateKey(text);
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      if (entry) this.cache.delete(key);
      return null;
    }
    
    return entry.embedding;
  }

  set(text: string, embedding: number[]): void {
    this.evictExpired();
    this.evictOldest();
    
    const key = this.generateKey(text);
    this.cache.set(key, {
      embedding,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const embeddingCache = new EmbeddingCache();