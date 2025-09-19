class LoadBalancer {
    constructor() {
        this.instances = new Map(); // instanceId -> { url, healthy, load, lastHealthCheck }
        this.currentIndex = 0;
        this.healthCheckInterval = 30000; // 30 seconds
        this.startHealthChecks();
    }

    addInstance(instanceId, url) {
        this.instances.set(instanceId, {
            url,
            healthy: true,
            load: 0,
            lastHealthCheck: Date.now(),
            totalRequests: 0,
            errorCount: 0,
        });
    }

    removeInstance(instanceId) {
        return this.instances.delete(instanceId);
    }

    async checkHealth(instance) {
        try {
            const response = await fetch(`${instance.url}/health`, {
                timeout: 5000,
                headers: {
                    "User-Agent": "LoadBalancer-HealthCheck",
                },
            });

            const healthy = response.ok;
            instance.healthy = healthy;
            instance.lastHealthCheck = Date.now();

            if (!healthy) {
                instance.errorCount++;
            } else {
                instance.errorCount = Math.max(0, instance.errorCount - 1); // Gradually reduce error count
            }

            return healthy;
        } catch (error) {
            instance.healthy = false;
            instance.errorCount++;
            instance.lastHealthCheck = Date.now();
            return false;
        }
    }

    startHealthChecks() {
        setInterval(async () => {
            for (const [instanceId, instance] of this.instances) {
                await this.checkHealth(instance);
            }
        }, this.healthCheckInterval);
    }

    getHealthyInstances() {
        return Array.from(this.instances.values()).filter(
            (instance) => instance.healthy
        );
    }

    // Round-robin load balancing
    getNextInstance() {
        const healthyInstances = this.getHealthyInstances();

        if (healthyInstances.length === 0) {
            throw new Error("No healthy instances available");
        }

        const instance =
            healthyInstances[this.currentIndex % healthyInstances.length];
        this.currentIndex = (this.currentIndex + 1) % healthyInstances.length;

        return instance;
    }

    // Least connections load balancing
    getLeastLoadedInstance() {
        const healthyInstances = this.getHealthyInstances();

        if (healthyInstances.length === 0) {
            throw new Error("No healthy instances available");
        }

        return healthyInstances.reduce((least, current) =>
            current.load < least.load ? current : least
        );
    }

    // Weighted round-robin (based on inverse of current load)
    getWeightedInstance() {
        const healthyInstances = this.getHealthyInstances();

        if (healthyInstances.length === 0) {
            throw new Error("No healthy instances available");
        }

        // Calculate weights based on inverse load (lower load = higher weight)
        const weightedInstances = healthyInstances.map((instance) => ({
            ...instance,
            weight:
                instance.load === 0
                    ? 100
                    : Math.max(1, 100 / (instance.load + 1)),
        }));

        const totalWeight = weightedInstances.reduce(
            (sum, inst) => sum + inst.weight,
            0
        );
        let random = Math.random() * totalWeight;

        for (const instance of weightedInstances) {
            random -= instance.weight;
            if (random <= 0) {
                return instance;
            }
        }

        return weightedInstances[0]; // Fallback
    }

    recordRequest(instanceId, method = "GET", path = "/", responseTime = 0) {
        const instance = Array.from(this.instances.values()).find(
            (inst) =>
                inst.url.includes(instanceId) || instanceId.includes(inst.url)
        );

        if (instance) {
            instance.totalRequests++;
            instance.load = Math.max(0, instance.load + 1);

            // Gradually reduce load based on response time
            setTimeout(() => {
                if (instance.load > 0) {
                    instance.load--;
                }
            }, Math.min(responseTime + 1000, 10000)); // Reduce load after response time + 1s, max 10s
        }
    }

    getStats() {
        const instances = Array.from(this.instances.values());
        const healthy = instances.filter((inst) => inst.healthy);
        const unhealthy = instances.filter((inst) => !inst.healthy);

        return {
            totalInstances: instances.length,
            healthyInstances: healthy.length,
            unhealthyInstances: unhealthy.length,
            totalRequests: instances.reduce(
                (sum, inst) => sum + inst.totalRequests,
                0
            ),
            averageLoad:
                instances.length > 0
                    ? instances.reduce((sum, inst) => sum + inst.load, 0) /
                      instances.length
                    : 0,
            instances: instances.map((inst) => ({
                url: inst.url,
                healthy: inst.healthy,
                load: inst.load,
                totalRequests: inst.totalRequests,
                errorCount: inst.errorCount,
                lastHealthCheck: new Date(inst.lastHealthCheck).toISOString(),
            })),
        };
    }

    // Simple routing function for Express middleware
    middleware(strategy = "round-robin") {
        return async (req, res, next) => {
            try {
                let targetInstance;

                switch (strategy) {
                    case "least-loaded":
                        targetInstance = this.getLeastLoadedInstance();
                        break;
                    case "weighted":
                        targetInstance = this.getWeightedInstance();
                        break;
                    case "round-robin":
                    default:
                        targetInstance = this.getNextInstance();
                        break;
                }

                // Add instance info to request for tracking
                req.targetInstance = targetInstance;

                // Proxy the request (simplified - in real implementation you'd use http-proxy)
                const startTime = Date.now();

                // For this simple implementation, we'll just add headers
                req.headers["x-load-balancer-instance"] = targetInstance.url;
                req.headers["x-load-balancer-strategy"] = strategy;

                // Record the request
                res.on("finish", () => {
                    const responseTime = Date.now() - startTime;
                    this.recordRequest(
                        targetInstance.url,
                        req.method,
                        req.path,
                        responseTime
                    );
                });

                next();
            } catch (error) {
                res.status(503).json({
                    error: "Service Unavailable",
                    message: "No healthy instances available",
                });
            }
        };
    }

    // Graceful shutdown
    shutdown() {
        // Clear any intervals or timeouts
        this.instances.clear();
    }
}

module.exports = LoadBalancer;
