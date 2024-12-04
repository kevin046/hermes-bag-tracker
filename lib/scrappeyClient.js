const Scrappey = require('scrappey-wrapper');

class ScrappeyClient {
    constructor() {
        this.API_KEY = 'asLrMrTQW9DTFaWYCxjgzTbghvvbtLRtGLBhbqGTi75MM4j9aN8569clsiGe';
        this.client = new Scrappey(this.API_KEY);
    }

    async scrapeProduct(sku, variant) {
        let session;
        try {
            session = await this.client.createSession();
            console.log('Session created:', session);

            const fullSku = `${sku}${variant}`;
            const url = `https://www.hermes.com/ca/en/search/?s=${fullSku}`;

            console.log('Scraping URL:', url);

            const result = await this.client.get({
                cmd: "request.get",
                url: url,
                interceptFetchRequest: [
                    "https://bck.hermes.com/products"
                ],
                options: {
                    waitForSelector: '.product-title, .product-price',
                    timeout: 30000,
                    proxy: {
                        country: 'us'
                    }
                }
            });

            console.log('Raw response:', JSON.stringify(result, null, 2));

            if (result.solution && result.solution.response) {
                const productData = this.parseProductData(result.solution.response[0]?.response);
                if (productData) {
                    return {
                        ...productData,
                        reference: fullSku
                    };
                }
            }

            return null;

        } catch (error) {
            console.error('Scrappey error:', error);
            throw error;
        } finally {
            if (session) {
                try {
                    await this.client.destroySession(session.session);
                    console.log('Session destroyed');
                } catch (error) {
                    console.error('Error destroying session:', error);
                }
            }
        }
    }

    parseProductData(responseData) {
        try {
            console.log('Parsing response data:', responseData);

            if (typeof responseData === 'string') {
                responseData = JSON.parse(responseData);
            }

            const product = responseData.products?.items?.[0];
            if (!product) {
                console.log('No product found in response');
                return null;
            }

            console.log('Found product:', product);

            return {
                name: product.title,
                price: product.price,
                color: product.avgColor,
                material: product.material,
                availability: true,
                url: `https://www.hermes.com/ca/en${product.url}`
            };
        } catch (error) {
            console.error('Error parsing product data:', error);
            return null;
        }
    }
}

module.exports = new ScrappeyClient(); 