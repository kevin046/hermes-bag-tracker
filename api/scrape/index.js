const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { basesku, variant, model, url } = req.body;

    try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list',
                '--incognito'
            ],
            headless: true
        });

        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Construct full SKU and URL
        const fullSku = `${basesku}${variant}`;
        const productUrl = `https://www.hermes.com/ca/en/search/?s=${fullSku}`;

        await page.goto(productUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Extract product data
        const bagData = await page.evaluate(() => {
            const getTextContent = (selector) => {
                const element = document.querySelector(selector);
                return element ? element.textContent.trim() : null;
            };

            const price = getTextContent('.product-price') || getTextContent('[data-analytics-price]');
            const color = getTextContent('.product-color') || getTextContent('[data-color-name]');
            const availability = !document.querySelector('.unavailable-button');

            return {
                name: getTextContent('.product-name'),
                price: price ? parseFloat(price.replace(/[^0-9.]/g, '')) : null,
                color: color,
                material: getTextContent('.product-material'),
                availability: availability,
                reference: fullSku
            };
        });

        await browser.close();

        if (!bagData.name) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            bagData
        });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 