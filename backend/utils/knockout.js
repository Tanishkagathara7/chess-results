/**
 * Knockout Tournament Logic Implementation
 * 
 * Standard knockout (single elimination) tournament:
 * - Start with N players
 * - Each round: pair up players → winners advance to next round
 * - If odd number of players, one player gets a bye (auto-advance)
 * - Continue until 1 winner remains
 * 
 * Example: 8 players
 * Round 1: 8 players → 4 matches → 4 winners
 * Round 2: 4 players → 2 matches → 2 winners  
 * Round 3: 2 players → 1 match → 1 winner (Champion)
 */

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

let __matchCounter = 0;
function nextMatchId() {
  __matchCounter += 1;
  return `M${__matchCounter}`;
}

/**
 * Calculate the optimal number of rounds for a knockout tournament
 * @param {number} playerCount - Number of starting players
 * @returns {number} - Number of rounds needed
 */
function calculateKnockoutRounds(playerCount) {
  if (playerCount < 2) return 0;
  return Math.ceil(Math.log2(playerCount));
}

/**
 * Validate if a knockout tournament configuration is valid
 * @param {number} playerCount - Number of players
 * @param {number} requestedRounds - Requested number of rounds
 * @returns {{valid: boolean, optimalRounds?: number, error?: string}}
 */
function validateKnockoutTournament(playerCount, requestedRounds) {
  if (playerCount < 2) {
    return { valid: false, error: 'Need at least 2 players for a tournament' };
  }
  
  const optimalRounds = calculateKnockoutRounds(playerCount);
  
  if (requestedRounds < optimalRounds) {
    return { 
      valid: false, 
      error: `${playerCount} players require ${optimalRounds} rounds minimum, but ${requestedRounds} requested`,
      optimalRounds 
    };
  }
  
  if (requestedRounds > optimalRounds) {
    return { 
      valid: false, 
      error: `${playerCount} players need only ${optimalRounds} rounds maximum, but ${requestedRounds} requested`,
      optimalRounds 
    };
  }
  
  return { valid: true, optimalRounds };
}

/**
 * Create knockout pairings for a round.
 * @param {Array<{id:string,name?:string,rating?:number}>} players - players qualified for this round
 * @param {number} roundNumber - 1-indexed round
 * @param {{shuffle?: boolean, preserveSeeding?: boolean}} options - configuration options
 * @returns {{ round:number, matches: Array<{ id:string, round:number, player1:any, player2:any|null, isBye:boolean, winner:any|null }> }}
 */
function createRoundPairings(players, roundNumber, options = { shuffle: true, preserveSeeding: false }) {
  const pool = Array.isArray(players) ? players.slice() : [];
  
  // For first round, optionally shuffle or preserve seeding
  if (roundNumber === 1) {
    if (options.preserveSeeding) {
      // Keep high-rated players separated by sorting by rating descending
      // then pairing 1vs8, 2vs7, 3vs6, 4vs5 pattern
      pool.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (options.shuffle !== false) {
      shuffleInPlace(pool);
    }
  }
  // For subsequent rounds, keep the order as winners come in

  const matches = [];

  // Handle bye if odd number of players
  if (pool.length % 2 === 1) {
    // Give bye to lowest-rated player (last in sorted order) or random if shuffled
    const byePlayer = pool.pop(); // Take last player
    matches.push({
      id: nextMatchId(),
      round: roundNumber,
      player1: byePlayer,
      player2: null,
      isBye: true,
      winner: byePlayer, // Bye player auto-advances
    });
  }

  // Create matches from remaining even number of players
  for (let i = 0; i < pool.length; i += 2) {
    const p1 = pool[i];
    const p2 = pool[i + 1];
    matches.push({
      id: nextMatchId(),
      round: roundNumber,
      player1: p1,
      player2: p2,
      isBye: false,
      winner: null, // To be determined by game result
    });
  }

  return { round: roundNumber, matches };
}

module.exports = {
  createRoundPairings,
  calculateKnockoutRounds,
  validateKnockoutTournament,
};
