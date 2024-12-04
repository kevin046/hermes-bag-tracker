class HermesScraper {
    constructor() {
        this.commonVariants = [
            'CKI8', 'CKP5', 'CC7P', 'CK37', 'CCAA', 'CKAB',
            'CK65', 'CK09', 'CC65', 'CKP5', 'CCAK', 'CCBC'
        ];
        this.apiUrl = window.location.origin + '/api/scrape';
    }

    async getAllVariants(bagModel, bagInfo) {
        const results = [];
        console.log(`Checking variants for ${bagModel}...`);

        for (const variant of this.commonVariants) {
            try {
                console.log(`Checking variant ${variant} for ${bagModel}`);
                
                // Make API call to backend for actual scraping
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        basesku: bagInfo.sku,
                        variant: variant,
                        model: bagModel,
                        url: bagInfo.url
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data && data.success) {
                    console.log(`Found data for variant ${variant}`);
                    results.push({
                        ...data.bagData,
                        variant,
                        model_line: bagInfo.model_line,
                        size: bagInfo.size,
                        url: bagInfo.url
                    });
                }

                // Add delay between checks
                await new Promise(resolve => setTimeout(resolve, 8000));
            } catch (error) {
                console.error(`Error getting variant ${variant} for ${bagModel}:`, error);
            }
        }

        console.log(`Found ${results.length} variants for ${bagModel}`);
        return results;
    }
}

window.HermesScraper = HermesScraper; 