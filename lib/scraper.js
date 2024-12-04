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
        
        // Common variant codes for all bags
        this.commonVariants = [
            'CKI8', 'CKP5', 'CC7P', 'CK37', 'CCAA', 'CKAB',
            'CK65', 'CK09', 'CC65', 'CKP5', 'CCAK', 'CCBC'
        ];
        
        // Updated bag references with all variants
        this.bagReferences = {
            'picotin18': {
                basesku: 'H056289',
                variants: this.commonVariants,  // Use all common variants
                url: 'https://www.hermes.com/ca/en/product/picotin-lock-18-bag-H056289/',
                model_line: 'Picotin',
                size: '18'
            },
            'picotin22': {
                basesku: 'H060991',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/picotin-lock-22-bag-H060991/',
                model_line: 'Picotin',
                size: '22'
            },
            'herbagZip31': {
                basesku: 'H078971',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/herbag-zip-31-bag-H078971/',
                model_line: 'Herbag',
                size: '31'
            },
            'herbagZip39': {
                basesku: 'H078972',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/herbag-zip-39-bag-H078972/',
                model_line: 'Herbag',
                size: '39'
            },
            'evelyne29': {
                basesku: 'H056277',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/evelyne-29-bag-H056277/',
                model_line: 'Evelyne',
                size: '29'
            },
            'lindyMini': {
                basesku: 'H085957',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/lindy-mini-bag-H085957/',
                model_line: 'Lindy',
                size: 'mini'
            },
            'lindy26': {
                basesku: 'H073430',
                variants: this.commonVariants,
                url: 'https://www.hermes.com/ca/en/product/lindy-26-bag-H073430/',
                model_line: 'Lindy',
                size: '26'
            }
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

    async scrapeBagData(basesku, variant) {
        let browser, page, proxy, context;
        try {
            ({ browser, page, proxy, context } = await this.initBrowser());

            // Construct full SKU
            const fullSku = `${basesku}${variant}`;
            console.log(`Scraping SKU: ${fullSku}`);

            // Go to Hermes homepage first
            await page.goto('https://www.hermes.com/ca/en/', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Handle initial popups
            await this.handleInitialPopups(page);

            // Find and click the search button
            await page.waitForSelector('.header-search-button, .search-trigger');
            await page.click('.header-search-button, .search-trigger');

            // Wait for search input and type SKU
            await page.waitForSelector('.search-input, input[type="search"]');
            await page.type('.search-input, input[type="search"]', fullSku);
            
            // Add delay to simulate human typing
            await randomDelay(1000, 2000);

            // Press Enter or click search button
            await page.keyboard.press('Enter');

            // Wait for search results
            await page.waitForSelector('.search-results, .product-grid');
            
            // Add delay to let results load
            await randomDelay(2000, 3000);

            // Click the first product link that matches the SKU
            const productLink = await page.evaluate((searchSku) => {
                const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
                const matchingLink = links.find(link => 
                    link.href.includes(searchSku) || 
                    link.textContent.includes(searchSku)
                );
                return matchingLink ? matchingLink.href : null;
            }, fullSku);

            if (!productLink) {
                console.log(`No product found for SKU ${fullSku}`);
                return null;
            }

            // Navigate to the product page
            await page.goto(productLink, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Add delay before extracting data
            await randomDelay(2000, 3000);

            // Extract the product data
            const bagData = await this.extractBagData(page);
            
            if (bagData) {
                console.log(`Successfully scraped data for SKU ${fullSku}`);
                proxyManager.markProxySuccess(proxy);
            }

            // Extract data with variant information
            bagData.variant = variant;
            bagData.fullSku = fullSku;

            return bagData;

        } catch (error) {
            console.error(`Error scraping SKU ${basesku}${variant}:`, error);
            if (proxy) proxyManager.markProxyFailed(proxy);
            return null;
        } finally {
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    // Add helper method to handle search functionality
    async performSearch(page, searchTerm) {
        try {
            // Wait for search input with multiple possible selectors
            const searchSelectors = [
                '.search-input',
                'input[type="search"]',
                '#searchInput',
                '[data-search-input]'
            ];

            for (const selector of searchSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    await page.type(selector, searchTerm);
                    console.log(`Used search selector: ${selector}`);
                    return true;
                } catch (e) {
                    continue;
                }
            }

            throw new Error('Could not find search input');
        } catch (error) {
            console.error('Error performing search:', error);
            return false;
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

            // Accurate price extraction
            const getPrice = () => {
                // Hermès specific price selectors
                const priceSelectors = [
                    'span[data-analytics-price]',  // Main price selector
                    'span.price-sales',            // Sales price
                    'div.product-price span',      // Product price
                    'span.price'                   // Generic price
                ];

                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const priceText = element.textContent.trim();
                        // Remove currency symbol and commas, keep numbers and decimal
                        const cleanPrice = priceText.replace(/[^0-9.]/g, '');
                        if (cleanPrice) {
                            return parseFloat(cleanPrice);
                        }
                    }
                }
                return null;
            };

            // Accurate color extraction
            const getColor = () => {
                // Hermès specific color selectors
                const colorSelectors = [
                    'span[data-color-name]',           // Color name attribute
                    'div.product-variant-color',       // Variant color
                    'span.selected-color',             // Selected color
                    'div.color-description span'       // Color description
                ];

                for (const selector of colorSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        // Get color from data attribute if available
                        const colorAttr = element.getAttribute('data-color-name');
                        if (colorAttr) return colorAttr.trim();
                        
                        // Otherwise get text content
                        const colorText = element.textContent.trim();
                        if (colorText) return colorText;
                    }
                }
                return null;
            };

            // Accurate availability check
            const getAvailability = () => {
                // Check for explicit "out of stock" indicators
                const outOfStockSelectors = [
                    'button[disabled]',
                    '.out-of-stock',
                    '.product-out-of-stock',
                    '.unavailable'
                ];

                // Check for availability text
                const availabilityText = getTextContent('.availability-message, .stock-status');
                if (availabilityText) {
                    const lowerText = availabilityText.toLowerCase();
                    if (lowerText.includes('out of stock') || 
                        lowerText.includes('unavailable') || 
                        lowerText.includes('sold out')) {
                        return false;
                    }
                }

                // Check for disabled buttons or out of stock indicators
                for (const selector of outOfStockSelectors) {
                    if (document.querySelector(selector)) {
                        return false;
                    }
                }

                // Check for active "add to cart" or similar buttons
                const buyButton = document.querySelector(
                    'button:not([disabled])[data-action="add-to-cart"], ' +
                    'button:not([disabled]).add-to-cart'
                );

                return !!buyButton;
            };

            // Get accurate material information
            const getMaterial = () => {
                const materialSelectors = [
                    'span[data-material]',
                    'div.product-material',
                    'div.material-description'
                ];

                for (const selector of materialSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        const materialAttr = element.getAttribute('data-material');
                        if (materialAttr) return materialAttr.trim();
                        return element.textContent.trim();
                    }
                }
                return null;
            };

            // Get product name
            const getName = () => {
                const nameSelectors = [
                    'h1.product-name',
                    'div.product-title',
                    'h1[data-product-name]'
                ];

                for (const selector of nameSelectors) {
                    const name = getTextContent(selector);
                    if (name) return name;
                }
                return null;
            };

            return {
                name: getName(),
                price: getPrice(),
                color: getColor(),
                material: getMaterial(),
                availability: getAvailability(),
                description: getTextContent('.product-description'),
                images: Array.from(document.querySelectorAll('img.product-image'))
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
                
                const bagData = await this.scrapeBagData(bagInfo.basesku, bagInfo.variants[0]);
                if (bagData) {
                    results.push({
                        bagName,
                        reference: bagInfo.basesku,
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
                const result = await this.scrapeBagData(ref.basesku, ref.variants[0]);
                if (result) {
                    return {
                        ...result,
                        reference: ref.basesku
                    };
                }
            }
            return null;
        }

        const result = await this.scrapeBagData(reference.basesku, reference.variants[0]);
        return result ? { ...result, reference: reference.basesku } : null;
    }

    // Add method to get all variants for a bag
    async getAllVariants(bagModel) {
        const bagInfo = this.bagReferences[bagModel];
        if (!bagInfo) return [];

        const results = [];
        console.log(`Checking variants for ${bagModel}...`);

        for (const variant of bagInfo.variants) {
            try {
                console.log(`Trying variant ${variant} for ${bagModel}`);
                const data = await this.scrapeBagData(bagInfo.basesku, variant);
                if (data) {
                    console.log(`Found data for variant ${variant}`);
                    results.push(data);
                }
            } catch (error) {
                console.error(`Error getting variant ${variant} for ${bagModel}:`, error);
            }
            // Add longer delay between variant checks to avoid detection
            await new Promise(resolve => setTimeout(resolve, 8000));
        }

        console.log(`Found ${results.length} variants for ${bagModel}`);
        return results;
    }
}

module.exports = new HermesScraper(); 