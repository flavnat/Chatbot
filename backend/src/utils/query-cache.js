const crypto = require("crypto");

class QueryCache {
    constructor(maxSize = 1000, ttlMinutes = 60) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
        this.cleanupInterval = setInterval(
            () => this.cleanup(),
            10 * 60 * 1000
        );
    }

    generateKey(query, provider = "default", useRag = true, topK = 3) {
        const keyData = `${query}|${provider}|${useRag}|${topK}`;
        return crypto.createHash("md5").update(keyData).digest("hex");
    }

    set(query, provider, useRag, topK, response) {
        const key = this.generateKey(query, provider, useRag, topK);

        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            response,
            timestamp: Date.now(),
            hits: 1,
            query,
            provider,
            useRag,
            topK,
        });

        return key;
    }

    get(query, provider = "default", useRag = true, topK = 3) {
        const key = this.generateKey(query, provider, useRag, topK);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        // Increment hit count
        entry.hits++;
        entry.lastAccessed = Date.now();

        return {
            ...entry.response,
            cached: true,
            cacheHits: entry.hits,
            cacheAge: Math.floor((Date.now() - entry.timestamp) / 1000), // Age in seconds
        };
    }

    has(query, provider = "default", useRag = true, topK = 3) {
        const key = this.generateKey(query, provider, useRag, topK);
        const entry = this.cache.get(key);

        if (!entry) {
            return false;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    delete(query, provider = "default", useRag = true, topK = 3) {
        const key = this.generateKey(query, provider, useRag, topK);
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }

    getStats() {
        const entries = Array.from(this.cache.values());
        const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
        const avgAge =
            entries.length > 0
                ? entries.reduce(
                      (sum, entry) => sum + (Date.now() - entry.timestamp),
                      0
                  ) /
                  entries.length /
                  1000
                : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            totalHits,
            averageAge: Math.floor(avgAge),
            hitRate:
                totalHits > 0 ? totalHits / (totalHits + this.cache.size) : 0,
            entries: entries.map((entry) => ({
                query:
                    entry.query.substring(0, 50) +
                    (entry.query.length > 50 ? "..." : ""),
                hits: entry.hits,
                age: Math.floor((Date.now() - entry.timestamp) / 1000),
                provider: entry.provider,
            })),
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

module.exports = QueryCache;
