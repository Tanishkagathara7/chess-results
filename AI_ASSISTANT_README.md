# 🤖 AI Tournament Assistant

## Quick Start

The AI Tournament Assistant allows you to manage your chess tournaments using natural language commands. No need to click through multiple screens - just tell the assistant what you want to do!

## Installation

The AI Assistant is already integrated into your admin panel. No additional setup required!

### Backend
- **File:** `backend/utils/aiAssistant.js`
- **Endpoint:** `POST /api/ai-assistant`
- **Authentication:** Required (admin token)

### Frontend
- **Component:** `frontend/src/components/AdminPanel.js`
- **Tab:** "AI Assistant" in admin panel
- **Quick Reference:** `frontend/src/components/AIAssistantQuickRef.jsx`

## Usage

### Access the Assistant

1. Log in to the admin panel
2. Click on the "AI Assistant" tab (🤖 icon)
3. Type your command and press Enter

### Basic Commands

#### 1. Create a Tournament

```
create tournament Spring Championship at New York from 2024-03-15 to 2024-03-17 with 5 rounds
```

**What it does:**
- Creates a new tournament with the specified details
- Sets tournament type to Swiss by default
- Generates a unique tournament ID

**Variations:**
- `make tournament [name] at [location]...`
- `new tournament [name] at [location]...`
- Add "knockout" for knockout tournaments
- Add "round robin" for round-robin tournaments

#### 2. Add a Player

```
add player Magnus Carlsen with rating 2850
```

**What it does:**
- Creates a new player profile
- Sets the rating
- Generates a unique player ID

**Optional parameters:**
```
add player John Doe with rating 1800 email john@chess.com phone +1234567890
```

#### 3. Register Player to Tournament

```
add Magnus Carlsen to Spring Championship
```

**What it does:**
- Registers the player for the tournament
- Creates a participant record
- Checks for duplicate registrations

#### 4. Start a Tournament

```
start tournament Spring Championship
```

**What it does:**
- Checks if tournament has enough participants (minimum 2)
- Verifies tournament is ready to begin
- Provides next steps for generating pairings

#### 5. Get Player Information

```
get player Magnus Carlsen
```

**What it does:**
- Retrieves player details
- Shows rating, title, contact info
- Displays player ID

#### 6. List Tournaments

```
list all tournaments
```

**What it does:**
- Shows the 10 most recent tournaments
- Displays name, location, and start date
- Sorted by start date (newest first)

#### 7. List Players

```
list all players
```

**What it does:**
- Shows top 20 players by rating
- Displays name and rating
- Sorted by rating (highest first)

#### 8. Navigate Admin Panel

```
go to tournaments
```

**Available tabs:**
- `go to tournaments` - Tournament management
- `open players` - Player management
- `show requests` - Registration requests
- `open pairings` - Round pairings
- `show results` - Tournament results

#### 9. Refresh Data

```
refresh data
```

**What it does:**
- Fetches latest data from server
- Updates tournaments, players, and requests
- Refreshes the UI

## Advanced Examples

### Complete Tournament Setup

```bash
# Step 1: Create the tournament
create tournament City Championship at New York from 2024-05-01 to 2024-05-03 with 5 rounds

# Step 2: Add players
add player Alice Johnson with rating 1850
add player Bob Smith with rating 1820
add player Carol White with rating 1790

# Step 3: Register players
add Alice Johnson to City Championship
add Bob Smith to City Championship
add Carol White to City Championship

# Step 4: Verify setup
list all players
start tournament City Championship

# Step 5: Navigate to pairings
go to pairings
```

### Quick Player Registration

```bash
# Check existing players
list all players

# Add to tournament
add [player name] to [tournament name]

# Verify
go to tournaments
```

### Tournament Information

```bash
# List all tournaments
list all tournaments

# Get specific player
get player John Doe

# Check tournament readiness
start tournament Spring Open
```

## Command Reference

### Tournament Commands

| Command | Example | Description |
|---------|---------|-------------|
| `create tournament` | `create tournament Spring Open at Boston...` | Create new tournament |
| `list tournaments` | `list all tournaments` | Show recent tournaments |
| `start tournament` | `start tournament Spring Open` | Check tournament readiness |

### Player Commands

| Command | Example | Description |
|---------|---------|-------------|
| `add player` | `add player John Doe with rating 1800` | Create new player |
| `get player` | `get player John Doe` | Show player details |
| `list players` | `list all players` | Show top players |

### Registration Commands

| Command | Example | Description |
|---------|---------|-------------|
| `add [player] to [tournament]` | `add John Doe to Spring Open` | Register player |
| `register [player] for [tournament]` | `register Alice for Summer Cup` | Register player |

### Navigation Commands

