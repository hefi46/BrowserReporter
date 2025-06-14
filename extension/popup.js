// Browser Reporter V2 - Popup Interface
class BrowserReporterPopup {
    constructor() {
        this.sendButton = document.getElementById('send-button');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.userStatus = document.getElementById('user-status');
        this.activityCount = document.getElementById('activity-count');
        this.lastReport = document.getElementById('last-report');
        
        this.init();
    }

    async init() {
        // Set up event listeners
        this.sendButton.addEventListener('click', () => this.sendReportNow());
        
        // Listen for status updates from background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'statusUpdate') {
                this.updateStatusText(message.status);
            }
        });
        
        // Load initial data
        await this.loadStatus();
        
        // Refresh status every 5 seconds
        setInterval(() => this.loadStatus(), 5000);
    }

    async loadStatus() {
        try {
            const response = await this.sendMessage({ action: 'getStatus' });
            
            if (response && response.success) {
                this.updateUI(response.data);
            } else {
                this.showError('Failed to load status');
            }
        } catch (error) {
            console.error('Failed to load status:', error);
            this.showError('Communication error');
        }
    }

    updateUI(data) {
        // Update status indicator and text
        this.updateStatusText(data.status);
        
        // Update user data status
        if (data.userDataReady && data.userData) {
            this.userStatus.textContent = 'Ready';
            this.userStatus.style.color = '#10b981';
        } else {
            this.userStatus.textContent = 'Not Ready';
            this.userStatus.style.color = '#f59e0b';
        }
        
        // Update activity count
        this.activityCount.textContent = data.activityCount || 0;
        
        // Update last report time
        if (data.lastReport) {
            const lastReportTime = new Date(data.lastReport);
            this.lastReport.textContent = `Last sent: ${this.formatTimeAgo(lastReportTime)}`;
        } else {
            this.lastReport.textContent = 'Never sent';
        }
        
        // Update send button state
        const canSend = data.userDataReady && data.activityCount > 0;
        this.sendButton.disabled = !canSend;
        
        if (!data.userDataReady) {
            this.sendButton.innerHTML = '<span>Waiting for User Data...</span>';
        } else if (data.activityCount === 0) {
            this.sendButton.innerHTML = '<span>No Activities to Send</span>';
        } else {
            this.sendButton.innerHTML = '<span>Send Report Now</span>';
        }
    }

    updateStatusText(status) {
        this.statusText.textContent = status;
        
        // Update status indicator color based on status
        this.statusIndicator.className = 'status-indicator';
        
        if (status.includes('ready') || status.includes('Sent')) {
            this.statusIndicator.classList.add('status-ready');
        } else if (status.includes('Waiting') || status.includes('Checking') || status.includes('Sending')) {
            this.statusIndicator.classList.add('status-waiting');
        } else if (status.includes('error') || status.includes('failed') || status.includes('unavailable')) {
            this.statusIndicator.classList.add('status-error');
        } else {
            this.statusIndicator.classList.add('status-waiting');
        }
    }

    async sendReportNow() {
        if (this.sendButton.disabled) return;
        
        try {
            // Show sending state
            this.sendButton.classList.add('sending');
            this.sendButton.disabled = true;
            
            const response = await this.sendMessage({ action: 'sendReportNow' });
            
            if (response && response.success) {
                this.showSuccess(response.message || 'Report sent successfully!');
                // Refresh status after successful send
                setTimeout(() => this.loadStatus(), 1000);
            } else {
                this.showError(response?.error || 'Failed to send report');
            }
            
        } catch (error) {
            console.error('Failed to send report:', error);
            this.showError('Send failed');
        } finally {
            // Remove sending state
            this.sendButton.classList.remove('sending');
            setTimeout(() => {
                this.sendButton.disabled = false;
            }, 2000);
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        this.updateStatusText('Success!');
        this.statusIndicator.className = 'status-indicator status-ready';
        
        // Reset after a few seconds
        setTimeout(() => {
            this.loadStatus();
        }, 3000);
    }

    showError(message) {
        console.error('❌', message);
        this.updateStatusText('Error');
        this.statusIndicator.className = 'status-indicator status-error';
        
        // Reset after a few seconds
        setTimeout(() => {
            this.loadStatus();
        }, 3000);
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    async sendMessage(message) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Chrome runtime error:', chrome.runtime.lastError);
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response || { success: false, error: 'No response' });
                    }
                });
            } catch (error) {
                console.error('Error sending message:', error);
                resolve({ success: false, error: error.message });
            }
        });
    }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BrowserReporterPopup();
    });
} else {
    new BrowserReporterPopup();
}
