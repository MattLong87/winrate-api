# Winrate API

WinRate is a responsive, full-stack app that lets users journal their board-gaming sessions and view statistics about their gaming history.

## Getting Started
This repo contains the back-end API for WinRate. The front-end (React) client is located [here](https://github.com/MattLong87/winrate-client).

### Installation
1. `git clone https://github.com/MattLong87/winrate-api.git`
2. `cd winrate-api`
3. `npm install`

### Launching
`node server.js`

### Testing
`npm test`

### Authorization Flow
1. When user is created or logs in with username and password, token is generated and returned.
2. Future requests supply token in header: `Authorization: Bearer {token}`

## Endpoint Reference
### Login
**POST /api/login**

Required body fields:
* email
* password

### User Creation
**POST /api/users**

Required body fields:
* email
* password
* firstName
* lastName

### Get User's Information
**GET /api/users/me**

### Add A Session
**POST /api/users/me/add-sessions**

Required body fields:
* game (string)
* players (array)
* winner (string)
* date (string)

### Delete a session
**DELETE /api/users/me/sessions**

Required body fields:
* sessionId