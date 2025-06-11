# Browser History Reporter

A browser history reporting system consisting of a Chrome extension and a Node.js server. The system allows organizations to collect and monitor browser history data through an admin interface.

## Project Structure

```
browser-reporter/
├── extension-app/     # Chrome extension
│   └── src/
│       ├── manifest.json
│       ├── background.js
│       ├── popup.html
│       ├── popup.js
│       ├── config.js
│       └── icons/
└── server-app/        # Node.js server
    ├── server.js
    ├── config/
    ├── server/
    ├── public/
    ├── data/
    ├── package.json
    └── docker/
```

## Server Setup

1. Navigate to the server directory:
   ```bash
   cd server-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   - Development mode:
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```
   - Using Docker:
     ```bash
     docker-compose up -d
     ```

The server will run on `http://localhost:3000` by default.

## Extension Setup

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension-app/src` directory

## Configuration

### Server Configuration
- Server configuration files are located in `server-app/config/`
- Default port: 3000
- Default database: SQLite (stored in `data/` directory)

### Extension Configuration
- Extension settings are in `extension-app/src/config.js`
- Default reporting interval: 5 minutes
- Server URL: `http://localhost:3000` (adjust as needed)

## Features

### Server
- Admin interface for viewing and filtering history data
- User authentication and authorization with Active Directory integration
- SQLite database for data storage
- User information display (display name, department) from Active Directory
- Docker support for easy deployment
- API endpoints for history reporting

### Extension
- Automatic history reporting at configurable intervals
- Manual "Report Now" button
- Connection status indicator
- User-friendly popup interface
- Secure communication with server

## Security

- Extension uses an API key for authentication
- Server validates all requests
- Data is stored securely in SQLite database
- No sensitive data is logged

## Troubleshooting

1. Extension not connecting to server:
   - Verify server is running
   - Check server URL in extension config
   - Ensure API key matches

2. Server issues:
   - Check logs in `server-app/logs/`
   - Verify database permissions
   - Check port availability

## Development

To modify the extension:
1. Make changes in `extension-app/src/`
2. Reload the extension in Chrome

To modify the server:
1. Make changes in `server-app/`
2. Restart the server to apply changes 