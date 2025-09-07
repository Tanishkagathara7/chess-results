#!/usr/bin/env python3
"""
Sample data script for Chess Tournament Results website
This script populates the database with sample federations, players, tournaments, and results
"""
import asyncio
import requests
import json
from datetime import datetime, timedelta

API_BASE = "http://localhost:3000/api"

# Sample federations
federations = [
    {"code": "USA", "name": "United States of America"},
    {"code": "GER", "name": "Germany"},
    {"code": "RUS", "name": "Russia"},
    {"code": "IND", "name": "India"},
    {"code": "NOR", "name": "Norway"},
    {"code": "CHN", "name": "China"},
    {"code": "FRA", "name": "France"},
    {"code": "ESP", "name": "Spain"},
    {"code": "ITA", "name": "Italy"},
    {"code": "POL", "name": "Poland"}
]

# Sample players
players = [
    {"name": "Magnus Carlsen", "federation": "NOR", "rating": 2830, "title": "GM", "birth_year": 1990},
    {"name": "Fabiano Caruana", "federation": "USA", "rating": 2805, "title": "GM", "birth_year": 1992},
    {"name": "Ding Liren", "federation": "CHN", "rating": 2788, "title": "GM", "birth_year": 1992},
    {"name": "Ian Nepomniachtchi", "federation": "RUS", "rating": 2771, "title": "GM", "birth_year": 1990},
    {"name": "Vishwanathan Anand", "federation": "IND", "rating": 2754, "title": "GM", "birth_year": 1969},
    {"name": "Alexander Grischuk", "federation": "RUS", "rating": 2745, "title": "GM", "birth_year": 1983},
    {"name": "Maxime Vachier-Lagrave", "federation": "FRA", "rating": 2742, "title": "GM", "birth_year": 1990},
    {"name": "Anish Giri", "federation": "GER", "rating": 2739, "title": "GM", "birth_year": 1994},
    {"name": "Wesley So", "federation": "USA", "rating": 2735, "title": "GM", "birth_year": 1993},
    {"name": "Levon Aronian", "federation": "USA", "rating": 2732, "title": "GM", "birth_year": 1982},
    {"name": "Anna Schmidt", "federation": "GER", "rating": 2245, "title": "WIM", "birth_year": 1995},
    {"name": "Maria Garcia", "federation": "ESP", "rating": 2178, "title": "WFM", "birth_year": 1998},
    {"name": "John Davis", "federation": "USA", "rating": 1987, "title": "", "birth_year": 1985},
    {"name": "Pietro Rossi", "federation": "ITA", "rating": 2134, "title": "FM", "birth_year": 1991},
    {"name": "Kowalski Jan", "federation": "POL", "rating": 2067, "title": "CM", "birth_year": 1989}
]

# Sample tournaments
tournaments = [
    {
        "name": "World Chess Championship 2024",
        "location": "Singapore",
        "start_date": "2024-01-15T09:00:00Z",
        "end_date": "2024-01-28T18:00:00Z",
        "rounds": 14,
        "time_control": "120+30",
        "arbiter": "IA David Martinez"
    },
    {
        "name": "Tata Steel Masters 2024",
        "location": "Wijk aan Zee, Netherlands",
        "start_date": "2024-01-13T14:00:00Z",
        "end_date": "2024-01-28T16:00:00Z",
        "rounds": 13,
        "time_control": "100+30",
        "arbiter": "IA John Smith"
    },
    {
        "name": "Gibraltar Chess Festival 2024",
        "location": "Gibraltar",
        "start_date": "2024-01-23T15:00:00Z",
        "end_date": "2024-01-31T17:00:00Z",
        "rounds": 10,
        "time_control": "90+30",
        "arbiter": "IA Sarah Wilson"
    },
    {
        "name": "European Individual Championship 2024",
        "location": "Petrovac, Montenegro",
        "start_date": "2024-03-18T15:00:00Z",
        "end_date": "2024-03-30T18:00:00Z",
        "rounds": 11,
        "time_control": "90+30",
        "arbiter": "IA Aleksandar Wohl"
    },
    {
        "name": "US Chess Championship 2024",
        "location": "Saint Louis, USA",
        "start_date": "2024-10-09T19:00:00Z",
        "end_date": "2024-10-22T17:00:00Z",
        "rounds": 11,
        "time_control": "90+30",
        "arbiter": "IA Tony Rich"
    }
]

def create_sample_data():
    print("Creating sample federations...")
    for federation in federations:
        try:
            response = requests.post(f"{API_BASE}/federations", json=federation)
            if response.status_code == 200:
                print(f"✓ Created federation: {federation['name']}")
            else:
                print(f"✗ Failed to create federation {federation['name']}: {response.text}")
        except Exception as e:
            print(f"✗ Error creating federation {federation['name']}: {e}")
    
    print("\nCreating sample players...")
    for player in players:
        try:
            response = requests.post(f"{API_BASE}/players", json=player)
            if response.status_code == 200:
                print(f"✓ Created player: {player['name']}")
            else:
                print(f"✗ Failed to create player {player['name']}: {response.text}")
        except Exception as e:
            print(f"✗ Error creating player {player['name']}: {e}")
    
    print("\nCreating sample tournaments...")
    for tournament in tournaments:
        try:
            response = requests.post(f"{API_BASE}/tournaments", json=tournament)
            if response.status_code == 200:
                print(f"✓ Created tournament: {tournament['name']}")
            else:
                print(f"✗ Failed to create tournament {tournament['name']}: {response.text}")
        except Exception as e:
            print(f"✗ Error creating tournament {tournament['name']}: {e}")
    
    print("\n✅ Sample data creation completed!")
    print("You can now test the website functionality with realistic chess data.")

if __name__ == "__main__":
    create_sample_data()