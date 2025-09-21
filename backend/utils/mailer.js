const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('Email not configured: missing SMTP_HOST/SMTP_USER/SMTP_PASS. Skipping email send.');
    return null;
  }

  const t = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return t;
}

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

async function sendMail({ to, subject, text, html, from }) {
  const t = getTransporter();
  if (!t) {
    // Email not configured; pretend success to avoid leaking info to client
    logger.warn(`Skipped sending email to ${to} (transporter not configured). Subject: ${subject}`);
    return { skipped: true };
  }

  const mailFrom = from || process.env.SMTP_FROM || `no-reply@${new URL(process.env.BACKEND_URL || 'http://localhost:3001').hostname}`;

  try {
    const info = await t.sendMail({ from: mailFrom, to, subject, text, html });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error('Error sending email:', err);
    throw err;
  }
}

function buildResetUrl(token, frontendBase) {
  const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail(to, token, options = {}) {
  const resetUrl = buildResetUrl(token, options.frontendUrl);
  const appName = process.env.APP_NAME || 'Chess Results';

  const subject = `Reset your ${appName} password`;
  const text = `You requested a password reset for your ${appName} account.

Click the link below to reset your password:
${resetUrl}

If you did not request this, you can safely ignore this email.
This link will expire in 1 hour.`;

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <h2>${appName} - Password Reset</h2>
    <p>You requested a password reset for your ${appName} account.</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p style="color:#666;font-size:12px">This link will expire in 1 hour. If you did not request this, you can ignore this email.</p>
  </div>`;

  return sendMail({ to, subject, text, html });
}

// Format date for email display
function formatEmailDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Build tournament details URL
function buildTournamentUrl(tournamentId, frontendBase) {
  const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/tournaments/${tournamentId}`;
}

async function sendTournamentDetailsEmail(to, tournament, player, options = {}) {
  const appName = process.env.APP_NAME || 'Chess Results';
  const tournamentUrl = buildTournamentUrl(tournament.id, options.frontendUrl);
  const isApproval = options.isApproval || false;
  const isAdminAdded = options.isAdminAdded || false;
  
  let subjectPrefix = '';
  let introMessage = '';
  
  if (isApproval) {
    subjectPrefix = '🎉 Tournament Request Approved - ';
    introMessage = `Great news! Your request to join "${tournament.name}" has been approved. You are now officially registered for the tournament!`;
  } else if (isAdminAdded) {
    subjectPrefix = '🏆 You\'ve Been Added to Tournament - ';
    introMessage = `You have been added to the tournament "${tournament.name}" by an administrator.`;
  } else {
    subjectPrefix = '🏆 Tournament Registration Confirmed - ';
    introMessage = `You are now registered for the tournament "${tournament.name}".`;
  }
  
  const subject = `${subjectPrefix}${tournament.name}`;
  
  const text = `${introMessage}

Tournament Details:
==================
Name: ${tournament.name}
Location: ${tournament.location}
Start Date: ${formatEmailDate(tournament.start_date)}
End Date: ${formatEmailDate(tournament.end_date)}
Rounds: ${tournament.rounds}
Time Control: ${tournament.time_control}
Arbiter: ${tournament.arbiter}

Player Information:
==================
Name: ${player.name}
Rating: ${player.rating || 'Unrated'}
${player.title ? `Title: ${player.title}` : ''}

View tournament details: ${tournamentUrl}

Good luck and have a great tournament!

---
${appName}`;

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0">
      <h1 style="margin:0;font-size:24px">${isApproval ? '🎉' : '🏆'} ${appName}</h1>
      <p style="margin:5px 0 0;opacity:0.9">Tournament Registration</p>
    </div>
    
    <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none">
      <p style="font-size:16px;margin-bottom:20px;color:#059669;font-weight:bold">${introMessage}</p>
      
      <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">📋 Tournament Details</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">Name:</td><td style="padding:5px 0;color:#6b7280">${tournament.name}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">📍 Location:</td><td style="padding:5px 0;color:#6b7280">${tournament.location}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">📅 Start Date:</td><td style="padding:5px 0;color:#6b7280">${formatEmailDate(tournament.start_date)}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">📅 End Date:</td><td style="padding:5px 0;color:#6b7280">${formatEmailDate(tournament.end_date)}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">🎯 Rounds:</td><td style="padding:5px 0;color:#6b7280">${tournament.rounds}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">⏰ Time Control:</td><td style="padding:5px 0;color:#6b7280">${tournament.time_control}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">👨‍⚖️ Arbiter:</td><td style="padding:5px 0;color:#6b7280">${tournament.arbiter}</td></tr>
        </table>
      </div>
      
      <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">👤 Your Registration</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">Player Name:</td><td style="padding:5px 0;color:#6b7280">${player.name}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">Rating:</td><td style="padding:5px 0;color:#6b7280">${player.rating || 'Unrated'}</td></tr>
          ${player.title ? `<tr><td style="padding:5px 0;font-weight:bold;color:#374151">Title:</td><td style="padding:5px 0;color:#6b7280">${player.title}</td></tr>` : ''}
        </table>
      </div>
      
      <div style="text-align:center;margin:30px 0">
        <a href="${tournamentUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:16px">View Tournament Details</a>
      </div>
      
      <p style="color:#6b7280;font-size:14px;margin-top:30px">Good luck and have a great tournament! 🎯</p>
    </div>
    
    <div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
      <p style="margin:0;color:#6b7280;font-size:12px">This email was sent by ${appName}. If you have any questions, please contact the tournament organizer.</p>
    </div>
  </div>`;

  return sendMail({ to, subject, text, html });
}

// Helper function to format game result for display
function formatGameResult(result, isWhite) {
  if (!result || result === 'pending') return '🟡 Pending';
  if (result === '1/2-1/2') return '🟡 Draw';
  if ((result === '1-0' && isWhite) || (result === '0-1' && !isWhite)) return '🟢 Win';
  return '🔴 Loss';
}

// Helper function to get rank emoji
function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank <= 10) return '🏆';
  return '🎯';
}

async function sendTournamentResultsEmail(to, tournament, playerStats, playerGames, standings, options = {}) {
  const appName = process.env.APP_NAME || 'Chess Results';
  const tournamentUrl = buildTournamentUrl(tournament.id, options.frontendUrl);
  
  const subject = `🏆 Tournament Results - ${tournament.name}`;
  
  // Calculate performance statistics
  const totalGames = playerGames.length;
  const wins = playerGames.filter(g => g.result === 'win').length;
  const draws = playerGames.filter(g => g.result === 'draw').length;
  const losses = playerGames.filter(g => g.result === 'loss').length;
  const winRate = totalGames > 0 ? ((wins + draws * 0.5) / totalGames * 100).toFixed(1) : '0.0';
  
  // Find player's final ranking
  const playerRank = standings.find(s => s.player_id === playerStats.player_id)?.rank || 'N/A';
  const totalPlayers = standings.length;
  
  // Get top 3 for reference
  const top3 = standings.slice(0, 3);
  
  const text = `Tournament Results: ${tournament.name}

` +
    `🏆 YOUR FINAL RESULTS
` +
    `========================
` +
    `Final Rank: ${getRankEmoji(playerRank)} #${playerRank} of ${totalPlayers}
` +
    `Final Score: ${playerStats.points}/${tournament.rounds} points
` +
    `Performance: ${wins} wins, ${draws} draws, ${losses} losses (${winRate}%)
\n` +
    `🎯 TOURNAMENT SUMMARY
` +
    `=====================
` +
    `Tournament: ${tournament.name}
` +
    `Location: ${tournament.location}
` +
    `Duration: ${formatEmailDate(tournament.start_date)} - ${formatEmailDate(tournament.end_date)}
` +
    `Format: ${tournament.rounds} rounds, ${tournament.time_control}
` +
    `Participants: ${totalPlayers} players
\n` +
    `🥇 TOP 3 FINISHERS
` +
    `==================
` +
    top3.map(p => `${getRankEmoji(p.rank)} ${p.rank}. ${p.player_name} - ${p.points} points`).join('\n') +
    `\n\n📋 YOUR GAMES
` +
    `=============
` +
    playerGames.map(g => 
      `Round ${g.round}: vs ${g.opponent?.name || 'BYE'} (${g.opponent?.rating || 'Unrated'}) - ${formatGameResult(g.pgn_result, g.color === 'white').replace(/[🟡🟢🔴]/g, '')}`
    ).join('\n') +
    `\n\nView full results: ${tournamentUrl}\n\n` +
    `Thank you for participating!\n\n---\n${appName}`;

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0">
      <h1 style="margin:0;font-size:24px">🏆 ${appName}</h1>
      <p style="margin:5px 0 0;opacity:0.9">Tournament Results</p>
    </div>
    
    <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none">
      <p style="font-size:18px;margin-bottom:25px;color:#059669;font-weight:bold;text-align:center">
        ${tournament.name} - Tournament Complete! 🎉
      </p>
      
      <!-- Player's Results -->
      <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">${getRankEmoji(playerRank)} Your Final Results</h3>
        <div style="display:flex;justify-content:space-between;margin-bottom:15px">
          <div style="text-align:center;flex:1">
            <div style="font-size:24px;font-weight:bold;color:#0ea5e9">#${playerRank}</div>
            <div style="font-size:12px;color:#6b7280">Final Rank</div>
          </div>
          <div style="text-align:center;flex:1">
            <div style="font-size:24px;font-weight:bold;color:#059669">${playerStats.points}</div>
            <div style="font-size:12px;color:#6b7280">Points</div>
          </div>
          <div style="text-align:center;flex:1">
            <div style="font-size:24px;font-weight:bold;color:#7c3aed">${winRate}%</div>
            <div style="font-size:12px;color:#6b7280">Score Rate</div>
          </div>
        </div>
        <div style="text-align:center;padding:10px;background:#fff;border-radius:4px">
          <span style="color:#059669;font-weight:bold">${wins}W</span> • 
          <span style="color:#f59e0b;font-weight:bold">${draws}D</span> • 
          <span style="color:#ef4444;font-weight:bold">${losses}L</span>
          <div style="font-size:12px;color:#6b7280;margin-top:5px">Out of ${totalGames} games</div>
        </div>
      </div>
      
      <!-- Tournament Info -->
      <div style="background:#f8fafc;border-left:4px solid #6b7280;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">🎯 Tournament Summary</h3>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">📍 Location:</td><td style="padding:5px 0;color:#6b7280">${tournament.location}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">📅 Duration:</td><td style="padding:5px 0;color:#6b7280">${formatEmailDate(tournament.start_date)} - ${formatEmailDate(tournament.end_date)}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">🎯 Format:</td><td style="padding:5px 0;color:#6b7280">${tournament.rounds} rounds, ${tournament.time_control}</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">👥 Participants:</td><td style="padding:5px 0;color:#6b7280">${totalPlayers} players</td></tr>
          <tr><td style="padding:5px 0;font-weight:bold;color:#374151">👨‍⚖️ Arbiter:</td><td style="padding:5px 0;color:#6b7280">${tournament.arbiter}</td></tr>
        </table>
      </div>
      
      <!-- Top 3 -->
      <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">🏆 Top 3 Finishers</h3>
        ${top3.map(p => `
          <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #fef3c7;last-child:border-bottom:none">
            <div style="font-size:20px;margin-right:10px">${getRankEmoji(p.rank)}</div>
            <div style="flex:1">
              <div style="font-weight:bold;color:#374151">${p.player_name}</div>
              <div style="font-size:12px;color:#6b7280">Rating: ${p.player_rating || 'Unrated'}</div>
            </div>
            <div style="font-weight:bold;color:#f59e0b">${p.points} pts</div>
          </div>
        `).join('')}
      </div>
      
      <!-- Player's Games -->
      <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
        <h3 style="margin:0 0 15px;color:#374151;font-size:18px">📋 Your Games</h3>
        <div style="max-height:300px;overflow-y:auto">
          ${playerGames.map(g => `
            <div style="display:flex;align-items:center;padding:8px;margin:4px 0;background:#fff;border-radius:4px;border:1px solid #d1fae5">
              <div style="font-weight:bold;color:#374151;width:60px;">R${g.round}</div>
              <div style="flex:1;font-size:14px;color:#6b7280">
                vs ${g.opponent?.name || 'BYE'} 
                ${g.opponent?.rating ? `(${g.opponent.rating})` : ''}
              </div>
              <div style="font-weight:bold;">${formatGameResult(g.pgn_result, g.color === 'white')}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="text-align:center;margin:30px 0">
        <a href="${tournamentUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:16px">View Full Results</a>
      </div>
      
      <p style="color:#6b7280;font-size:14px;margin-top:30px;text-align:center">
        Thank you for participating in ${tournament.name}! 🎯
      </p>
    </div>
    
    <div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
      <p style="margin:0;color:#6b7280;font-size:12px">This email was sent by ${appName}. Keep playing and improving your chess skills!</p>
    </div>
  </div>`;

  return sendMail({ to, subject, text, html });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendTournamentDetailsEmail,
  sendTournamentResultsEmail,
  buildResetUrl,
  formatEmailDate,
  buildTournamentUrl,
  formatGameResult,
  getRankEmoji,
};
