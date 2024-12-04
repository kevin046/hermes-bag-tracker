document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('trackForm');
    const bagSelect = document.getElementById('bagSelect');
    const trackButton = document.getElementById('trackButton');
    const errorDiv = document.getElementById('error');
    const resultDiv = document.getElementById('result');
    const historyBody = document.getElementById('historyBody');

    // Load tracking history on page load
    loadTrackingHistory();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bagModel = bagSelect.value;
        
        if (!bagModel) {
            errorDiv.textContent = 'Please select a bag model';
            return;
        }

        try {
            trackButton.disabled = true;
            trackButton.textContent = 'Tracking...';
            errorDiv.textContent = '';
            
            const response = await fetch('/api/track-model', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: bagModel })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to track bag');
            }

            displayResult(data);
            loadTrackingHistory();
            form.reset();

        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            trackButton.disabled = false;
            trackButton.textContent = 'Track Bag';
        }
    });

    async function loadTrackingHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to load history');
            }

            displayHistory(data);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    function displayResult(bagData) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <h3>Latest Track Result:</h3>
            <p>Model: ${bagData.bagName}</p>
            <p>Name: ${bagData.name}</p>
            <p>Price: $${bagData.price}</p>
            <p>Color: ${bagData.color}</p>
            <p>Material: ${bagData.material}</p>
            <p>Availability: 
                <span class="bag-status ${bagData.availability ? 'status-available' : 'status-unavailable'}">
                    ${bagData.availability ? 'In Stock' : 'Out of Stock'}
                </span>
            </p>
        `;
    }

    function displayHistory(history) {
        historyBody.innerHTML = '';
        history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.bagName || 'Unknown'}</td>
                <td>${item.name}</td>
                <td>$${item.price}</td>
                <td>${item.color}</td>
                <td>
                    <span class="bag-status ${item.availability ? 'status-available' : 'status-unavailable'}">
                        ${item.availability ? 'In Stock' : 'Out of Stock'}
                    </span>
                </td>
                <td>${new Date(item.last_checked).toLocaleString()}</td>
            `;
            historyBody.appendChild(row);
        });
    }
}); 