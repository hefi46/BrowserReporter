// Import config from config.js
importScripts('config.js');

// Extension-specific configuration
const EXTENSION_CONFIG = {
    API_KEY: 'local-dev-key', // Development API key - should match server's EXTENSION_API_KEY
};

// Status tracking
let lastReportStatus = {
    timestamp: null,
    success: false,
    error: null,
    itemsReported: 0,
    nextReportDue: null,
    reportInterval: CONFIG.REPORT_INTERVAL
};

// Connection status tracking
let connectionStatus = {
    isConnected: false,
    lastCheck: null,
    lastSuccess: null,
    checkInterval: null
};

// Reporting interval tracking
let reportingInterval = null;

// Cache for user info
let cachedUserInfo = null;

// Function to update extension badge
function updateBadge(success) {
    if (success) {
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        setTimeout(() => {
            // Only clear the badge if we're not showing a connection status
            if (!connectionStatus.isConnected) {
                chrome.action.setBadgeText({ text: '' });
            }
        }, 3000);
    } else {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    }
}

// Function to update connection status badge
function updateConnectionBadge() {
    if (connectionStatus.isConnected) {
        chrome.action.setBadgeText({ text: '•' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
        chrome.action.setBadgeText({ text: '×' });
        chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    }
}

// Function to check server connection
async function checkServerConnection() {
    try {
        console.log('Checking server connection...');
        const response = await fetch(`${CONFIG.SERVER_URL}/api/health`, {
            headers: {
                'X-API-Key': EXTENSION_CONFIG.API_KEY
            }
        });
        
        const wasConnected = connectionStatus.isConnected;
        connectionStatus.isConnected = response.ok;
        connectionStatus.lastCheck = new Date();
        
        if (response.ok) {
            connectionStatus.lastSuccess = new Date();
            console.log('Server connection successful');
            if (!wasConnected) {
                console.log('Connection restored');
            }
        } else {
            console.error('Server returned error:', response.status);
            if (wasConnected) {
                console.log('Connection lost');
            }
        }
    } catch (error) {
        console.error('Server connection check failed:', error);
        connectionStatus.isConnected = false;
    }
    
    updateConnectionBadge();
    notifyStatusUpdate();
}

// Function to update status and notify popup
function updateStatus(success, error = null, itemsReported = 0) {
    const now = new Date();
    lastReportStatus = {
        timestamp: now.toISOString(),
        success,
        error,
        itemsReported,
        nextReportDue: new Date(now.getTime() + lastReportStatus.reportInterval).toISOString(),
        reportInterval: lastReportStatus.reportInterval
    };
    
    notifyStatusUpdate();
    updateBadge(success);
}

// Function to notify popup of status updates
function notifyStatusUpdate() {
    const status = {
        ...lastReportStatus,
        connection: {
            isConnected: connectionStatus.isConnected,
            lastCheck: connectionStatus.lastCheck?.toISOString(),
            lastSuccess: connectionStatus.lastSuccess?.toISOString()
        }
    };
    
    chrome.runtime.sendMessage({
        type: 'statusUpdate',
        status: status
    }).catch(() => {
        // Ignore errors when no popup is listening
    });
}

// Function to set up reporting interval
function setupReportingInterval(interval) {
    // Clear existing interval if any
    if (reportingInterval) {
        clearInterval(reportingInterval);
    }
    
    // Update status with new interval
    lastReportStatus.reportInterval = interval;
    
    // Calculate next report time
    const now = new Date();
    lastReportStatus.nextReportDue = new Date(now.getTime() + interval).toISOString();
    
    // Set up new interval
    reportingInterval = setInterval(reportBrowserHistory, interval);
    
    // Notify popup of the change
    notifyStatusUpdate();
    
    console.log(`Reporting interval set to ${interval}ms`);
}

// Get computer name using environment variables
async function getComputerName() {
    try {
        return window.navigator.userAgent.split('(')[1].split(';')[0] || 'unknown';
    } catch (error) {
        console.error('Error getting computer name:', error);
        return 'unknown';
    }
}

// Get current username from browser identity
async function getUsername() {
    try {
        const info = await chrome.identity.getProfileUserInfo();
        return info.email.split('@')[0] || 'unknown';
    } catch (error) {
        console.error('Error getting username:', error);
        return 'unknown';
    }
}

// Collect browser history
async function collectHistory() {
    const endTime = Date.now();
    const startTime = endTime - (CONFIG.HISTORY_TIME_RANGE * 60 * 1000); // Convert minutes to milliseconds

    return new Promise((resolve) => {
        chrome.history.search({
            text: '',
            startTime,
            endTime,
            maxResults: CONFIG.MAX_HISTORY_ITEMS
        }, resolve);
    });
}

// Send report to server with retries
async function sendReport(data, retryCount = 0) {
    console.log('Attempting to send data to server:', {
        url: `${CONFIG.SERVER_URL}/api/report`,
        apiKey: EXTENSION_CONFIG.API_KEY,
        dataPreview: {
            username: data.username,
            visitCount: data.visits.length
        }
    });

    try {
        const response = await fetch(`${CONFIG.SERVER_URL}/api/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': EXTENSION_CONFIG.API_KEY
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        console.log('Successfully sent data to server');
        updateStatus(true, null, data.visits.length);
        return await response.json();
    } catch (error) {
        console.error(`Error sending data (attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES}):`, error);
        updateStatus(false, error.message);
        
        if (retryCount < CONFIG.MAX_RETRIES) {
            // Wait for retry interval before trying again
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_INTERVAL));
            return sendReport(data, retryCount + 1);
        }
        
        throw error;
    }
}

// Main reporting function
async function reportBrowserHistory() {
    try {
        const [history, username, computerName] = await Promise.all([
            collectHistory(),
            getUsername(),
            getComputerName()
        ]);

        if (history.length === 0) {
            console.log('No history to report');
            updateStatus(true, null, 0);
            return;
        }

        const report = {
            username,
            computerName,
            visits: history.map(item => ({
                url: item.url,
                title: item.title,
                visitTime: item.lastVisitTime,
                computerName
            }))
        };

        await sendReport(report);
    } catch (error) {
        console.error('Error in report process:', error);
        updateStatus(false, error.message);
    }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getStatus') {
        const status = {
            ...lastReportStatus,
            connection: {
                isConnected: connectionStatus.isConnected,
                lastCheck: connectionStatus.lastCheck?.toISOString(),
                lastSuccess: connectionStatus.lastSuccess?.toISOString()
            }
        };
        sendResponse(status);
        return true;
    }
    
    if (message.action === 'forceReport') {
        reportBrowserHistory().then(() => {
            const status = {
                ...lastReportStatus,
                connection: {
                    isConnected: connectionStatus.isConnected,
                    lastCheck: connectionStatus.lastCheck?.toISOString(),
                    lastSuccess: connectionStatus.lastSuccess?.toISOString()
                }
            };
            sendResponse(status);
        });
        return true;
    }
    
    if (message.action === 'setReportInterval') {
        setupReportingInterval(message.interval);
        const status = {
            ...lastReportStatus,
            connection: {
                isConnected: connectionStatus.isConnected,
                lastCheck: connectionStatus.lastCheck?.toISOString(),
                lastSuccess: connectionStatus.lastSuccess?.toISOString()
            }
        };
        sendResponse(status);
        return true;
    }
});

// Start connection checking
checkServerConnection();
connectionStatus.checkInterval = setInterval(checkServerConnection, 30000); // Check every 30 seconds

// Set up initial reporting interval
setupReportingInterval(CONFIG.REPORT_INTERVAL);

// Initial report
reportBrowserHistory(); 