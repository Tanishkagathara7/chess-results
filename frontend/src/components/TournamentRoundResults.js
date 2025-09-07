import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Hardcode localhost for development
const BACKEND_URL = 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

console.log('🔧 Backend URL (hardcoded):', BACKEND_URL);
console.log('🔧 API URL (hardcoded):', API);

const TournamentRoundResults = () => {
  const { id: tournament_id, round } = useParams();
  const navigate = useNavigate();
  const [roundData, setRoundData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tournament_id && round) {
      fetchRoundResults();
    }
  }, [tournament_id, round]);

  const fetchRoundResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const roundResponse = await axios.get(`${API}/tournaments/${tournament_id}/rounds/${round}/results`);
      setRoundData(roundResponse.data);
    } catch (error) {
      console.error('Error fetching round results:', error);
      setError(error.response?.data?.error || 'Failed to load round results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading round {round} results for tournament {tournament_id}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Results</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={() => fetchRoundResults()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/tournaments/${tournament_id}`)}
          className="mb-4"
        >
          ← Back to Tournament
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Round {round} Results</CardTitle>
          </CardHeader>
          <CardContent>
            {roundData ? (
              <div>
                <h2 className="text-xl font-bold">{roundData.tournament_name}</h2>
                <p>Round {roundData.round} of {roundData.total_rounds}</p>
                <p>Status: {roundData.round_status}</p>
                
                <h3 className="text-lg font-bold mt-4 mb-2">Standings:</h3>
                <div className="space-y-2">
                  {roundData.standings.map((player, index) => (
                    <div key={player.player_id} className="flex justify-between p-2 border rounded">
                      <span>{player.rank}. {player.player_name}</span>
                      <span>{player.points} points</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>Loading round data...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentRoundResults;
