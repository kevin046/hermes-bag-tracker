const { supabase } = require('./supabase');
const emailService = require('./emailService');
const hermesScraper = require('./scraper');

class AvailabilityChecker {
    constructor() {
        this.isChecking = false;
    }

    async checkAndNotify() {
        if (this.isChecking) {
            console.log('Check already in progress, skipping...');
            return;
        }

        try {
            this.isChecking = true;
            console.log('Starting availability check:', new Date().toISOString());

            // Get all active subscriptions with their bag info
            const { data: subscriptions, error } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    bags (*)
                `)
                .eq('active', true);

            if (error) throw error;

            // Group subscriptions by bag to avoid duplicate checks
            const bagSubscriptions = this.groupSubscriptionsByBag(subscriptions);

            // Check each bag
            for (const [bagId, subs] of bagSubscriptions) {
                const bag = subs[0].bags; // Get bag info from first subscription
                
                try {
                    // Get current availability
                    const bagData = await hermesScraper.scrapeBagData(bag.sku);
                    
                    if (!bagData) continue;

                    // Update bag status in database
                    await this.updateBagStatus(bag.id, bagData);

                    // If bag is available, notify subscribers
                    if (bagData.availability && !bag.availability) {
                        for (const sub of subs) {
                            await emailService.sendAvailabilityNotification(
                                sub.user_email,
                                { ...bagData, url: bag.url }
                            );
                        }
                    }
                } catch (error) {
                    console.error(`Error checking bag ${bag.sku}:`, error);
                }

                // Add delay between checks
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

        } catch (error) {
            console.error('Error in availability checker:', error);
        } finally {
            this.isChecking = false;
            console.log('Availability check completed:', new Date().toISOString());
        }
    }

    groupSubscriptionsByBag(subscriptions) {
        return subscriptions.reduce((groups, sub) => {
            const bagId = sub.bag_id;
            if (!groups.has(bagId)) {
                groups.set(bagId, []);
            }
            groups.get(bagId).push(sub);
            return groups;
        }, new Map());
    }

    async updateBagStatus(bagId, bagData) {
        const { error } = await supabase
            .from('bags')
            .update({
                availability: bagData.availability,
                price: bagData.price,
                last_checked: new Date().toISOString()
            })
            .eq('id', bagId);

        if (error) throw error;
    }
}

module.exports = new AvailabilityChecker(); 