| Command | Example | Description |
|---------|---------|-------------|
| `go to [tab]` | `go to tournaments` | Switch tabs |
| `open [tab]` | `open players` | Switch tabs |
| `show [tab]` | `show requests` | Switch tabs |
| `refresh data` | `refresh data` | Update all data |

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "✅ Tournament 'Spring Open' created successfully!",
  "data": {
    "id": "uuid-here",
    "name": "Spring Open",
    ...
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "❌ Player 'John Doe' not found"
}
```

## Features

✅ **Natural Language Processing** - Understands various command phrasings  
✅ **Pattern Matching** - Extracts parameters from commands  
✅ **Database Integration** - Direct MongoDB operations  
✅ **Error Handling** - Helpful error messages  
✅ **Auto-refresh** - Updates UI after operations  
✅ **Authentication** - Secure admin-only access  
✅ **Validation** - Checks for duplicates and requirements  

## Testing

### Manual Testing

1. Open admin panel
2. Go to AI Assistant tab
3. Try the example commands
4. Verify results in respective tabs

### Automated Testing

Run the test script:

```bash
node backend/test-ai-assistant.js
```

This will:
- Create test tournament
- Add test players
- Register players
- Test all commands
- Verify responses

## Troubleshooting

### "Command not recognized"

**Problem:** Assistant doesn't understand the command

**Solutions:**
- Check command format against examples
- Ensure all required parameters are included
- Try alternative phrasings (e.g., "make" instead of "create")

### "Player/Tournament not found"

**Problem:** Referenced entity doesn't exist

**Solutions:**
- Use `list players` or `list tournaments` to see available options
- Check spelling (case-insensitive but must match)
- Create the entity first if it doesn't exist

### "Authentication error"

**Problem:** Not logged in or token expired

**Solutions:**
- Log in to admin panel
- Refresh the page if token expired
- Check if backend is running

### "Already registered"

**Problem:** Player already in tournament

**Solutions:**
- This is expected behavior (prevents duplicates)
- Check tournament participants list
- Use different player or tournament

## API Documentation

### Endpoint

```
POST /api/ai-assistant
```

### Headers

```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

### Request Body

```json
{
  "command": "create tournament Spring Open at Boston from 2024-04-01 to 2024-04-03 with 5 rounds"
}
```

### Response

```json
{
  "success": true,
  "message": "✅ Tournament 'Spring Open' created successfully!",
  "data": {
    "id": "abc-123",
    "name": "Spring Open",
    "location": "Boston",
    "start_date": "2024-04-01T00:00:00.000Z",
    "end_date": "2024-04-03T00:00:00.000Z",
    "rounds": 5,
    "time_control": "90+30",
    "arbiter": "TBD",
    "tournament_type": "swiss",
    "created_at": "2024-03-10T12:00:00.000Z"
  }
}
```

## Architecture

### Backend Flow

```
User Command
    ↓
Frontend (AdminPanel.js)
    ↓
POST /api/ai-assistant
    ↓
TournamentAIAssistant.processCommand()
    ↓
Command Detection & Parsing
    ↓
Database Operation (MongoDB)
    ↓
Response with Result
    ↓
Frontend Updates UI
```

### Command Processing

1. **Detection** - Identify command type (create, add, list, etc.)
2. **Parsing** - Extract parameters (names, dates, ratings, etc.)
3. **Validation** - Check required fields and formats
4. **Execution** - Perform database operation
5. **Response** - Return success/error message with data

### Database Collections

- **tournaments** - Tournament records
- **players** - Player profiles
- **tournament_participants** - Registration records

## Security

- ✅ **Authentication Required** - Admin token must be valid
- ✅ **Input Validation** - All parameters are validated
- ✅ **SQL Injection Protection** - MongoDB with proper escaping
- ✅ **Rate Limiting** - Prevents abuse (if configured)
- ✅ **Error Handling** - No sensitive data in error messages

## Performance

- ⚡ **Fast Response** - Typical response time < 100ms
- 📦 **Efficient Queries** - Optimized MongoDB operations
- 🔄 **Auto-refresh** - Updates UI only after successful operations
- 💾 **No Caching** - Always fetches fresh data

## Future Enhancements

### Planned Features

- 🎯 **Generate Pairings** - `generate round 1 for Spring Open`
- 📊 **Submit Results** - `set result white wins for pairing 123`
- 🏆 **View Standings** - `show standings for Spring Open`
- 📧 **Send Notifications** - `notify all players in Spring Open`
- 🔄 **Bulk Operations** - `add players [list] to tournament`
- 📅 **Schedule Management** - `schedule round 2 for tomorrow at 10am`
- 🤖 **AI Improvements** - Better natural language understanding
- 💬 **Context Awareness** - Remember previous commands in conversation

### Possible Integrations

- 📱 **Mobile App** - Voice commands
- 🔔 **Slack/Discord** - Bot integration
- 📊 **Analytics** - Command usage statistics
- 🌐 **Multi-language** - Support for other languages

## Contributing

To add new commands:

1. Add detection method in `aiAssistant.js`:
   ```javascript
   isNewCommand(lower) {
       return lower.includes('new command');
   }
   ```

2. Add handler method:
   ```javascript
   async handleNewCommand(command, context) {
       // Implementation
       return { success: true, message: '...' };
   }
   ```

3. Add to `processCommand()`:
   ```javascript
   if (this.isNewCommand(lower)) {
       return await this.handleNewCommand(command, context);
   }
   ```

4. Update documentation and tests

## Support

For issues or questions:
- 📖 Check [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)
- 🐛 Review backend logs: `backend/logs/`
- 🧪 Run test script: `node backend/test-ai-assistant.js`
- 💬 Contact support team

## License

Same as main project license.

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Compatibility:** Chess Results v1.0+
