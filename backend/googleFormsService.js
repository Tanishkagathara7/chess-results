const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

class GoogleFormsService {
    constructor() {
        this.formsAPI = null;
        this.driveAPI = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Initialize Google APIs with service account or OAuth2
            let auth;
            
            if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
                // Use service account (recommended for server-side apps)
                const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                auth = new google.auth.GoogleAuth({
                    credentials: serviceAccountKey,
                    scopes: [
                        'https://www.googleapis.com/auth/forms.body',
                        'https://www.googleapis.com/auth/drive'
                    ]
                });
            } else if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
                // Use OAuth2 (for personal use)
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    'http://localhost:3001/auth/google/callback'
                );
                
                if (process.env.GOOGLE_REFRESH_TOKEN) {
                    oauth2Client.setCredentials({
                        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
                    });
                }
                auth = oauth2Client;
            } else {
                console.log('⚠️ Google API credentials not configured. Using template URLs instead.');
                return false;
            }

            this.formsAPI = google.forms({ version: 'v1', auth });
            this.driveAPI = google.drive({ version: 'v3', auth });
            this.initialized = true;
            console.log('✅ Google Forms API initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Forms API:', error.message);
            return false;
        }
    }

    async createTournamentRegistrationForm(tournament) {
        if (!this.initialized) {
            // Return template URL if API not configured
            return this.generateTemplateURL(tournament);
        }

        try {
            const formTitle = `${tournament.name} - Registration`;
            const formDescription = this.generateFormDescription(tournament);

            // Create the form
            const createResponse = await this.formsAPI.forms.create({
                requestBody: {
                    info: {
                        title: formTitle,
                        description: formDescription
                    }
                }
            });

            const formId = createResponse.data.formId;
            const formURL = createResponse.data.responderUri;

            // Add questions to the form
            await this.addFormQuestions(formId, tournament);

            // Set up form settings
            await this.configureFormSettings(formId);

            console.log('✅ Google Form created successfully:', formURL);

            return {
                enabled: true,
                form_id: formId,
                registration_url: formURL,
                template_url: null,
                webhook_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/tournaments/${tournament.id}/register-webhook`,
                instructions: 'Form created automatically. Share the registration URL with players.',
                created_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Failed to create Google Form:', error.message);
            // Fallback to template URL
            return this.generateTemplateURL(tournament);
        }
    }

    async addFormQuestions(formId, tournament) {
        const questions = [
            {
                title: 'Player Name',
                description: 'Enter your full name as it should appear in tournament results',
                required: true,
                type: 'TEXT'
            },
            {
                title: 'Chess Rating',
                description: 'Enter your current chess rating (use 0 if unrated)',
                required: true,
                type: 'TEXT'
            },
            {
                title: 'FIDE Title',
                description: 'Select your FIDE title (if any)',
                required: false,
                type: 'MULTIPLE_CHOICE',
                choices: ['None', 'CM', 'FM', 'IM', 'GM', 'WCM', 'WFM', 'WIM', 'WGM']
            },
            {
                title: 'Birth Year',
                description: 'Enter your birth year (optional)',
                required: false,
                type: 'TEXT'
            },
            {
                title: 'Email Address',
                description: 'Enter your email address for tournament communications',
                required: true,
                type: 'TEXT'
            },
            {
                title: 'Phone Number',
                description: 'Enter your phone number (optional)',
                required: false,
                type: 'TEXT'
            },
            {
                title: 'Federation/Country',
                description: 'Enter your country or federation code (e.g., USA, IND, GER)',
                required: true,
                type: 'TEXT'
            }
        ];

        const requests = questions.map((question, index) => ({
            createItem: {
                item: {
                    title: question.title,
                    description: question.description,
                    questionItem: {
                        question: {
                            required: question.required,
                            ...(question.type === 'MULTIPLE_CHOICE' 
                                ? {
                                    choiceQuestion: {
                                        type: 'RADIO',
                                        options: question.choices.map(choice => ({ value: choice }))
                                    }
                                }
                                : {
                                    textQuestion: {}
                                })
                        }
                    }
                },
                location: {
                    index: index
                }
            }
        }));

        await this.formsAPI.forms.batchUpdate({
            formId: formId,
            requestBody: {
                requests: requests
            }
        });
    }

    async configureFormSettings(formId) {
        await this.formsAPI.forms.batchUpdate({
            formId: formId,
            requestBody: {
                requests: [
                    {
                        updateSettings: {
                            settings: {
                                quizSettings: null // Disable quiz mode
                            },
                            updateMask: 'quizSettings'
                        }
                    }
                ]
            }
        });
    }

    generateFormDescription(tournament) {
        const startDate = new Date(tournament.start_date).toLocaleDateString();
        const endDate = new Date(tournament.end_date).toLocaleDateString();
        
        return `Register for ${tournament.name}

📍 Location: ${tournament.location}
📅 Date: ${startDate} - ${endDate}
🎯 Rounds: ${tournament.rounds}
⏱️ Time Control: ${tournament.time_control}
👨‍⚖️ Arbiter: ${tournament.arbiter}

Please fill out all required fields to register for this tournament. You will receive confirmation once your registration is processed.

${tournament.registration_instructions || ''}`;
    }

    generateTemplateURL(tournament) {
        const formTitle = encodeURIComponent(`${tournament.name} - Registration`);
        const formDescription = encodeURIComponent(this.generateFormDescription(tournament));
        
        return {
            enabled: true,
            form_id: null,
            registration_url: null,
            template_url: `https://docs.google.com/forms/create?title=${formTitle}&description=${formDescription}`,
            webhook_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/tournaments/${tournament.id}/register-webhook`,
            instructions: 'Use the template URL to create a Google Form, then update the tournament with the actual form URL'
        };
    }

    async deleteForm(formId) {
        if (!this.initialized || !formId) return false;
        
        try {
            await this.driveAPI.files.delete({
                fileId: formId
            });
            console.log('✅ Google Form deleted successfully:', formId);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete Google Form:', error.message);
            return false;
        }
    }
}

module.exports = new GoogleFormsService();
