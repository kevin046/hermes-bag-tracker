const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const proxyManager = require('./proxyManager');
const { randomDelay } = require('./utils');

puppeteer.use(StealthPlugin());

// Add this helper function for delays
async function addDelay(min = 10000, max = 15000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`Waiting for ${delay/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
}

class HermesScraper {
    constructor() {
        this.baseUrl = 'https://www.hermes.com';
        this.categoryUrl = 'https://www.hermes.com/ca/en/category/women/bags-and-small-leather-goods/bags-and-clutches';
        this.userAgents = new UserAgent({ deviceCategory: 'desktop' });
        this.retryCount = 3;
        
        // Updated bag references with full product URLs
        this.bagReferences = {
            'picotin18': {
                sku: 'H056289',
                url: 'https://www.hermes.com/ca/en/product/picotin-lock-18-bag-H056289/',
                model_line: 'Picotin',
                size: '18'
            },
            'picotin22': {
                sku: ['H056289', 'H060991'],
                url: 'https://www.hermes.com/ca/en/product/picotin-lock-22-bag-H060991/',
                model_line: 'Picotin',
                size: '22'
            },
            'herbagZip31': {
                sku: 'H078971',
                url: 'https://www.hermes.com/ca/en/product/herbag-zip-31-bag-H078971/',
                model_line: 'Herbag',
                size: '31'
            },
            'herbagZip39': {
                sku: 'H078972',
                url: 'https://www.hermes.com/ca/en/product/herbag-zip-39-bag-H078972/',
                model_line: 'Herbag',
                size: '39'
            },
            'evelyne29': {
                sku: 'H056277',
                url: 'https://www.hermes.com/ca/en/product/evelyne-29-bag-H056277/',
                model_line: 'Evelyne',
                size: '29'
            },
            'lindyMini': {
                sku: 'H085957',
                url: 'https://www.hermes.com/ca/en/product/lindy-mini-bag-H085957/',
                model_line: 'Lindy',
                size: 'mini'
            },
            'lindy26': {
                sku: 'H073430',
                url: 'https://www.hermes.com/ca/en/product/lindy-26-bag-H073430/',
                model_line: 'Lindy',
                size: '26'
            }
            // ... other bags
        };
    }

    async initBrowser(retryAttempt = 0) {
        const proxy = proxyManager.getNextProxy();
        
        if (!proxy && retryAttempt === 0) {
            await proxyManager.loadProxiesFromAPI();
        }

        try {
            // Create browser instance with incognito context
            const browser = await puppeteer.launch({
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certifcate-errors',
                    '--ignore-certifcate-errors-spki-list',
                    proxy ? `--proxy-server=${proxy}` : '',
                    '--window-size=1920,1080',
                    '--incognito',  // Add incognito mode
                    '--disable-extensions'  // Disable extensions in incognito
                ],
                defaultViewport: {
                    width: 1920,
                    height: 1080
                }
            });

            // Create incognito context
            const context = await browser.createIncognitoBrowserContext();
            const page = await context.newPage();

            if (proxy) {
                // If proxy requires authentication
                const proxyUrl = new URL(proxy);
                if (proxyUrl.username && proxyUrl.password) {
                    await page.authenticate({
                        username: proxyUrl.username,
                        password: proxyUrl.password
                    });
                }
            }

            await this.setupPage(page, proxy);
            return { browser, page, proxy, context };  // Include context in return

        } catch (error) {
            console.error(`Error initializing browser with proxy ${proxy}:`, error);
            if (proxy) {
                proxyManager.markProxyFailed(proxy);
            }
            
            if (retryAttempt < this.retryCount) {
                console.log(`Retrying with different proxy (attempt ${retryAttempt + 1})`);
                return this.initBrowser(retryAttempt + 1);
            }
            throw error;
        }
    }

    async setupPage(page, proxy) {
        // Set random user agent
        const userAgent = this.userAgents.random().toString();
        await page.setUserAgent(userAgent);

        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
        });

        // Randomize viewport
        const height = 1080 + Math.floor(Math.random() * 100);
        const width = 1920 + Math.floor(Math.random() * 100);
        await page.setViewport({ width, height });

        // Enable JavaScript and cache
        await page.setJavaScriptEnabled(true);
        await page.setCacheEnabled(true);

        // Set cookies if available
        const cookies = await this.loadCookies(proxy);
        if (cookies) {
            await page.setCookie(...cookies);
        }
    }

    async loadCookies(proxy) {
        // Implement cookie loading logic here
        return null;
    }

    async saveCookies(cookies, proxy) {
        // Implement cookie saving logic here
    }

    async humanScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = Math.floor(Math.random() * (100 - 50) + 50);
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    // Add random pauses during scrolling
                    if (Math.random() < 0.2) {
                        clearInterval(timer);
                        setTimeout(() => {
                            timer = setInterval(scroll, Math.random() * (200 - 50) + 50);
                        }, Math.random() * 1000 + 500);
                    }

                    if(totalHeight >= document.body.scrollHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, Math.random() * (200 - 50) + 50);
            });
        });

        // Add delay after scrolling
        await addDelay(2000, 4000);
    }

    async simulateMouseMovement(page) {
        await page.mouse.move(
            Math.random() * 1920,
            Math.random() * 1080,
            { steps: 10 }
        );
    }

    async scrapeBagData(sku) {
        let browser, page, proxy, context;
        try {
            ({ browser, page, proxy, context } = await this.initBrowser());

            // Get the full product URL
            const productUrl = this.getProductUrl(sku);
            console.log(`Scraping URL: ${productUrl}`);

            // Initial delay before starting
            await addDelay();

            // Navigate to the product page with proper options
            await page.goto(productUrl, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 60000
            });

            // Add extra delay after page load
            await addDelay(10000, 12000);

            // Handle region/cookie popups first
            await this.handleInitialPopups(page);

            // Simulate human-like behavior
            await this.simulateHumanBehavior(page);

            // Check for bot detection
            if (await this.isBlocked(page)) {
                console.log('Bot detection encountered, retrying...');
                proxyManager.markProxyFailed(proxy);
                throw new Error('Bot detected');
            }

            // Save successful cookies
            const cookies = await page.cookies();
            await this.saveCookies(cookies, proxy);

            // Extract the data
            const bagData = await this.extractBagData(page);
            
            // Log success
            if (bagData) {
                console.log(`Successfully scraped data for SKU ${sku}`);
                proxyManager.markProxySuccess(proxy);
            }

            return bagData;

        } catch (error) {
            console.error(`Error scraping SKU ${sku}:`, error);
            if (proxy) proxyManager.markProxyFailed(proxy);
            return null;
        } finally {
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    getProductUrl(sku) {
        // First try to find the SKU in bagReferences
        for (const bagInfo of Object.values(this.bagReferences)) {
            if (bagInfo.sku === sku || (Array.isArray(bagInfo.sku) && bagInfo.sku.includes(sku))) {
                return bagInfo.url;
            }
        }
        // Fallback to constructing URL
        return `${this.baseUrl}/ca/en/product/bag-${sku}/`;
    }

    async isBlocked(page) {
        // Add logic to detect bot detection pages or CAPTCHAs
        const html = await page.content();
        return html.includes('captcha') || 
               html.includes('blocked') || 
               html.includes('security check');
    }

    async extractBagData(page) {
        await this.humanScroll(page);
        await this.simulateMouseMovement(page);
        await randomDelay(1000, 3000);

        return await page.evaluate(() => {
            const getTextContent = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : '';
            };

            // Updated selectors based on Hermès website structure
            const getPrice = () => {
                const priceElement = document.querySelector('[data-analytics-price]');
                if (!priceElement) return null;
                const priceText = priceElement.textContent.trim();
                return priceText.replace(/[^0-9.]/g, '');
            };

            const getAvailability = () => {
                // Check various indicators of availability
                const unavailableText = document.querySelector('.unavailable-button');
                const addToCartButton = document.querySelector('.add-to-cart-button');
                const availabilityMessage = document.querySelector('.availability-message');
                
                if (unavailableText) return false;
                if (addToCartButton) return true;
                if (availabilityMessage) {
                    return !availabilityMessage.textContent.toLowerCase().includes('unavailable');
                }
                return false;
            };

            return {
                name: getTextContent('.product-title, .product-name'),
                price: getPrice(),
                color: getTextContent('.product-color, .variant-description'),
                material: getTextContent('.product-material, .material-description'),
                availability: getAvailability(),
                description: getTextContent('.product-description'),
                images: Array.from(document.querySelectorAll('.product-image img, .gallery-image img'))
                    .map(img => img.src)
                    .filter(Boolean)
            };
        });
    }

    async getAllBags() {
        let browser, page, proxy, context;
        try {
            ({ browser, page, proxy, context } = await this.initBrowser());

            await page.goto(this.categoryUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Handle cookie consent and region selection if present
            await this.handleInitialPopups(page);

            // Scroll and simulate human behavior
            await this.humanScroll(page);
            await this.simulateMouseMovement(page);

            // Extract all bag data
            const bags = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.product-grid-item, .product-item'))
                    .map(item => {
                        const priceElement = item.querySelector('[data-analytics-price]');
                        const nameElement = item.querySelector('.product-title, .product-name');
                        const colorElement = item.querySelector('.product-color, .variant-description');
                        const availabilityElement = item.querySelector('.availability-message');
                        const linkElement = item.querySelector('a[href*="/product/"]');
                        
                        return {
                            name: nameElement?.textContent.trim(),
                            price: priceElement?.textContent.trim(),
                            color: colorElement?.textContent.trim(),
                            availability: !availabilityElement?.textContent.toLowerCase().includes('unavailable'),
                            url: linkElement?.href,
                            sku: linkElement?.href.match(/[A-Z]\d{6}/) ? linkElement.href.match(/[A-Z]\d{6}/)[0] : null
                        };
                    })
                    .filter(item => item.name && item.price);
            });

            return bags;

        } catch (error) {
            console.error('Error getting all bags:', error);
            if (proxy) proxyManager.markProxyFailed(proxy);
            return [];
        } finally {
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    async handleInitialPopups(page) {
        try {
            // Wait for page to be fully loaded
            await page.waitForTimeout(5000);

            // Handle cookie consent
            const cookieSelectors = [
                '#cookie-consent-button',
                '.cookie-banner button',
                'button[data-accept-cookies]',
                '.cookies-banner-actions button'
            ];

            for (const selector of cookieSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    await addDelay(1000, 2000);
                    await page.click(selector);
                    console.log(`Clicked cookie consent: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

            // Handle region selection
            const regionSelectors = [
                '.region-selection button',
                '.country-selector button',
                '[data-region-selector] button'
            ];

            for (const selector of regionSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    await addDelay(1000, 2000);
                    await page.click(selector);
                    console.log(`Clicked region selector: ${selector}`);
                    break;
                } catch (e) {
                    continue;
                }
            }

        } catch (e) {
            console.log('Some popups could not be handled:', e.message);
        }
    }

    async simulateHumanBehavior(page) {
        // Add random mouse movements
        await this.simulateMouseMovement(page);
        
        // Random scrolling
        await this.humanScroll(page);
        
        // Random viewport adjustments
        const height = 1080 + Math.floor(Math.random() * 100);
        const width = 1920 + Math.floor(Math.random() * 100);
        await page.setViewport({ width, height });
        
        // Add small random delays between actions
        await addDelay(2000, 4000);
    }

    async trackSpecificBags() {
        const results = [];
        
        for (const [bagModel, bagInfo] of Object.entries(this.bagReferences)) {
            try {
                console.log(`Starting to scrape ${bagModel}...`);
                
                // Add longer delay between different bags
                await addDelay(15000, 20000);
                
                const bagData = await this.scrapeBagData(bagInfo.sku);
                if (bagData) {
                    results.push({
                        bagName,
                        reference: bagInfo.sku,
                        ...bagData
                    });
                }
            } catch (error) {
                console.error(`Error tracking ${bagModel}:`, error);
            }
        }
        
        return results;
    }

    async trackByModel(model) {
        const reference = this.bagReferences[model];
        if (!reference) {
            throw new Error('Invalid bag model');
        }

        // If the model has multiple references, try each one until successful
        if (Array.isArray(reference)) {
            for (const ref of reference) {
                const result = await this.scrapeBagData(ref);
                if (result) {
                    return {
                        ...result,
                        reference: ref
                    };
                }
            }
            return null;
        }

        const result = await this.scrapeBagData(reference);
        return result ? { ...result, reference } : null;
    }
}

module.exports = new HermesScraper(); 