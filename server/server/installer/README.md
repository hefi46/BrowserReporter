# Browser Reporter Server Installer

This directory contains the MSI installer builder for the Browser Reporter Server. The installer includes a configuration wizard that helps administrators set up the server with their specific Active Directory and security settings.

## Building the Installer

1. Install dependencies:
```bash
npm install
```

2. Build the Electron app:
```bash
npm run build
```

3. Create the MSI installer:
```bash
npm run create-msi
```

The MSI installer will be created in the `dist/installer` directory.

## Installation Process

The MSI installer will:

1. Install the Browser Reporter Server to Program Files
2. Launch a configuration wizard to set up:
   - Server port
   - Session secret
   - Active Directory connection details
   - Admin group name
   - Allowed CORS origins

3. Save the configuration to:
   ```
   %PROGRAMDATA%\BrowserReporter\config\production.js
   ```

4. Install and start the Windows Service

## Configuration Options

### Server Settings
- **Port**: The port number the server will listen on (default: 3000)
- **Session Secret**: A secure random string for session encryption

### Active Directory Settings
- **Domain Controller URL**: LDAP URL of your domain controller
- **Base DN**: Base Distinguished Name for AD queries
- **Service Account**: Credentials for AD operations
- **Admin Group**: AD group name for administrator access

### Security Settings
- **Allowed Origins**: List of allowed CORS origins

## Post-Installation

After installation:
1. The configuration wizard will run automatically
2. Fill in all required settings
3. The service will start automatically after configuration
4. Access the web interface at `http://localhost:PORT`

## Troubleshooting

1. If the configuration wizard doesn't start:
   - Run manually from Program Files\BrowserReporter
   - Check Windows Event Viewer for errors

2. If the service fails to start:
   - Verify configuration in %PROGRAMDATA%\BrowserReporter
   - Check service account permissions
   - Review logs in the installation directory

3. For connection issues:
   - Verify AD settings
   - Check firewall rules
   - Ensure service account has necessary permissions

## Uninstallation

1. Use Windows Add/Remove Programs
2. Or run the MSI installer again and select "Remove"

The uninstaller will:
- Stop and remove the Windows Service
- Remove all program files
- Preserve configuration and data files

To completely remove all data:
1. Delete %PROGRAMDATA%\BrowserReporter manually
2. Remove any database files if stored in a custom location 