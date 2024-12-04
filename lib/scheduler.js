const cron = require('node-cron');
const notifier = require('node-notifier');
const hermesScraper = require('./scraper');
const { supabase } = require('./supabase');

class HermesScheduler {
    constructor() {
        this.isRunning = false;
        this.lastCheck = null;
    }

    async start() {
        console.log('Scheduler ready for manual tracking...');
    }

    async checkAvailability() {
        console.log('Checking bag availability...', new Date().toISOString());
        this.lastCheck = new Date();

        try {
            const bags = await hermesScraper.trackSpecificBags();
            
            for (const bag of bags) {
                const previousState = await this.getPreviousState(bag.reference);
                
                // Store current state
                const { error: upsertError } = await supabase
                    .from('bags')
                    .upsert({
                        sku: bag.reference,
                        name: bag.name,
                        price: parseFloat(bag.price),
                        color: bag.color,
                        material: bag.material,
                        availability: bag.availability,
                        last_checked: new Date().toISOString(),
                    });

                if (upsertError) throw upsertError;

                // Store price history
                await supabase
                    .from('price_history')
                    .insert({
                        bag_id: bag.reference,
                        price: parseFloat(bag.price),
                    });

                // Check for changes and send notifications
                if (previousState) {
                    this.checkForChanges(previousState, bag);
                }
            }

            console.log('Availability check completed:', new Date().toISOString());
        } catch (error) {
            console.error('Error during availability check:', error);
            this.sendNotification('Error', 'Failed to check bag availability');
        }
    }

    async getPreviousState(sku) {
        const { data, error } = await supabase
            .from('bags')
            .select('*')
            .eq('sku', sku)
            .single();

        if (error) return null;
        return data;
    }

    checkForChanges(previousState, currentState) {
        // Check availability changes
        if (previousState.availability !== currentState.availability) {
            const status = currentState.availability ? 'Available' : 'Out of Stock';
            this.sendNotification(
                'Availability Update',
                `${currentState.name} (${currentState.reference}) is now ${status}`
            );
        }

        // Check price changes
        if (previousState.price !== currentState.price) {
            this.sendNotification(
                'Price Update',
                `${currentState.name} (${currentState.reference}) price changed from $${previousState.price} to $${currentState.price}`
            );
        }
    }

    sendNotification(title, message) {
        console.log(`[${title}] ${message}`);
        
        notifier.notify({
            title: `Hermès Tracker - ${title}`,
            message: message,
            sound: true,
            wait: true
        });

        // You can add more notification methods here (email, SMS, etc.)
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            nextCheck: this.lastCheck ? new Date(this.lastCheck.getTime() + 30 * 60 * 1000) : null
        };
    }
}

module.exports = new HermesScheduler(); 