#!/bin/bash

# Browser Reporter Automated Installation Script
# This script installs the Browser Reporter server on Ubuntu and automatically configures security keys

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Configuration variables (you can modify these)
INSTALL_DIR="/opt/BrowserReporter"
SERVER_PORT="3000"
SERVER_HOST="0.0.0.0"

# Prompt for Active Directory configuration
prompt_ad_config() {
    echo ""
    print_header "Active Directory Configuration"
    echo "Please provide your Active Directory settings:"
    
    read -p "Domain Controller URL (e.g., ldaps://dc.yourdomain.com:636): " AD_URL
    read -p "Base DN (e.g., DC=yourdomain,DC=com): " AD_BASE_DN
    read -p "Service Account Username (e.g., browserreporter@yourdomain.com): " AD_USERNAME
    read -s -p "Service Account Password: " AD_PASSWORD
    echo ""
    read -p "Admin Group Name (e.g., BrowserReporterAdmins): " AD_ADMIN_GROUP
    read -p "CORS Origin (e.g., https://yourdomain.com): " CORS_ORIGIN
}

# Generate security keys
generate_keys() {
    print_status "Generating security keys..."
    SESSION_SECRET=$(openssl rand -hex 64)
    EXTENSION_API_KEY=$(openssl rand -hex 32)
    
    print_status "Generated SESSION_SECRET: ${SESSION_SECRET:0:20}..."
    print_status "Generated EXTENSION_API_KEY: ${EXTENSION_API_KEY:0:20}..."
}

# Install prerequisites
install_prerequisites() {
    print_header "Installing Prerequisites"
    
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    
    print_status "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_status "Installing Git..."
    sudo apt install git -y
    
    print_status "Installing PM2..."
    sudo npm install -g pm2
    
    print_status "Verifying installations..."
    node --version
    npm --version
    git --version
}

# Clone and setup repository
setup_repository() {
    print_header "Setting up Browser Reporter"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "Directory $INSTALL_DIR already exists. Removing..."
        sudo rm -rf "$INSTALL_DIR"
    fi
    
    print_status "Cloning repository..."
    sudo git clone https://github.com/hefi46/BrowserReporter.git "$INSTALL_DIR"
    
    print_status "Setting permissions..."
    sudo chown -R $USER:$USER "$INSTALL_DIR"
    
    cd "$INSTALL_DIR/server"
    
    print_status "Installing Node.js dependencies..."
    npm install
    
    print_status "Creating data and logs directories..."
    mkdir -p data logs
    chmod 755 data logs
}

