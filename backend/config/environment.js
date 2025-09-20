const path = require('path');
const fs = require('fs');

class EnvironmentManager {
    constructor() {
        this.env = process.env.NODE_ENV || 'development';
        this.config = {};
        this.loadConfiguration();
        this.validateConfiguration();
    }

    loadConfiguration() {
        // Base configuration
        this.config = {
            // Server Configuration
            port: parseInt(process.env.PORT) || 3001,
            host: process.env.HOST || 'localhost',
            nodeEnv: this.env,
            
            // Database Configuration
            mongodb: {
                url: process.env.MONGO_URL,
                dbName: process.env.DB_NAME || 'chess_results',
                options: {
                    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 10,
                    serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT) || 5000,
                }
            },
            
            // Security Configuration
            jwt: {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                algorithm: 'HS256'
            },
            
            admin: {
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD
            },
            
            // CORS Configuration
            cors: {
                origins: this.parseOrigins(process.env.CORS_ORIGINS),
                credentials: process.env.CORS_CREDENTIALS !== 'false'
            },
            
            // Logging Configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE,
                maxFiles: process.env.LOG_MAX_FILES || '14d',
                maxSize: process.env.LOG_MAX_SIZE || '20m'
            },
            
            // Cache Configuration
            cache: {
                ttl: parseInt(process.env.CACHE_TTL) || 300,
                checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 120
            },
            
            // Google API Configuration
            google: {
                serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN
            },
            
            // External URLs
            urls: {
                backend: process.env.BACKEND_URL || `http://localhost:${this.config.port}`,
                frontend: process.env.FRONTEND_URL || 'http://localhost:3000'
            },
            
            // Feature Flags
            features: {
                registration: process.env.ENABLE_REGISTRATION !== 'false',
                notifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
                googleForms: process.env.ENABLE_GOOGLE_FORMS !== 'false',
                swagger: process.env.ENABLE_SWAGGER !== 'false'
            },
            
            // Rate Limiting
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
                max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // 100 requests per window
            },
            
            // File Upload Configuration
            upload: {
                maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
                allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf').split(',')
            }
        };

        // Environment-specific overrides
        this.applyEnvironmentOverrides();
    }

    parseOrigins(originsString) {
        if (!originsString) return ['http://localhost:3000'];
        if (originsString === '*') return '*';
        return originsString.split(',').map(origin => origin.trim());
    }

    applyEnvironmentOverrides() {
        switch (this.env) {
            case 'production':
                this.config.logging.level = 'warn';
                this.config.cors.origins = this.config.cors.origins === '*' 
                    ? ['https://yourdomain.com'] 
                    : this.config.cors.origins;
                this.config.cache.ttl = 600; // 10 minutes in production
                break;
                
            case 'test':
                this.config.logging.level = 'error';
                this.config.mongodb.dbName = 'chess_results_test';
                this.config.jwt.expiresIn = '1h';
                this.config.features.notifications = false;
                break;
                
            case 'development':
            default:
                this.config.logging.level = 'debug';
                this.config.features.swagger = true;
                break;
        }
    }

    validateConfiguration() {
        const errors = [];

        // Required environment variables
        const required = [
            'MONGO_URL',
            'JWT_SECRET',
            'ADMIN_EMAIL',
            'ADMIN_PASSWORD'
        ];

        required.forEach(key => {
            if (!process.env[key]) {
                errors.push(`Missing required environment variable: ${key}`);
            }
        });

        // Validate JWT secret strength
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
            errors.push('JWT_SECRET must be at least 32 characters long');
        }

        // Validate MongoDB URL format
        if (process.env.MONGO_URL && !process.env.MONGO_URL.startsWith('mongodb')) {
            errors.push('MONGO_URL must be a valid MongoDB connection string');
        }

        // Validate admin email format
        if (process.env.ADMIN_EMAIL && !this.isValidEmail(process.env.ADMIN_EMAIL)) {
            errors.push('ADMIN_EMAIL must be a valid email address');
        }

        // Validate numeric values
        const numericVars = ['PORT', 'MONGO_MAX_POOL_SIZE', 'CACHE_TTL', 'RATE_LIMIT_MAX'];
        numericVars.forEach(key => {
            if (process.env[key] && isNaN(parseInt(process.env[key]))) {
                errors.push(`${key} must be a valid number`);
            }
        });

        if (errors.length > 0) {
            console.error('❌ Environment Configuration Errors:');
            errors.forEach(error => console.error(`   - ${error}`));
            
            if (this.env === 'production') {
                process.exit(1);
            } else {
                console.warn('⚠️ Continuing with warnings in development mode');
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    get(key) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    isDevelopment() {
        return this.env === 'development';
    }

    isProduction() {
        return this.env === 'production';
    }

    isTest() {
        return this.env === 'test';
    }

    // Get all configuration (useful for debugging)
    getAll() {
        // Return a copy without sensitive data
        const safeCopy = JSON.parse(JSON.stringify(this.config));
        if (safeCopy.jwt) safeCopy.jwt.secret = '***REDACTED***';
        if (safeCopy.admin) safeCopy.admin.password = '***REDACTED***';
        if (safeCopy.mongodb) safeCopy.mongodb.url = this.redactMongoUrl(safeCopy.mongodb.url);
        if (safeCopy.google) {
            if (safeCopy.google.serviceAccountKey) safeCopy.google.serviceAccountKey = '***REDACTED***';
            if (safeCopy.google.clientSecret) safeCopy.google.clientSecret = '***REDACTED***';
            if (safeCopy.google.refreshToken) safeCopy.google.refreshToken = '***REDACTED***';
        }
        return safeCopy;
    }

    redactMongoUrl(url) {
        if (!url) return url;
        return url.replace(/:([^:@]+)@/, ':***@');
    }

    // Health check for configuration
    healthCheck() {
        return {
            environment: this.env,
            configurationValid: true,
            features: this.config.features,
            timestamp: new Date().toISOString()
        };
    }
}

// Create singleton instance
const environmentManager = new EnvironmentManager();

module.exports = environmentManager;