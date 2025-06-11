# Browser Reporter Extension

Chrome extension for the Browser History Reporter system. Automatically collects and reports browser history to a configured server.

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `src` directory from this folder

## Configuration

Edit `src/config.js` to configure:
- Server URL
- Reporting interval
- API key
- History collection settings

## Features

- Automatic history reporting
- Configurable reporting intervals (1 min to 1 hour)
- Manual "Report Now" button
- Connection status indicator
- Visual feedback for report status
- Error handling and retry logic

## Directory Structure

```
extension-app/
└── src/
    ├── manifest.json   # Extension manifest
    ├── background.js   # Background service worker
    ├── popup.html     # Popup UI
    ├── popup.js       # Popup logic
    ├── config.js      # Configuration
    └── icons/         # Extension icons
```

## Development

1. Make changes to files in `src/`
2. Go to `chrome://extensions`
3. Click the refresh icon on the extension card
4. Test your changes

## Debugging

1. View background logs:
   - Go to `chrome://extensions`
   - Click "background page" under the extension

2. View popup logs:
   - Right-click the extension icon
   - Click "Inspect popup"

## Common Issues

1. Not connecting to server:
   - Check server URL in config.js
   - Verify server is running
   - Check browser console for errors

2. History not reporting:
   - Check extension permissions
   - Verify API key is correct
   - Check background page console 