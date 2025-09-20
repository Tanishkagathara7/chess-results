const NodeCache = require('node-cache');
const logger = require('./logger');

class CacheManager {
    constructor() {
        // Default TTL: 15 minutes
        this.cache = new NodeCache({ 
            stdTTL: 900,
            checkperiod: 120,
            useClones: false
        });
        
        // Cache for different data types with different TTLs
        this.tournaments = new NodeCache({ stdTTL: 300 }); // 5 minutes
        this.players = new NodeCache({ stdTTL: 600 }); // 10 minutes
        this.results = new NodeCache({ stdTTL: 180 }); // 3 minutes
        this.notifications = new NodeCache({ stdTTL: 60 }); // 1 minute
        
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Log cache events
        this.cache.on('set', (key, value) => {
            logger.debug(`Cache SET: ${key}`);
        });
        
        this.cache.on('del', (key, value) => {
            logger.debug(`Cache DELETE: ${key}`);
        });
        
        this.cache.on('expired', (key, value) => {
            logger.debug(`Cache EXPIRED: ${key}`);
        });
        
        // Handle cache errors
        this.cache.on('error', (err) => {
            logger.error('Cache error:', err);
        });
    }
    
    // Generic cache methods
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            logger.debug(`Cache HIT: ${key}`);
            return value;
        }
        logger.debug(`Cache MISS: ${key}`);
        return undefined;
    }
    
    set(key, value, ttl = undefined) {
        const result = this.cache.set(key, value, ttl);
        if (result) {
            logger.debug(`Cache SET successful: ${key}`);
        }
        return result;
    }
    
    del(key) {
        return this.cache.del(key);
    }
    
    // Specialized cache methods for different data types
    getTournament(tournamentId) {
        return this.tournaments.get(`tournament_${tournamentId}`);
    }
    
    setTournament(tournamentId, tournament) {
        return this.tournaments.set(`tournament_${tournamentId}`, tournament);
    }
    
    invalidateTournament(tournamentId) {
        this.tournaments.del(`tournament_${tournamentId}`);
        this.tournaments.del(`tournaments_list`);
        this.results.del(`tournament_${tournamentId}_results`);
    }
    
    getPlayer(playerId) {
        return this.players.get(`player_${playerId}`);
    }
    
    setPlayer(playerId, player) {
        return this.players.set(`player_${playerId}`, player);
    }
    
    invalidatePlayer(playerId) {
        this.players.del(`player_${playerId}`);
        this.players.del(`players_list`);
    }
    
    getTournamentResults(tournamentId, round = 'all') {
        return this.results.get(`tournament_${tournamentId}_round_${round}_results`);
    }
    
    setTournamentResults(tournamentId, round = 'all', results) {
        return this.results.set(`tournament_${tournamentId}_round_${round}_results`, results);
    }
    
    getUserNotifications(userId) {
        return this.notifications.get(`user_${userId}_notifications`);
    }
    
    setUserNotifications(userId, notifications) {
        return this.notifications.set(`user_${userId}_notifications`, notifications);
    }
    
    invalidateUserNotifications(userId) {
        this.notifications.del(`user_${userId}_notifications`);
        this.notifications.del(`user_${userId}_unread_count`);
    }
    
    // Bulk operations
    getMultiple(keys) {
        return this.cache.mget(keys);
    }
    
    setMultiple(data) {
        return this.cache.mset(data);
    }
    
    // Cache statistics
    getStats() {
        return {
            main: this.cache.getStats(),
            tournaments: this.tournaments.getStats(),
            players: this.players.getStats(),
            results: this.results.getStats(),
            notifications: this.notifications.getStats()
        };
    }
    
    // Clear all caches
    flushAll() {
        this.cache.flushAll();
        this.tournaments.flushAll();
        this.players.flushAll();
        this.results.flushAll();
        this.notifications.flushAll();
        logger.info('All caches cleared');
    }
    
    // Cache middleware for Express
    middleware(ttl = 300) {
        return (req, res, next) => {
            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }
            
            const key = `${req.method}_${req.originalUrl}`;
            const cachedResponse = this.get(key);
            
            if (cachedResponse) {
                logger.debug(`Serving cached response for: ${key}`);
                return res.json(cachedResponse);
            }
            
            // Store original json method
            const originalJson = res.json;
            
            // Override json method to cache response
            res.json = (body) => {
                // Cache successful responses only
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    this.set(key, body, ttl);
                    logger.debug(`Cached response for: ${key}`);
                }
                
                // Call original json method
                originalJson.call(res, body);
            };
            
            next();
        };
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;