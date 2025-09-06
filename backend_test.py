import requests
import sys
import json
from datetime import datetime, timezone

class ChessAPITester:
    def __init__(self, base_url="https://chess-tracker-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {
            'federations': [],
            'players': [],
            'tournaments': [],
            'results': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_federations(self):
        """Test federation endpoints"""
        print("\n" + "="*50)
        print("TESTING FEDERATIONS")
        print("="*50)
        
        # Test GET federations
        success, federations = self.run_test(
            "Get All Federations",
            "GET",
            "federations",
            200
        )
        
        if success:
            print(f"   Found {len(federations)} federations")
            if federations:
                print(f"   Sample: {federations[0]['code']} - {federations[0]['name']}")
        
        # Test POST federation
        test_federation = {
            "code": "TEST",
            "name": "Test Federation"
        }
        
        success, created_fed = self.run_test(
            "Create Federation",
            "POST",
            "federations",
            200,
            data=test_federation
        )
        
        if success and 'id' in created_fed:
            self.created_ids['federations'].append(created_fed['id'])
            
            # Test GET specific federation
            self.run_test(
                "Get Specific Federation",
                "GET",
                f"federations/{created_fed['code']}",
                200
            )

    def test_players(self):
        """Test player endpoints"""
        print("\n" + "="*50)
        print("TESTING PLAYERS")
        print("="*50)
        
        # Test GET players
        success, players = self.run_test(
            "Get All Players",
            "GET",
            "players",
            200
        )
        
        if success:
            print(f"   Found {len(players)} players")
            if players:
                print(f"   Sample: {players[0]['name']} ({players[0]['federation']}) - {players[0]['rating']}")
        
        # Test POST player
        test_player = {
            "name": "Test Player",
            "federation": "USA",
            "rating": 2000,
            "title": "FM",
            "birth_year": 1990
        }
        
        success, created_player = self.run_test(
            "Create Player",
            "POST",
            "players",
            200,
            data=test_player
        )
        
        if success and 'id' in created_player:
            player_id = created_player['id']
            self.created_ids['players'].append(player_id)
            
            # Test GET specific player
            self.run_test(
                "Get Specific Player",
                "GET",
                f"players/{player_id}",
                200
            )
            
            # Test PUT player
            updated_player = test_player.copy()
            updated_player['rating'] = 2100
            
            self.run_test(
                "Update Player",
                "PUT",
                f"players/{player_id}",
                200,
                data=updated_player
            )
            
            # Test player search
            self.run_test(
                "Search Players",
                "GET",
                "players",
                200,
                params={"search": "Test"}
            )

    def test_tournaments(self):
        """Test tournament endpoints"""
        print("\n" + "="*50)
        print("TESTING TOURNAMENTS")
        print("="*50)
        
        # Test GET tournaments
        success, tournaments = self.run_test(
            "Get All Tournaments",
            "GET",
            "tournaments",
            200
        )
        
        if success:
            print(f"   Found {len(tournaments)} tournaments")
            if tournaments:
                print(f"   Sample: {tournaments[0]['name']} - {tournaments[0]['location']}")
        
        # Test POST tournament
        test_tournament = {
            "name": "Test Tournament 2024",
            "location": "Test City",
            "start_date": "2024-12-01T10:00:00Z",
            "end_date": "2024-12-03T18:00:00Z",
            "rounds": 9,
            "time_control": "90+30",
            "arbiter": "Test Arbiter"
        }
        
        success, created_tournament = self.run_test(
            "Create Tournament",
            "POST",
            "tournaments",
            200,
            data=test_tournament
        )
        
        if success and 'id' in created_tournament:
            tournament_id = created_tournament['id']
            self.created_ids['tournaments'].append(tournament_id)
            
            # Test GET specific tournament
            self.run_test(
                "Get Specific Tournament",
                "GET",
                f"tournaments/{tournament_id}",
                200
            )
            
            # Test PUT tournament
            updated_tournament = test_tournament.copy()
            updated_tournament['rounds'] = 11
            
            self.run_test(
                "Update Tournament",
                "PUT",
                f"tournaments/{tournament_id}",
                200,
                data=updated_tournament
            )
            
            # Test tournament search
            self.run_test(
                "Search Tournaments",
                "GET",
                "tournaments",
                200,
                params={"search": "Test"}
            )
            
            # Test tournament results endpoint
            self.run_test(
                "Get Tournament Results",
                "GET",
                f"tournaments/{tournament_id}/results",
                200
            )

    def test_tournament_results(self):
        """Test tournament results endpoints"""
        print("\n" + "="*50)
        print("TESTING TOURNAMENT RESULTS")
        print("="*50)
        
        if self.created_ids['tournaments'] and self.created_ids['players']:
            tournament_id = self.created_ids['tournaments'][0]
            player_id = self.created_ids['players'][0]
            
            # Test POST tournament result
            test_result = {
                "tournament_id": tournament_id,
                "player_id": player_id,
                "points": 7.5,
                "rank": 1,
                "tiebreak1": 45.5,
                "tiebreak2": 52.25,
                "tiebreak3": 0.0,
                "performance_rating": 2200
            }
            
            success, created_result = self.run_test(
                "Create Tournament Result",
                "POST",
                "tournament-results",
                200,
                data=test_result
            )
            
            if success and 'id' in created_result:
                self.created_ids['results'].append(created_result['id'])
                
                # Test GET player results
                self.run_test(
                    "Get Player Results",
                    "GET",
                    f"players/{player_id}/results",
                    200
                )

    def test_search(self):
        """Test search endpoint"""
        print("\n" + "="*50)
        print("TESTING SEARCH")
        print("="*50)
        
        # Test search with various queries
        search_queries = ["Magnus", "Carlsen", "World", "Championship", "USA", "Test"]
        
        for query in search_queries:
            success, results = self.run_test(
                f"Search for '{query}'",
                "GET",
                "search",
                200,
                params={"q": query}
            )
            
            if success:
                players_count = len(results.get('players', []))
                tournaments_count = len(results.get('tournaments', []))
                federations_count = len(results.get('federations', []))
                print(f"   Results: {players_count} players, {tournaments_count} tournaments, {federations_count} federations")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete test players
        for player_id in self.created_ids['players']:
            self.run_test(
                f"Delete Test Player {player_id}",
                "DELETE",
                f"players/{player_id}",
                200
            )
        
        # Delete test tournaments
        for tournament_id in self.created_ids['tournaments']:
            self.run_test(
                f"Delete Test Tournament {tournament_id}",
                "DELETE",
                f"tournaments/{tournament_id}",
                200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Chess API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        
        try:
            # Test basic connectivity
            response = requests.get(self.base_url, timeout=10)
            print(f"✅ Base URL accessible - Status: {response.status_code}")
        except Exception as e:
            print(f"❌ Base URL not accessible: {e}")
            return 1
        
        # Run all test suites
        self.test_federations()
        self.test_players()
        self.test_tournaments()
        self.test_tournament_results()
        self.test_search()
        
        # Clean up
        self.cleanup_test_data()
        
        # Print final results
        print("\n" + "="*50)
        print("FINAL RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = ChessAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())