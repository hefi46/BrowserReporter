document.addEventListener('DOMContentLoaded', async function() {
    const forceReportButton = document.getElementById('forceReport');
    const serverUrlElement = document.getElementById('serverUrl');
    const status = document.getElementById('status');
    
    // Display server URL
    serverUrlElement.textContent = new URL(CONFIG.SERVER_URL).hostname;
    
    // Function to check server connection
    async function checkServerConnection() {
        try {
            const response = await fetch(`${CONFIG.SERVER_URL}/api/health`, {
                method: 'GET',
                headers: {
                    'X-API-Key': CONFIG.API_KEY
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            status.textContent = 'Connected to server - Reporting is active';
            status.className = 'status active';
            forceReportButton.disabled = false;
            return true;
        } catch (error) {
            console.error('Server connection error:', error);
            status.textContent = 'Cannot connect to server - Check if server is running';
            status.className = 'status inactive';
            forceReportButton.disabled = true;
            return false;
        }
    }
    
    // Check connection immediately and every 30 seconds
    await checkServerConnection();
    setInterval(checkServerConnection, 30000);
    
    forceReportButton.addEventListener('click', async function() {
        forceReportButton.disabled = true;
        
        try {
            // First check if server is available
            const isConnected = await checkServerConnection();
            if (!isConnected) {
                throw new Error('Server is not available');
            }
            
            // Send message to background script to trigger report
            chrome.runtime.sendMessage({action: 'forceReport'}, function(response) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    throw chrome.runtime.lastError;
                }
                
                if (response && response.success) {
                    status.textContent = 'Report sent successfully!';
                    status.className = 'status active';
                } else {
                    throw new Error('Failed to send report');
                }
                
                // Reset status message after 3 seconds
                setTimeout(() => {
                    checkServerConnection();
                }, 3000);
            });
        } catch (error) {
            console.error('Error triggering report:', error);
            status.textContent = error.message || 'Error sending report';
            status.className = 'status inactive';
        } finally {
            forceReportButton.disabled = false;
        }
    });
});

// Function to format timestamp
function formatTimestamp(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
}

// Function to format time until next report
function formatTimeUntil(isoString) {
    if (!isoString) return 'Unknown';
    
    const now = new Date();
    const target = new Date(isoString);
    const diff = target - now;
    
    if (diff < 0) return 'Due now';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
}

// Function to update the UI
function updateUI(status) {
    const statusDiv = document.getElementById('status');
    const detailsDiv = document.getElementById('details');
    const nextReportDiv = document.getElementById('nextReport');
    const connectionDiv = document.getElementById('connectionStatus');
    const reportNowBtn = document.getElementById('reportNow');
    const reportInterval = document.getElementById('reportInterval');
    
    // Extract hostname from SERVER_URL for display
    const serverHostname = new URL(CONFIG.SERVER_URL).hostname;
    
    // Update connection status
    if (status.connection.isConnected) {
        connectionDiv.className = 'connection-status connected';
        connectionDiv.innerHTML = `
            <i class="bi bi-check-circle-fill"></i>
            Connected to ${serverHostname}
        `;
        reportNowBtn.disabled = false;
    } else if (status.connection.isConnecting) {
        connectionDiv.className = 'connection-status connecting';
        connectionDiv.innerHTML = `
            <i class="bi bi-arrow-clockwise spin"></i>
            Connecting to ${serverHostname}...
        `;
        reportNowBtn.disabled = true;
    } else {
        connectionDiv.className = 'connection-status disconnected';
        connectionDiv.innerHTML = `
            <i class="bi bi-wifi-off"></i>
            Cannot connect to ${serverHostname}
        `;
        reportNowBtn.disabled = true;
    }
    
    // Remove all status classes
    statusDiv.classList.remove('success', 'error', 'pending');
    
    if (status.success) {
        statusDiv.classList.add('success');
        statusDiv.textContent = `Successfully reported ${status.itemsReported} items`;
    } else if (status.error) {
        statusDiv.classList.add('error');
        statusDiv.textContent = `Error: ${status.error}`;
    } else {
        statusDiv.classList.add('pending');
        statusDiv.textContent = 'Waiting for next report...';
    }
    
    detailsDiv.textContent = `Last report: ${formatTimestamp(status.timestamp)}`;
    nextReportDiv.textContent = `Next report in: ${formatTimeUntil(status.nextReportDue)}`;
    
    // Update interval select if we have the current interval
    if (status.reportInterval) {
        reportInterval.value = status.reportInterval.toString();
    }
}

// Function to handle manual report
async function handleManualReport() {
    const reportNowBtn = document.getElementById('reportNow');
    reportNowBtn.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({ action: 'forceReport' });
        updateUI(response);
    } catch (error) {
        console.error('Error triggering manual report:', error);
    } finally {
        setTimeout(() => {
            reportNowBtn.disabled = false;
        }, 1000);
    }
}

// Function to handle interval change
async function handleIntervalChange(event) {
    const newInterval = parseInt(event.target.value, 10);
    try {
        const response = await chrome.runtime.sendMessage({ 
            action: 'setReportInterval',
            interval: newInterval
        });
        updateUI(response);
    } catch (error) {
        console.error('Error updating report interval:', error);
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    const reportNowBtn = document.getElementById('reportNow');
    const reportInterval = document.getElementById('reportInterval');
    
    reportNowBtn.addEventListener('click', handleManualReport);
    reportInterval.addEventListener('change', handleIntervalChange);
});

// Listen for status updates from the background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'statusUpdate') {
        updateUI(message.status);
    }
});

// Get initial status when popup opens
chrome.runtime.sendMessage({ type: 'getStatus' }, (status) => {
    if (status) {
        updateUI(status);
    }
}); 