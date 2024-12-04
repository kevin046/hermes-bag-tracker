class ProxyManager {
    constructor() {
        // You can add your proxy list here
        this.proxies = [
            // Format: 'protocol://username:password@ip:port'
            // Example:
            // 'http://user123:pass456@123.45.67.89:8080',
            // 'http://user123:pass456@98.76.54.32:8080'
        ];
        this.currentIndex = 0;
        this.failedAttempts = new Map();
    }

    async loadProxiesFromAPI() {
        // Implement your proxy loading logic here
        console.log('Loading proxies from configuration');
    }

    getNextProxy() {
        if (this.proxies.length === 0) {
            return null;
        }

        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }

    markProxyFailed(proxy) {
        const fails = (this.failedAttempts.get(proxy) || 0) + 1;
        this.failedAttempts.set(proxy, fails);

        // Remove proxy if it fails too many times
        if (fails >= 3) {
            this.proxies = this.proxies.filter(p => p !== proxy);
            this.failedAttempts.delete(proxy);
        }
    }

    markProxySuccess(proxy) {
        this.failedAttempts.delete(proxy);
    }
}

module.exports = new ProxyManager(); 