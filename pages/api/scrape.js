import { scrappeyClient } from '../../lib/scrappeyClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { basesku, variant, model } = req.body;
    const bagData = await scrappeyClient.scrapeProduct(basesku, variant);

    if (!bagData) {
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
} 