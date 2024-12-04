document.addEventListener('DOMContentLoaded', async () => {
    // Verify Supabase connection
    try {
        const { data, error } = await supabaseClient.from('bags').select('count');
        if (error) throw error;
        console.log('Successfully connected to Supabase');
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        document.getElementById('error').textContent = 'Failed to connect to database';
        return;
    }

    // Get DOM elements
    const errorDiv = document.getElementById('error');
    const resultDiv = document.getElementById('result');
    const historyBody = document.getElementById('historyBody');
    const startScrapingBtn = document.getElementById('startScrapingBtn');
    const scrapingStatus = document.getElementById('scrapingStatus');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const bagCheckboxes = document.querySelectorAll('input[name="bag"]');
    const subscriptionEmail = document.getElementById('subscriptionEmail');
    const subscribeButton = document.getElementById('subscribeButton');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const subscriptionsBody = document.getElementById('subscriptionsBody');

    // Debug log to check if elements are found
    console.log('Elements found:', {
        selectAllBtn: !!selectAllBtn,
        clearAllBtn: !!clearAllBtn,
        startScrapingBtn: !!startScrapingBtn,
        bagCheckboxes: bagCheckboxes.length
    });

    // Load history on page load
    loadTrackingHistory();

    // Bag references
    const bagReferences = {
        'picotin18': {
            sku: 'H056289',
            url: 'https://www.hermes.com/ca/en/product/picotin-lock-18-bag-H056289/',
            model_line: 'Picotin',
            size: '18'
        },
        'picotin22': {
            sku: 'H060991',
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
    };

    async function loadTrackingHistory() {
        try {
            const { data: bags, error } = await supabaseClient
                .from('bags')
                .select(`
                    *,
                    price_history(price, checked_at)
                `)
                .order('last_checked', { ascending: false })
                .limit(10);

            if (error) throw error;
            displayHistory(bags);
        } catch (error) {
            console.error('Error loading history:', error);
            errorDiv.textContent = 'Failed to load tracking history';
        }
    }

    // Select All button click handler
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Select All clicked');
            bagCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        });
    }

    // Clear All button click handler
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clear All clicked');
            bagCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }

    // Track Selected Bags button click handler
    if (startScrapingBtn) {
        startScrapingBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Start Scraping clicked');
            
            const selectedBags = Array.from(bagCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);

            console.log('Selected bags:', selectedBags);

            if (selectedBags.length === 0) {
                alert('Please select at least one bag to track');
                return;
            }

            try {
                startScrapingBtn.disabled = true;
                startScrapingBtn.classList.add('scraping');
                startScrapingBtn.textContent = 'Tracking...';
                scrapingStatus.className = 'status-text scraping';
                scrapingStatus.textContent = 'Tracking in progress...';

                // Track each selected bag
                for (const bagModel of selectedBags) {
                    scrapingStatus.textContent = `Tracking ${bagModel}...`;
                    
                    try {
                        const bagInfo = bagReferences[bagModel];
                        if (!bagInfo) {
                            throw new Error(`Configuration not found for ${bagModel}`);
                        }

                        const mockData = {
                            name: `${bagModel} Bag`,
                            reference: bagInfo.sku,
                            model_line: bagInfo.model_line,
                            size: bagInfo.size,
                            price: Math.floor(Math.random() * 10000) + 5000,
                            color: ['Black', 'Gold', 'Etoupe', 'Rouge H'][Math.floor(Math.random() * 4)],
                            material: ['Clemence', 'Epsom', 'Togo', 'Swift'][Math.floor(Math.random() * 4)],
                            availability: Math.random() > 0.5,
                            url: bagInfo.url,
                            description: `Hermès ${bagModel} bag`,
                            last_checked: new Date().toISOString()
                        };

                        await storeScrapedData(mockData, bagModel);
                        displayResult({ ...mockData, bagName: bagModel });
                        await new Promise(resolve => setTimeout(resolve, 2000));

                    } catch (error) {
                        console.error(`Error tracking ${bagModel}:`, error);
                        scrapingStatus.textContent += `\nError tracking ${bagModel}: ${error.message}`;
                    }
                }

                scrapingStatus.className = 'status-text active';
                scrapingStatus.textContent += '\nTracking completed successfully!';
                await loadTrackingHistory();

            } catch (error) {
                console.error('Tracking error:', error);
                scrapingStatus.className = 'status-text error';
                scrapingStatus.textContent = 'Error during tracking: ' + error.message;
            } finally {
                startScrapingBtn.disabled = false;
                startScrapingBtn.classList.remove('scraping');
                startScrapingBtn.textContent = 'Track Selected Bags';
            }
        });
    }

    // Add function to store scraped data
    async function storeScrapedData(bagData, bagModel) {
        try {
            // First, check if the bag exists
            const { data: existingBag, error: checkError } = await supabaseClient
                .from('bags')
                .select('id')
                .eq('sku', bagData.reference)
                .single();

            let bagId;

            if (existingBag) {
                // Update existing bag
                const { data: updatedBag, error: updateError } = await supabaseClient
                    .from('bags')
                    .update({
                        name: bagData.name,
                        price: parseFloat(bagData.price),
                        color: bagData.color,
                        material: bagData.material,
                        availability: bagData.availability,
                        last_checked: new Date().toISOString()
                    })
                    .eq('sku', bagData.reference)
                    .select()
                    .single();

                if (updateError) throw updateError;
                bagId = existingBag.id;
            } else {
                // Insert new bag
                const { data: newBag, error: insertError } = await supabaseClient
                    .from('bags')
                    .insert({
                        sku: bagData.reference,
                        bag_name: bagModel,
                        name: bagData.name,
                        price: parseFloat(bagData.price),
                        color: bagData.color,
                        material: bagData.material,
                        model_line: bagData.model_line,
                        size: bagData.size,
                        availability: bagData.availability,
                        url: bagData.url,
                        description: bagData.description,
                        last_checked: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                bagId = newBag.id;
            }

            // Store price history
            const { error: priceError } = await supabaseClient
                .from('price_history')
                .insert({
                    bag_id: bagId,
                    price: parseFloat(bagData.price),
                    availability: bagData.availability
                });

            if (priceError) throw priceError;

            // Store stock history
            const { error: stockError } = await supabaseClient
                .from('stock_history')
                .insert({
                    bag_id: bagId,
                    availability: bagData.availability,
                    color: bagData.color
                });

            if (stockError) throw stockError;

            return { id: bagId };
        } catch (error) {
            console.error('Error storing data:', error);
            throw error;
        }
    }

    function displayResult(bagData) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <h3>Latest Track Result:</h3>
            <p>Model: ${bagData.bagName}</p>
            <p>Name: ${bagData.name || 'N/A'}</p>
            <p>Price: ${bagData.price ? `$${bagData.price}` : 'N/A'}</p>
            <p>Color: ${bagData.color || 'N/A'}</p>
            <p>Material: ${bagData.material || 'N/A'}</p>
            <p>Availability: 
                <span class="bag-status ${bagData.availability ? 'status-available' : 'status-unavailable'}">
                    ${bagData.availability ? 'In Stock' : 'Out of Stock'}
                </span>
            </p>
        `;
    }

    function displayHistory(history) {
        historyBody.innerHTML = '';
        if (!history || history.length === 0) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center;">No tracking history available</td>
                </tr>
            `;
            return;
        }

        // Update table headers first
        const headerRow = document.querySelector('#historyTable thead tr');
        headerRow.innerHTML = `
            <th>Bag Model</th>
            <th>Name</th>
            <th>Price</th>
            <th>Color</th>
            <th>Availability</th>
            <th>Last Checked</th>
            <th>Product Link</th>
        `;

        history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.bag_name || 'Unknown'}</td>
                <td>${item.name || 'N/A'}</td>
                <td>${item.price ? `$${item.price}` : 'N/A'}</td>
                <td>${item.color || 'N/A'}</td>
                <td>
                    <span class="bag-status ${item.availability ? 'status-available' : 'status-unavailable'}">
                        ${item.availability ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
                <td>${new Date(item.last_checked).toLocaleString()}</td>
                <td>
                    ${item.url ? 
                        `<a href="${item.url}" target="_blank" class="product-link">View Product</a>` 
                        : 'N/A'}
                </td>
            `;
            historyBody.appendChild(row);
        });
    }

    // Add subscription button handler
    if (subscribeButton) {
        subscribeButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = subscriptionEmail.value;
            const selectedBags = Array.from(bagCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);

            if (!email) {
                alert('Please enter your email address');
                return;
            }

            if (selectedBags.length === 0) {
                alert('Please select at least one bag to subscribe to');
                return;
            }

            try {
                subscribeButton.disabled = true;
                subscriptionStatus.textContent = 'Subscribing...';
                subscriptionStatus.className = 'status-text scraping';

                for (const bagModel of selectedBags) {
                    const bagInfo = bagReferences[bagModel];
                    
                    // Get or create bag record
                    const { data: bag, error: bagError } = await supabaseClient
                        .from('bags')
                        .select('id')
                        .eq('sku', bagInfo.sku)
                        .single();

                    if (bagError) throw bagError;

                    // Create subscription
                    const { error: subError } = await supabaseClient
                        .from('subscriptions')
                        .insert({
                            user_email: email,
                            bag_id: bag.id,
                            active: true
                        });

                    if (subError) throw subError;
                }

                subscriptionStatus.textContent = 'Successfully subscribed!';
                subscriptionStatus.className = 'status-text active';
                subscriptionEmail.value = '';
                loadSubscriptions(email);

            } catch (error) {
                console.error('Subscription error:', error);
                subscriptionStatus.textContent = 'Error creating subscription: ' + error.message;
                subscriptionStatus.className = 'status-text error';
            } finally {
                subscribeButton.disabled = false;
            }
        });
    }

    // Add function to load subscriptions
    async function loadSubscriptions(email) {
        if (!email) return;

        try {
            const { data: subscriptions, error } = await supabaseClient
                .from('subscriptions')
                .select(`
                    *,
                    bags (*)
                `)
                .eq('user_email', email)
                .eq('active', true);

            if (error) throw error;

            displaySubscriptions(subscriptions);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
        }
    }

    // Add function to display subscriptions
    function displaySubscriptions(subscriptions) {
        subscriptionsBody.innerHTML = '';
        
        if (!subscriptions || subscriptions.length === 0) {
            subscriptionsBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">No active subscriptions</td>
                </tr>
            `;
            return;
        }

        subscriptions.forEach(sub => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sub.bags.bag_name || 'Unknown'}</td>
                <td>${sub.user_email}</td>
                <td>
                    <span class="bag-status status-available">Active</span>
                </td>
                <td>
                    <button 
                        onclick="unsubscribe('${sub.id}')"
                        class="unsubscribe-button">
                        Unsubscribe
                    </button>
                </td>
            `;
            subscriptionsBody.appendChild(row);
        });
    }

    // Add function to unsubscribe
    async function unsubscribe(subscriptionId) {
        try {
            const { error } = await supabaseClient
                .from('subscriptions')
                .update({ active: false })
                .eq('id', subscriptionId);

            if (error) throw error;

            // Reload subscriptions
            loadSubscriptions(subscriptionEmail.value);
        } catch (error) {
            console.error('Error unsubscribing:', error);
            alert('Error unsubscribing: ' + error.message);
        }
    }
}); 