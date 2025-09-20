// Swiss-style pairing generator with constraints:
// - Color alternation preference (alternate from last color when possible)
// - Bye handling (assign 1 point bye if odd number of players; avoid repeated byes when possible)
// - No immediate rematches (avoid pairing players who met in the previous round if possible)
// - Point-based pairing (pair players with same/closest points)
//
// Inputs:
// - players: Array<{ id, name?, rating? }>
// - points: Map<string, number> or plain object keyed by player id
// - history: {
//     [playerId]: {
//       lastColor: 'W' | 'B' | null,
//       whiteCount: number,
//       blackCount: number,
//       byesCount: number,
//       lastOpponent: string | null
//     }
//   }
// - round: number (1-indexed)
// - options?: { randomize?: boolean }
//
// Returns:
// - { pairings: Array<{ white_player_id, black_player_id | null }>, bye_player_id?: string | null }

function asMap(points) {
  if (!points) return new Map();
  if (points instanceof Map) return points;
  const m = new Map();
  for (const k of Object.keys(points)) {
    m.set(k, points[k]);
  }
  return m;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function preferredColor(lastColor) {
  if (lastColor === 'W') return 'B';
  if (lastColor === 'B') return 'W';
  return null; // No preference if no last color
}

function colorBalance(hist) {
  return (hist?.whiteCount || 0) - (hist?.blackCount || 0); // positive => had more whites
}

function chooseByePlayer(sortedPlayers, histById, pointsMap) {
  // Avoid repeated byes: pick among players with minimal byesCount
  let minByes = Infinity;
  for (const p of sortedPlayers) {
    const h = histById[p.id] || {};
    minByes = Math.min(minByes, h.byesCount || 0);
  }
  const eligible = sortedPlayers.filter(p => (histById[p.id]?.byesCount || 0) === minByes);
  // Random among eligible to keep it fair
  const pickPool = shuffle([...eligible]);
  return pickPool[0]?.id || null;
}

function assignColors(pA, pB, histById) {
  // Determine color preferences based on last color
  const hA = histById[pA.id] || {};
  const hB = histById[pB.id] || {};
  const prefA = preferredColor(hA.lastColor || null);
  const prefB = preferredColor(hB.lastColor || null);

  // If one has preference and the other doesn't, honor the preference
  if (prefA && !prefB) {
    return prefA === 'W'
      ? { white: pA.id, black: pB.id }
      : { white: pB.id, black: pA.id };
  }
  if (!prefA && prefB) {
    return prefB === 'W'
      ? { white: pB.id, black: pA.id }
      : { white: pA.id, black: pB.id };
  }

  // If both have preferences and they align oppositely, honor both
  if (prefA && prefB && prefA !== prefB) {
    return prefA === 'W'
      ? { white: pA.id, black: pB.id }
      : { white: pB.id, black: pA.id };
  }

  // If both want the same color or neither has a preference, balance by color history
  const balanceA = colorBalance(hA);
  const balanceB = colorBalance(hB);

  // Try to assign colors to reduce absolute imbalance
  // Option 1: A is white, B is black
  const opt1 = Math.abs((balanceA + 1) - balanceB) + Math.abs(balanceA - (balanceB + 1));
  // Option 2: A is black, B is white
  const opt2 = Math.abs((balanceA - 1) - balanceB) + Math.abs(balanceA - (balanceB - 1));

  if (opt1 < opt2) {
    return { white: pA.id, black: pB.id };
  } else if (opt2 < opt1) {
    return { white: pB.id, black: pA.id };
  }

  // As a final tie-breaker, keep higher rated (or earlier in list) as white
  return { white: pA.id, black: pB.id };
}

function canPair(a, b, histById) {
  // Enforce: no immediate rematches (avoid if they played last round)
  const hA = histById[a.id] || {};
  const hB = histById[b.id] || {};
  if (hA.lastOpponent && hB.lastOpponent && hA.lastOpponent === b.id && hB.lastOpponent === a.id) {
    return false;
  }
  return true;
}

function generatePairings({ players, points, history, round, options = {} }) {
  const pointsMap = asMap(points);
  const histById = history || {};
  const randomize = options.randomize !== false; // default true

  // Seed default points and history
  for (const p of players) {
    if (!pointsMap.has(p.id)) pointsMap.set(p.id, 0);
    if (!histById[p.id]) histById[p.id] = { lastColor: null, whiteCount: 0, blackCount: 0, byesCount: 0, lastOpponent: null };
  }

  // Sort by points desc, then rating desc (if available), then name asc for stability
  const sorted = [...players].sort((a, b) => {
    const pa = pointsMap.get(a.id) || 0;
    const pb = pointsMap.get(b.id) || 0;
    if (pb !== pa) return pb - pa;
    const ra = a.rating || 0;
    const rb = b.rating || 0;
    if (rb !== ra) return rb - ra;
    return (a.name || '').localeCompare(b.name || '');
  });

  const working = randomize && round === 1 ? shuffle(sorted) : sorted;
  const used = new Set();
  let byePlayerId = null;

  if (working.length % 2 === 1) {
    byePlayerId = chooseByePlayer(working, histById, pointsMap);
    // Mark bye as used and move the player to be "white" with null black later
    if (byePlayerId) used.add(byePlayerId);
  }

  const pairings = [];

  for (let i = 0; i < working.length; i++) {
    const pA = working[i];
    if (!pA || used.has(pA.id)) continue;

    // Find best partner for pA
    let partnerIndex = -1;
    for (let j = i + 1; j < working.length; j++) {
      const pB = working[j];
      if (!pB || used.has(pB.id)) continue;
      // First try strict rule: no immediate rematch
      if (canPair(pA, pB, histById)) {
        partnerIndex = j;
        break;
      }
    }

    // If couldn't find a non-immediate-rematch partner, relax the constraint
    if (partnerIndex === -1) {
      for (let j = i + 1; j < working.length; j++) {
        const pB = working[j];
        if (!pB || used.has(pB.id)) continue;
        partnerIndex = j;
        break;
      }
    }

    if (partnerIndex === -1) {
      // Shouldn't happen except when only one player left and it's the bye (already handled)
      continue;
    }

    const pB = working[partnerIndex];
    const colors = assignColors(pA, pB, histById);

    pairings.push({ white_player_id: colors.white, black_player_id: colors.black });
    used.add(pA.id);
    used.add(pB.id);
  }

  if (byePlayerId) {
    // Place bye at the end for consistency
    pairings.push({ white_player_id: byePlayerId, black_player_id: null });
  }

  return { pairings, bye_player_id: byePlayerId };
}

module.exports = {
  generatePairings,
};