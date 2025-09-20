const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chess Results API',
      version: '1.0.0',
      description: 'A comprehensive chess tournament management system API',
      contact: {
        name: 'Chess Results API Support',
        email: 'admin@chessresults.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          },
          required: ['error']
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            rating: {
              type: 'integer',
              minimum: 0,
              maximum: 3000,
              description: 'Chess rating'
            },
            birth_year: {
              type: 'integer',
              minimum: 1900,
              description: 'Birth year'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'User status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Player: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique player identifier'
            },
            name: {
              type: 'string',
              description: 'Player name'
            },
            rating: {
              type: 'integer',
              minimum: 0,
              description: 'Chess rating'
            },
            title: {
              type: 'string',
              enum: ['', 'CM', 'FM', 'IM', 'GM', 'WCM', 'WFM', 'WIM', 'WGM'],
              description: 'FIDE title'
            },
            birth_year: {
              type: 'integer',
              minimum: 1900,
              description: 'Birth year'
            },
            user_id: {
              type: 'string',
              description: 'Associated user ID (if any)'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['name', 'rating']
        },
        Tournament: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique tournament identifier'
            },
            name: {
              type: 'string',
              description: 'Tournament name'
            },
            location: {
              type: 'string',
              description: 'Tournament location'
            },
            start_date: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament start date'
            },
            end_date: {
              type: 'string',
              format: 'date-time',
              description: 'Tournament end date'
            },
            rounds: {
              type: 'integer',
              minimum: 1,
              maximum: 20,
              description: 'Number of rounds'
            },
            time_control: {
              type: 'string',
              description: 'Time control format (e.g., 90+30)'
            },
            arbiter: {
              type: 'string',
              description: 'Chief arbiter name'
            },
            tournament_type: {
              type: 'string',
              enum: ['swiss', 'knockout', 'round_robin'],
              description: 'Tournament format'
            },
            enable_registration: {
              type: 'boolean',
              description: 'Whether online registration is enabled'
            },
            max_participants: {
              type: 'integer',
              minimum: 2,
              maximum: 500,
              description: 'Maximum number of participants'
            },
            entry_fee: {
              type: 'number',
              minimum: 0,
              description: 'Entry fee amount'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['name', 'location', 'start_date', 'end_date', 'rounds', 'time_control', 'arbiter']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string'
            },
            token: {
              type: 'string',
              description: 'JWT authentication token'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            service: {
              type: 'string',
              example: 'Chess Results API'
            }
          }
        }
      },
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health check endpoints'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Players',
        description: 'Player management'
      },
      {
        name: 'Tournaments',
        description: 'Tournament management'
      },
      {
        name: 'Participants',
        description: 'Tournament participant management'
      },
      {
        name: 'Pairings',
        description: 'Tournament round pairings'
      },
      {
        name: 'Notifications',
        description: 'User notifications'
      }
    ]
  },
  apis: ['./server.js', './routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};