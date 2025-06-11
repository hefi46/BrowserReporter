const CONFIG = {
    // Use localhost for testing
    SERVER_URL: 'http://BrowserReporter',
    
    // Network settings
    RETRY_INTERVAL: 30 * 1000, // 30 seconds between retries if server is unreachable
    MAX_RETRIES: 3, // Maximum number of retries per report
    
    // Data collection settings
    REPORT_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds
    MAX_HISTORY_ITEMS: 100,
    HISTORY_TIME_RANGE: 5, // minutes
    
    // Optional: DNS discovery settings
    // These can be configured by your DNS administrator
    DNS_DISCOVERY_ENABLED: true, // Set to true if using DNS SRV records
    DNS_SERVICE_NAME: '_browser-reporter._tcp' // DNS SRV record name if using service discovery
}; 