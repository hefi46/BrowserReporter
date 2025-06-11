#!/bin/bash

# Script to update Chrome extension with new API key
# Usage: ./update-extension-key.sh [API_KEY]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get API key from argument or prompt
if [ -n "$1" ]; then
    API_KEY="$1"
else
    echo "Enter your Extension API Key:"
    read -p "API Key: " API_KEY
fi

if [ -z "$API_KEY" ]; then
    print_error "API key cannot be empty!"
    exit 1
fi

# Find extension file
EXTENSION_FILE="extension/background.js"

if [ ! -f "$EXTENSION_FILE" ]; then
    print_error "Extension file not found: $EXTENSION_FILE"
    print_error "Make sure you're running this from the BrowserReporter directory"
    exit 1
fi

print_status "Updating extension API key..."

# Create backup
cp "$EXTENSION_FILE" "$EXTENSION_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Replace the API key
sed -i "s/API_KEY: '[^']*'/API_KEY: '$API_KEY'/g" "$EXTENSION_FILE"

print_status "✅ Extension API key updated successfully!"
print_warning "📝 Backup created: $EXTENSION_FILE.backup.*"
print_warning "🔄 Please reload the Chrome extension:"
echo "   1. Go to chrome://extensions"
echo "   2. Find 'Browser History Reporter'"
echo "   3. Click the reload button"

# Verify the change
print_status "Current API key in extension: $(grep "API_KEY:" "$EXTENSION_FILE" | sed "s/.*API_KEY: '\([^']*\)'.*/\1/")" 