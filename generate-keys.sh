#!/bin/bash

echo "=== Browser Reporter Security Keys Generator ==="
echo ""

# Generate session secret (64 bytes = 128 hex characters)
SESSION_SECRET=$(openssl rand -hex 64)
echo "SESSION_SECRET:"
echo "$SESSION_SECRET"
echo ""

# Generate extension API key (32 bytes = 64 hex characters)
API_KEY=$(openssl rand -hex 32)
echo "EXTENSION_API_KEY:"
echo "$API_KEY"
echo ""

echo "=== Configuration Examples ==="
echo ""
echo "For config/production.js:"
echo "session: {"
echo "    secret: '$SESSION_SECRET',"
echo "    maxAge: 24 * 60 * 60 * 1000"
echo "},"
echo "security: {"
echo "    extensionApiKey: '$API_KEY'"
echo "},"
echo ""

echo "For .env file:"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "EXTENSION_API_KEY=$API_KEY"
echo ""

echo "=== Important Notes ==="
echo "1. Keep these keys secret and secure!"
echo "2. Don't share them in public repositories"
echo "3. Use the same EXTENSION_API_KEY in your Chrome extension config"
echo "4. Store these keys safely for future reference" 