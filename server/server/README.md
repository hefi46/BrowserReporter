# Browser Reporter Server

The server component of the Browser Reporter system, providing a secure API for collecting and managing browser history data in an enterprise environment.

## Features

- Active Directory authentication and authorization
- Secure API endpoints for browser history collection
- SQLite database for data storage
- Windows Service integration
- Configurable logging
- Session management
- CORS protection

## Prerequisites

- Node.js 18.x or later
- Windows Server 2016 or later (for service installation)
- Active Directory domain environment
- Service account with appropriate permissions

## Installation

1. Clone the repository and navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Configure the application:
   - Copy `config/default.js` to `config/production.js`
   - Update the configuration with your environment settings:
     - Active Directory connection details
     - Session secret
     - Allowed origins
     - Admin group name

4. Create required directories:
```bash
mkdir logs data
```

5. Install as a Windows Service:
```bash
npm run install-service
```

## Configuration

The configuration file (`config/production.js`) should be updated with your environment-specific settings:

- `port`: The port number for the server (default: 3000)
- `session.secret`: A secure session secret
- `activeDirectory`:
  - `url`: Your AD domain controller URL
  - `baseDN`: Base Distinguished Name for AD queries
  - `username`: Service account username
  - `password`: Service account password
  - `adminGroup`: AD group for administrators
- `allowedOrigins`: Array of allowed CORS origins
- `database.path`: Path to SQLite database file
- `logging`: Logging configuration

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### As a Windows Service

The server can be installed as a Windows Service using:

```bash
npm run install-service
```

To uninstall the service:

```bash
npm run uninstall-service
```

## API Endpoints

### Authentication

- `POST /api/auth`: Authenticate user with AD credentials
- `GET /api/auth/status`: Check authentication status
- `POST /api/auth/logout`: Logout user

### Browser History

- `POST /api/history`: Submit browser history entries
- `GET /api/history`: Retrieve browser history (requires admin)
  - Query parameters:
    - `userId`: Filter by user
    - `startDate`: Start date filter
    - `endDate`: End date filter
    - `browser`: Filter by browser type
    - `limit`: Limit number of results

## Security

- Active Directory integration for authentication
- Session-based authentication
- CORS protection
- Helmet security headers
- Input validation
- Prepared statements for database queries

## Logging

Logs are stored in the `logs` directory:
- `combined.log`: All logs (info and above)
- `error.log`: Error logs only

In development, logs are also output to the console.

## Troubleshooting

1. Service won't start:
   - Check service account permissions
   - Verify AD connection settings
   - Check logs for detailed error messages

2. Authentication issues:
   - Verify AD configuration
   - Ensure service account has appropriate permissions
   - Check network connectivity to domain controller

3. Database errors:
   - Verify data directory permissions
   - Check disk space
   - Ensure SQLite file is not locked

## License

This software is proprietary and confidential.
Copyright © 2024 Your Company Name 