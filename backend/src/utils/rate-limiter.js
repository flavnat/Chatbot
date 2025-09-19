class RateLimiter {
    constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
        // 15 minutes, 100 requests
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.requests = new Map(); // IP -> { count, resetTime }
        this.blockedIPs = new Map(); // IP -> block expiry time
    }

    isBlocked(ip) {
        const blockExpiry = this.blockedIPs.get(ip);
        if (blockExpiry && Date.now() < blockExpiry) {
            return true;
        }

        // Remove expired blocks
        if (blockExpiry) {
            this.blockedIPs.delete(ip);
        }

        return false;
    }

    blockIP(ip, durationMs = 60 * 60 * 1000) {
        // Block for 1 hour by default
        this.blockedIPs.set(ip, Date.now() + durationMs);
        console.log(`IP ${ip} blocked for ${durationMs / 1000} seconds`);
    }

    checkLimit(ip) {
        if (this.isBlocked(ip)) {
            return {
                allowed: false,
                reason: "IP is temporarily blocked",
                remainingTime: Math.ceil(
                    (this.blockedIPs.get(ip) - Date.now()) / 1000
                ),
            };
        }

        const now = Date.now();
        const userRequests = this.requests.get(ip);

        if (!userRequests) {
            // First request from this IP
            this.requests.set(ip, {
                count: 1,
                resetTime: now + this.windowMs,
            });
            return {
                allowed: true,
                remainingRequests: this.maxRequests - 1,
                resetTime: now + this.windowMs,
            };
        }

        // Check if window has expired
        if (now > userRequests.resetTime) {
            // Reset the window
            this.requests.set(ip, {
                count: 1,
                resetTime: now + this.windowMs,
            });
            return {
                allowed: true,
                remainingRequests: this.maxRequests - 1,
                resetTime: now + this.windowMs,
            };
        }

        // Check if limit exceeded
        if (userRequests.count >= this.maxRequests) {
            // Block the IP for exceeding limits
            this.blockIP(ip);
            return {
                allowed: false,
                reason: "Rate limit exceeded",
                remainingTime: Math.ceil((userRequests.resetTime - now) / 1000),
            };
        }

        // Increment counter
        userRequests.count++;
        return {
            allowed: true,
            remainingRequests: this.maxRequests - userRequests.count,
            resetTime: userRequests.resetTime,
        };
    }

    getRemainingTime(ip) {
        const userRequests = this.requests.get(ip);
        if (!userRequests) return 0;

        const remaining = userRequests.resetTime - Date.now();
        return Math.max(0, Math.ceil(remaining / 1000));
    }

    getStats() {
        const now = Date.now();
        const activeRequests = Array.from(this.requests.entries()).filter(
            ([ip, data]) => now < data.resetTime
        );
        const blockedIPs = Array.from(this.blockedIPs.entries()).filter(
            ([ip, expiry]) => now < expiry
        );

        return {
            activeWindows: activeRequests.length,
            blockedIPs: blockedIPs.length,
            totalTrackedIPs: this.requests.size,
            windowDuration: this.windowMs / 1000, // in seconds
            maxRequests: this.maxRequests,
            activeRequests: activeRequests.map(([ip, data]) => ({
                ip: this.hashIP(ip),
                requests: data.count,
                remainingTime: Math.ceil((data.resetTime - now) / 1000),
            })),
            blockedIPs: blockedIPs.map(([ip, expiry]) => ({
                ip: this.hashIP(ip),
                remainingTime: Math.ceil((expiry - now) / 1000),
            })),
        };
    }

    hashIP(ip) {
        // Simple hash for privacy in logs
        let hash = 0;
        for (let i = 0; i < ip.length; i++) {
            const char = ip.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    clearExpired() {
        const now = Date.now();

        // Clear expired request windows
        for (const [ip, data] of this.requests.entries()) {
            if (now > data.resetTime) {
                this.requests.delete(ip);
            }
        }

        // Clear expired blocks
        for (const [ip, expiry] of this.blockedIPs.entries()) {
            if (now > expiry) {
                this.blockedIPs.delete(ip);
            }
        }
    }

    resetIP(ip) {
        this.requests.delete(ip);
        this.blockedIPs.delete(ip);
    }

    resetAll() {
        this.requests.clear();
        this.blockedIPs.clear();
    }
}

module.exports = RateLimiter;
