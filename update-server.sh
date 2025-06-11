#!/bin/bash

# Browser Reporter Server Update Script
# This script pulls the latest changes from GitHub and updates the server

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[UPDATE]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
INSTALL_DIR="/opt/BrowserReporter"
SERVICE_NAME="browser-reporter"

echo ""
echo "=========================================="
echo "    Browser Reporter Server Updater     "
echo "=========================================="
echo ""

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    print_error "Installation directory not found: $INSTALL_DIR"
    print_error "Please run the installation script first."
    exit 1
fi

# Navigate to installation directory
cd "$INSTALL_DIR"

print_header "Checking Current Status"
print_status "Current directory: $(pwd)"
print_status "Current branch: $(git branch --show-current)"
print_status "Last commit: $(git log -1 --oneline)"

# Check for local changes
if ! git diff-index --quiet HEAD --; then
    print_warning "Local changes detected!"
    print_warning "The following files have been modified:"
    git diff-index --name-only HEAD --
    echo ""
    
    read -p "Do you want to stash local changes? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stashing local changes..."
        git stash push -m "Auto-stash before update $(date)"
    else
        print_error "Cannot proceed with local changes. Please commit or stash them first."
        exit 1
    fi
fi

print_header "Updating from GitHub"
print_status "Fetching latest changes..."
git fetch origin

# Check if updates are available
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Already up to date!"
    echo ""
    print_status "Current version: $(git log -1 --oneline)"
    exit 0
fi

print_status "Updates available. Pulling changes..."
git pull origin main

print_status "Updated to: $(git log -1 --oneline)"

# Check if package.json changed in server directory
if git diff --name-only HEAD@{1} HEAD | grep -q "server/package.json"; then
    print_header "Updating Dependencies"
    cd "$INSTALL_DIR/server"
    print_status "package.json changed. Updating dependencies..."
    npm install
    print_status "Dependencies updated!"
    cd "$INSTALL_DIR"
else
    print_status "No dependency changes detected."
fi

# Check if extension files changed
if git diff --name-only HEAD@{1} HEAD | grep -q "extension/"; then
    print_warning "Extension files were updated!"
    print_warning "You may need to reload the Chrome extension:"
    print_warning "  1. Go to chrome://extensions"
    print_warning "  2. Find 'Browser History Reporter'"
    print_warning "  3. Click the reload button"
fi

print_header "Restarting Application"

# Check if PM2 service exists
if pm2 list | grep -q "$SERVICE_NAME"; then
    print_status "Restarting $SERVICE_NAME service..."
    pm2 restart "$SERVICE_NAME"
    
    # Wait a moment for restart
    sleep 2
    
    print_status "Service status:"
    pm2 status "$SERVICE_NAME"
else
    print_warning "PM2 service '$SERVICE_NAME' not found."
    print_status "Starting service manually..."
    cd "$INSTALL_DIR/server"
    NODE_ENV=production pm2 start server.js --name "$SERVICE_NAME"
fi

print_header "Update Summary"
print_status "✅ Repository updated successfully!"
print_status "✅ Service restarted!"

# Show recent commits
print_status "Recent changes:"
git log --oneline -5

echo ""
print_status "🔗 Server should be accessible at: http://$(hostname -I | awk '{print $1}'):3000"

# Check if server is responding
print_status "Testing server response..."
if curl -s http://localhost:3000 > /dev/null; then
    print_status "✅ Server is responding!"
else
    print_warning "⚠️  Server may not be responding. Check logs with: pm2 logs $SERVICE_NAME"
fi

echo ""
print_status "Update completed!" 