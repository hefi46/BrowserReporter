// Generate a unique client ID and store it
let clientId = localStorage.getItem('clientId');
if (!clientId) {
    clientId = 'client_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('clientId', clientId);
}

let showingFavorites = false;
let favorites = new Set();
let currentUser = null;
let showAllData = false;

// Format date to Melbourne timezone
function formatMelbourneTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
        timeZone: 'Australia/Melbourne',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Initialize
async function init() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
            document.getElementById('loginPage').classList.add('d-none');
            document.getElementById('usersPage').classList.remove('d-none');
            await fetchFavorites();
            await fetchAllData();
            setupEventListeners();
        } else {
            document.getElementById('usersPage').classList.add('d-none');
            document.getElementById('loginPage').classList.remove('d-none');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        document.getElementById('usersPage').classList.add('d-none');
        document.getElementById('loginPage').classList.remove('d-none');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Back to users button
    document.getElementById('backToUsersBtn').addEventListener('click', showUsersList);
    
    // Toggle favorites button
    document.getElementById('toggleFavoritesBtn').addEventListener('click', toggleFavorites);
    
    // Apply filters buttons
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('applyUserFiltersBtn').addEventListener('click', applyUserFilters);
    
    // Export dropdown items
    document.querySelectorAll('[data-format]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const format = e.target.getAttribute('data-format');
            exportData(format);
        });
    });
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('loginPage').classList.add('d-none');
            document.getElementById('usersPage').classList.remove('d-none');
            await fetchFavorites();
            await fetchAllData();
            setupEventListeners();
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        alert('Login failed');
    }
});

// Fetch favorites
async function fetchFavorites() {
    try {
        const response = await fetch('/api/favorites');
        const data = await response.json();
        favorites = new Set(data.map(f => f.favorite_username));
        return data;
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
    }
}

// Toggle favorite status
async function toggleFavorite(username) {
    try {
        if (favorites.has(username)) {
            await fetch('/api/favorites/remove', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favoriteUsername: username })
            });
            favorites.delete(username);
        } else {
            await fetch('/api/favorites/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favoriteUsername: username })
            });
            favorites.add(username);
        }
        await fetchAllData();
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Toggle favorites view
function toggleFavorites() {
    showingFavorites = !showingFavorites;
    fetchAllData();
}

// Get users filter parameters
function getUsersFilterParams() {
    return {
        username: document.getElementById('userFilter').value,
        computerName: document.getElementById('computerFilter').value,
        activityDays: document.getElementById('activityFilter').value,
        favorites: showingFavorites,
        showAll: showAllData
    };
}

// Get user history filter parameters
function getUserHistoryFilterParams() {
    return {
        url: document.getElementById('urlFilter').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        username: currentUser
    };
}

// Fetch and display all data
async function fetchAllData() {
    const params = new URLSearchParams(getUsersFilterParams());
    const response = await fetch(`/api/reports/all?${params}`);
    const data = await response.json();
    
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    data.forEach(user => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card user-card" data-username="${user.username}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${user.displayName}</h5>
                            <div class="text-muted small">${user.username}</div>
                        </div>
                        <i class="bi bi-star${favorites.has(user.username) ? '-fill active' : ''} favorite-star" 
                           data-username="${user.username}"></i>
                    </div>
                    <div class="department-info mb-2">
                        <i class="bi bi-building"></i> ${user.department}
                    </div>
                    <div class="computer-info mb-2">
                        <i class="bi bi-pc-display"></i> ${user.computerName || 'Unknown Computer'}
                    </div>
                    <div class="last-activity mb-2">
                        <i class="bi bi-clock"></i> Last active: ${formatMelbourneTime(user.lastActivity)}
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="visit-count-badge badge bg-primary">
                            ${user.totalVisits} visits
                        </span>
                        <span class="visit-count-badge badge bg-info">
                            ${user.uniqueUrls} unique URLs
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler to the card
        card.querySelector('.user-card').addEventListener('click', () => {
            showUserDetails(user.username);
        });
        
        // Add click handler to the favorite star
        card.querySelector('.favorite-star').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(user.username);
        });
        
        container.appendChild(card);
    });
}

// Show users list
function showUsersList() {
    currentUser = null;
    document.getElementById('userDetailsPage').classList.add('d-none');
    document.getElementById('usersPage').classList.remove('d-none');
    fetchAllData(); // Refresh the users list when going back
}

// Show user details
async function showUserDetails(username) {
    currentUser = username;
    document.getElementById('usersPage').classList.add('d-none');
    document.getElementById('userDetailsPage').classList.remove('d-none');
    
    // Try to get the display name from the user data
    const userCard = document.querySelector(`[data-username="${username}"]`);
    const displayName = userCard ? userCard.querySelector('.card-title').textContent : username;
    document.getElementById('userDetailsTitle').textContent = `${displayName}'s Activity`;
    
    await fetchUserHistory();
}

// Fetch and display user history
async function fetchUserHistory() {
    const params = new URLSearchParams(getUserHistoryFilterParams());
    console.log('Fetching user history for:', currentUser, 'with params:', params.toString());
    
    try {
        const response = await fetch(`/api/reports/user/${currentUser}?${params}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Failed to fetch user history');
        }
        const data = await response.json();
        console.log('User history data:', data);
        
        const container = document.getElementById('userHistory');
        container.innerHTML = '';

        // Add summary cards
        const summaryRow = document.createElement('div');
        summaryRow.className = 'row mb-4';
        summaryRow.innerHTML = `
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Total Visits</h5>
                        <p class="card-text">${data.summary.totalVisits}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Unique URLs</h5>
                        <p class="card-text">${data.summary.uniqueUrls}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">First Activity</h5>
                        <p class="card-text">${formatMelbourneTime(data.summary.firstActivity)}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Last Activity</h5>
                        <p class="card-text">${formatMelbourneTime(data.summary.lastActivity)}</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(summaryRow);

        // Add history table
        const table = document.createElement('div');
        table.className = 'table-responsive';
        table.innerHTML = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Title</th>
                        <th>Link</th>
                        <th>Visit Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.history.map(item => `
                        <tr>
                            <td style="white-space: nowrap;">${formatMelbourneTime(item.lastVisitTime)}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${item.title || 'No title'}</td>
                            <td style="text-align: center;">
                                <a href="${item.url}" target="_blank" class="btn btn-sm btn-outline-primary" title="${item.url}">
                                    <i class="bi bi-box-arrow-up-right"></i>
                                </a>
                            </td>
                            <td>${item.visitCount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.appendChild(table);
        
        console.log('User history rendered successfully');
    } catch (error) {
        console.error('Error fetching user history:', error);
        const container = document.getElementById('userHistory');
        container.innerHTML = '<div class="alert alert-danger">Failed to load user history</div>';
    }
}

// Apply filters for users list
function applyFilters() {
    fetchAllData();
}

// Apply filters for user history
function applyUserFilters() {
    fetchUserHistory();
}

// Export all data
async function exportData(format) {
    const params = new URLSearchParams(getUsersFilterParams());
    await downloadExport(`/api/export/all?${params}&format=${format}`, format, 'browser-history');
}

// Download export file
async function downloadExport(url, format, prefix) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${prefix}-${new Date().toISOString()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading export:', error);
        alert('Failed to download export');
    }
}

// Initialize the app
init(); 