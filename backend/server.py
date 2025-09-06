from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class PlayerTitle(str, Enum):
    GM = "GM"
    IM = "IM"
    FM = "FM"
    CM = "CM"
    WGM = "WGM"
    WIM = "WIM"
    WFM = "WFM"
    WCM = "WCM"
    NONE = ""

# Data Models
class Federation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # e.g., "USA", "GER", "RUS"
    name: str  # e.g., "United States", "Germany", "Russia"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FederationCreate(BaseModel):
    code: str
    name: str

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    federation: str  # Federation code
    rating: int = 0
    title: PlayerTitle = PlayerTitle.NONE
    birth_year: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerCreate(BaseModel):
    name: str
    federation: str
    rating: int = 0
    title: PlayerTitle = PlayerTitle.NONE
    birth_year: Optional[int] = None

class Tournament(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    start_date: datetime
    end_date: datetime
    rounds: int
    time_control: str  # e.g., "90+30"
    arbiter: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    location: str
    start_date: datetime
    end_date: datetime
    rounds: int
    time_control: str
    arbiter: str

class TournamentResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tournament_id: str
    player_id: str
    points: float
    rank: int
    tiebreak1: float = 0.0  # Buchholz
    tiebreak2: float = 0.0  # Sonneborn-Berger
    tiebreak3: float = 0.0  # Direct encounter
    performance_rating: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentResultCreate(BaseModel):
    tournament_id: str
    player_id: str
    points: float
    rank: int
    tiebreak1: float = 0.0
    tiebreak2: float = 0.0
    tiebreak3: float = 0.0
    performance_rating: Optional[int] = None

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if key.endswith('_date') or key.endswith('_at'):
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except:
                        pass
    return item

# Routes

# Federation Routes
@api_router.post("/federations", response_model=Federation)
async def create_federation(federation: FederationCreate):
    federation_dict = prepare_for_mongo(federation.dict())
    federation_obj = Federation(**federation_dict)
    await db.federations.insert_one(prepare_for_mongo(federation_obj.dict()))
    return federation_obj

@api_router.get("/federations", response_model=List[Federation])
async def get_federations():
    federations = await db.federations.find().to_list(1000)
    return [Federation(**parse_from_mongo(fed)) for fed in federations]

@api_router.get("/federations/{code}", response_model=Federation)
async def get_federation(code: str):
    federation = await db.federations.find_one({"code": code})
    if not federation:
        raise HTTPException(status_code=404, detail="Federation not found")
    return Federation(**parse_from_mongo(federation))

# Player Routes
@api_router.post("/players", response_model=Player)
async def create_player(player: PlayerCreate):
    player_dict = prepare_for_mongo(player.dict())
    player_obj = Player(**player_dict)
    await db.players.insert_one(prepare_for_mongo(player_obj.dict()))
    return player_obj

@api_router.get("/players", response_model=List[Player])
async def get_players(search: Optional[str] = Query(None)):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    players = await db.players.find(query).to_list(1000)
    return [Player(**parse_from_mongo(player)) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**parse_from_mongo(player))

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player_update: PlayerCreate):
    existing_player = await db.players.find_one({"id": player_id})
    if not existing_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    update_dict = prepare_for_mongo(player_update.dict())
    await db.players.update_one({"id": player_id}, {"$set": update_dict})
    
    updated_player = await db.players.find_one({"id": player_id})
    return Player(**parse_from_mongo(updated_player))

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str):
    result = await db.players.delete_one({"id": player_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"message": "Player deleted successfully"}

# Tournament Routes
@api_router.post("/tournaments", response_model=Tournament)
async def create_tournament(tournament: TournamentCreate):
    tournament_dict = prepare_for_mongo(tournament.dict())
    tournament_obj = Tournament(**tournament_dict)
    await db.tournaments.insert_one(prepare_for_mongo(tournament_obj.dict()))
    return tournament_obj

@api_router.get("/tournaments", response_model=List[Tournament])
async def get_tournaments(search: Optional[str] = Query(None)):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    tournaments = await db.tournaments.find(query).sort("start_date", -1).to_list(1000)
    return [Tournament(**parse_from_mongo(tournament)) for tournament in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return Tournament(**parse_from_mongo(tournament))

@api_router.put("/tournaments/{tournament_id}", response_model=Tournament)
async def update_tournament(tournament_id: str, tournament_update: TournamentCreate):
    existing_tournament = await db.tournaments.find_one({"id": tournament_id})
    if not existing_tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_dict = prepare_for_mongo(tournament_update.dict())
    await db.tournaments.update_one({"id": tournament_id}, {"$set": update_dict})
    
    updated_tournament = await db.tournaments.find_one({"id": tournament_id})
    return Tournament(**parse_from_mongo(updated_tournament))

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str):
    result = await db.tournaments.delete_one({"id": tournament_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted successfully"}

# Tournament Results Routes
@api_router.post("/tournament-results", response_model=TournamentResult)
async def create_tournament_result(result: TournamentResultCreate):
    result_dict = prepare_for_mongo(result.dict())
    result_obj = TournamentResult(**result_dict)
    await db.tournament_results.insert_one(prepare_for_mongo(result_obj.dict()))
    return result_obj

@api_router.get("/tournaments/{tournament_id}/results")
async def get_tournament_results(tournament_id: str):
    # Get results with player and tournament info
    pipeline = [
        {"$match": {"tournament_id": tournament_id}},
        {"$lookup": {
            "from": "players",
            "localField": "player_id",
            "foreignField": "id",
            "as": "player"
        }},
        {"$unwind": "$player"},
        {"$sort": {"rank": 1}}
    ]
    
    results = await db.tournament_results.aggregate(pipeline).to_list(1000)
    return results

@api_router.get("/players/{player_id}/results")
async def get_player_results(player_id: str):
    # Get player's tournament history
    pipeline = [
        {"$match": {"player_id": player_id}},
        {"$lookup": {
            "from": "tournaments",
            "localField": "tournament_id",
            "foreignField": "id",
            "as": "tournament"
        }},
        {"$unwind": "$tournament"},
        {"$sort": {"tournament.start_date": -1}}
    ]
    
    results = await db.tournament_results.aggregate(pipeline).to_list(1000)
    # Parse results to handle any ObjectId issues
    parsed_results = []
    for result in results:
        parsed_result = parse_from_mongo(result)
        # Ensure tournament is also parsed
        if 'tournament' in parsed_result:
            parsed_result['tournament'] = parse_from_mongo(parsed_result['tournament'])
        parsed_results.append(parsed_result)
    
    return parsed_results

# Search Route
@api_router.get("/search")
async def search(q: str = Query(...)):
    # Search players
    players = await db.players.find(
        {"name": {"$regex": q, "$options": "i"}}
    ).limit(10).to_list(10)
    
    # Search tournaments
    tournaments = await db.tournaments.find(
        {"name": {"$regex": q, "$options": "i"}}
    ).limit(10).to_list(10)
    
    # Search federations
    federations = await db.federations.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}}
        ]}
    ).limit(10).to_list(10)
    
    return {
        "players": [Player(**parse_from_mongo(p)) for p in players],
        "tournaments": [Tournament(**parse_from_mongo(t)) for t in tournaments],
        "federations": [Federation(**parse_from_mongo(f)) for f in federations]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()