# Create production configuration
create_config() {
    print_header "Creating Production Configuration"
    
    CONFIG_FILE="$INSTALL_DIR/server/config/production.js"
    
    print_status "Creating $CONFIG_FILE..."
    
    cat > "$CONFIG_FILE" << EOF
module.exports = {
    server: {
        port: process.env.PORT || $SERVER_PORT,
        host: '$SERVER_HOST'
    },
    database: {
        path: './data/browser_history.db',
        sessionsPath: './data/sessions.db'
    },
    session: {
        secret: '$SESSION_SECRET',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    activeDirectory: {
        url: '$AD_URL',
        baseDN: '$AD_BASE_DN',
        username: '$AD_USERNAME',
        password: '$AD_PASSWORD',
        adminGroup: '$AD_ADMIN_GROUP'
    },
    security: {
        extensionApiKey: '$EXTENSION_API_KEY'
    },
    cors: {
        origin: ['http://localhost:$SERVER_PORT', '$CORS_ORIGIN'],
        credentials: true
    },
    logging: {
        level: 'info',
        directory: './logs'
    }
};
EOF

    print_status "Production configuration created successfully!"
}

# Update extension with API key
update_extension() {
    print_header "Updating Extension Configuration"
    
    EXTENSION_FILE="$INSTALL_DIR/extension/background.js"
    
    if [ -f "$EXTENSION_FILE" ]; then
        print_status "Updating extension API key..."
        
        # Create backup
        cp "$EXTENSION_FILE" "$EXTENSION_FILE.backup"
        
        # Replace the API key in the extension
        sed -i "s/API_KEY: 'production-api-key-replace-with-generated-key'/API_KEY: '$EXTENSION_API_KEY'/g" "$EXTENSION_FILE"
        
        print_status "Extension updated with production API key!"
        print_warning "You need to reload the Chrome extension after installation!"
    else
        print_warning "Extension file not found at $EXTENSION_FILE"
    fi
}

# Configure firewall
setup_firewall() {
    print_header "Configuring Firewall"
    
    print_status "Allowing port $SERVER_PORT through firewall..."
    sudo ufw allow "$SERVER_PORT/tcp"
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        print_status "Enabling UFW firewall..."
        sudo ufw --force enable
    fi
    
    print_status "Firewall configured!"
    sudo ufw status
}

# Start the application
start_application() {
    print_header "Starting Browser Reporter Server"
    
    cd "$INSTALL_DIR/server"
    
    print_status "Starting application with PM2..."
    NODE_ENV=production pm2 start server.js --name "browser-reporter"
    
    print_status "Saving PM2 configuration..."
    pm2 save
    
    print_status "Setting up PM2 to start on boot..."
    pm2 startup
    
    print_status "Application started successfully!"
    pm2 status
}

# Create summary file with keys
create_summary() {
    SUMMARY_FILE="$INSTALL_DIR/installation-summary.txt"
    
    cat > "$SUMMARY_FILE" << EOF
===============================================
Browser Reporter Installation Summary
===============================================
Installation Date: $(date)
Installation Directory: $INSTALL_DIR
Server Port: $SERVER_PORT

SECURITY KEYS (KEEP SECURE):
===============================================
SESSION_SECRET: $SESSION_SECRET
EXTENSION_API_KEY: $EXTENSION_API_KEY

CONFIGURATION:
===============================================
Active Directory URL: $AD_URL
Base DN: $AD_BASE_DN
Service Account: $AD_USERNAME
Admin Group: $AD_ADMIN_GROUP
CORS Origin: $CORS_ORIGIN

NEXT STEPS:
===============================================
1. Update Chrome extension:
   - Open Chrome and go to chrome://extensions
   - Find "Browser History Reporter" extension
   - Click "Reload" button
   
2. Access admin interface:
   - URL: http://$(hostname -I | awk '{print $1}'):$SERVER_PORT
   - Or: $CORS_ORIGIN

3. Management commands:
   - View status: pm2 status
   - View logs: pm2 logs browser-reporter
   - Restart: pm2 restart browser-reporter
   - Stop: pm2 stop browser-reporter

4. Update application:
   - cd $INSTALL_DIR
   - git pull origin main
   - cd server && npm install
   - pm2 restart browser-reporter

===============================================
IMPORTANT: Keep this file secure and private!
===============================================
EOF

    print_status "Installation summary saved to: $SUMMARY_FILE"
}

# Main installation function
main() {
    echo ""
    echo "=========================================="
    echo "  Browser Reporter Automated Installer  "
    echo "=========================================="
    echo ""
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root!"
        exit 1
    fi
    
    # Prompt for configuration
    prompt_ad_config
    
    # Generate security keys
    generate_keys
    
    # Install everything
    install_prerequisites
    setup_repository
    create_config
    update_extension
    setup_firewall
    start_application
    create_summary
    
    echo ""
    print_status "✅ Browser Reporter installation completed successfully!"
    echo ""
    print_status "🔗 Access your server at: http://$(hostname -I | awk '{print $1}'):$SERVER_PORT"
    print_status "📄 Installation details saved to: $INSTALL_DIR/installation-summary.txt"
    echo ""
    print_warning "🔄 Don't forget to reload the Chrome extension!"
    print_warning "🔑 Your API keys are saved in the summary file - keep them secure!"
    echo ""
}

# Run main function
main "$@" 