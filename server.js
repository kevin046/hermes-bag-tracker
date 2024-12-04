const express = require('express');
const path = require('path');
const hermesScraper = require('./lib/scraper');
const hermesScheduler = require('./lib/scheduler');
const { supabase } = require('./lib/supabase');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes (for client-side routing)
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes with error handling
app.post('/api/track-model', async (req, res) => {
    try {
        const { model } = req.body;
        if (!model) {
            return res.status(400).json({ message: 'Model is required' });
        }

        const bagData = await hermesScraper.trackByModel(model);
        if (!bagData) {
            return res.status(404).json({ message: 'Could not fetch bag data' });
        }

        const { data: bagInsert, error: bagError } = await supabase
            .from('bags')
            .upsert({
                sku: bagData.reference,
                name: bagData.name,
                price: parseFloat(bagData.price || 0),
                color: bagData.color,
                material: bagData.material,
                availability: bagData.availability,
                last_checked: new Date().toISOString(),
                bag_name: model
            })
            .select()
            .single();

        if (bagError) throw bagError;

        await supabase
            .from('price_history')
            .insert({
                bag_id: bagInsert.id,
                price: parseFloat(bagData.price || 0),
            });

        res.json({
            ...bagData,
            bagName: model
        });
    } catch (error) {
        console.error('Error tracking bag:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const { data: bags, error } = await supabase
            .from('bags')
            .select('*')
            .order('last_checked', { ascending: false })
            .limit(10);

        if (error) throw error;
        res.json(bags);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/price-history/:sku', async (req, res) => {
    try {
        const { data: bag, error: bagError } = await supabase
            .from('bags')
            .select('id')
            .eq('sku', req.params.sku)
            .single();

        if (bagError) throw bagError;

        const { data: history, error: historyError } = await supabase
            .from('price_history')
            .select('price, checked_at')
            .eq('bag_id', bag.id)
            .order('checked_at', { ascending: false });

        if (historyError) throw historyError;
        res.json(history);
    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/scrape', async (req, res) => {
    try {
        const { basesku, variant, model, url } = req.body;
        
        // Use the actual scraper to get real data
        const bagData = await hermesScraper.scrapeBagData(basesku, variant);
        
        if (!bagData) {
            return res.status(404).json({
                success: false,
                message: 'No data found for this variant'
            });
        }

        res.json({
            success: true,
            bagData: {
                ...bagData,
                reference: `${basesku}${variant}`
            }
        });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Start server with error handling
try {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        // Start the scheduler after server is running
        hermesScheduler.start().catch(error => {
            console.error('Scheduler failed to start:', error);
        });
    });
} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Add this at the top of server.js
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.log('Uncaught Exception:', error);
});

// Add more detailed logging
console.log('Starting server initialization...');
console.log('Environment variables loaded:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
    SUPABASE_KEY: process.env.SUPABASE_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT,
    CHECK_INTERVAL: process.env.CHECK_INTERVAL
}); 