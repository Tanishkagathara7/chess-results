# Chess Results Backend (Node.js)

A RESTful API backend for managing chess tournament results, built with Express.js and MongoDB.

## Features

- **Federations Management**: Create and manage chess federations
- **Players Management**: CRUD operations for chess players with ratings and titles
- **Tournaments Management**: Create and manage chess tournaments
- **Results Management**: Store and retrieve tournament results with tiebreakers
- **Search Functionality**: Search players by name
- **Data Validation**: Comprehensive input validation using Joi
- **Error Handling**: Robust error handling and logging

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (running locally or remote connection)
- **npm** (comes with Node.js)

## Installation & Setup

1. **Navigate to the backend directory:**
   ```bash
   cd D:\chess-results\backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - The `.env` file is already configured with default values
   - Make sure MongoDB is running on `localhost:27017` (default)
   - Or update `MONGO_URL` in `.env` if using a different MongoDB instance

4. **Start MongoDB (if not already running):**
   - On Windows with MongoDB installed: Start MongoDB service
   - Or use Docker: `docker run -d -p 27017:27017 mongo`

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on **http://localhost:3001**

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Federations
- `POST /api/federations` - Create federation
- `GET /api/federations` - Get all federations
- `GET /api/federations/:code` - Get federation by code

### Players
- `POST /api/players` - Create player
- `GET /api/players` - Get all players (supports ?search=name)
- `GET /api/players/:id` - Get player by ID
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament by ID
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Results
- `POST /api/results` - Create result
- `GET /api/results` - Get results (supports ?tournament_id= and ?player_id=)
- `GET /api/results/:id` - Get result by ID
- `PUT /api/results/:id` - Update result
- `DELETE /api/results/:id` - Delete result

## Testing

Use the existing Python test scripts:

1. **Backend API Testing:**
   ```bash
   python ../backend_test.py
   ```

2. **Sample Data Population:**
   ```bash
   python ../sample_data.py
   ```

## Project Structure

```
backend/
├── server.js              # Main Express server
├── package.json           # Node.js dependencies and scripts
├── .env                   # Environment configuration
├── README.md              # This file
├── server_python_backup.py # Original Python server (backup)
└── requirements.txt       # Old Python requirements (can be deleted)
```

## Environment Variables

- `MONGO_URL`: MongoDB connection string (default: mongodb://localhost:27017)
- `DB_NAME`: Database name (default: chess_results)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `CORS_ORIGINS`: CORS allowed origins (default: *)

## Troubleshooting

1. **MongoDB Connection Issues:**
   - Ensure MongoDB is running
   - Check MongoDB connection string in `.env`
   - Verify MongoDB port (default 27017)

2. **Port Already in Use:**
   - Change `PORT` in `.env` file
   - Or stop the process using port 3001

3. **Module Not Found:**
   - Run `npm install` to install dependencies
   - Ensure you're in the backend directory

## Migration from Python

The JavaScript backend maintains 100% API compatibility with the original Python FastAPI backend:
- Same endpoints and request/response formats
- Same validation rules
- Same MongoDB collections and document structure
- Existing test scripts continue to work without changes
