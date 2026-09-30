/**
 * Simple OpenAPI 3.1 Specification Generator
 * Manually constructs OpenAPI spec from existing Zod schemas
 */

import type { OpenAPIObject } from 'openapi3-ts/oas31';

/**
 * Generate OpenAPI 3.1 specification
 */
export function generateOpenAPISpec(): OpenAPIObject {
	return {
		openapi: '3.1.0',
		info: {
			title: 'Chiphre API',
			version: '1.0.0',
			description: `
# Chiphre API Documentation

Educational mathematics platform API with comprehensive Zod validation.

## Features

- **Assessments**: séries et évaluations
- **Exercises**: Mathematical exercises with solutions
- **SRS (Spaced Repetition)**: Flashcard system with FSRS algorithm
- **Messages**: Internal messaging system
- **Questions**: Question template management
- **Notifications**: User notification system
- **Classes**: Class management for teachers
- **Rewards**: Gamification with gidouilles currency
- **Admin**: Administrative operations

## Authentication

All endpoints require authentication via session cookies. Users must be logged in to access the API.

## Rate Limiting

- AI Chatbot: 5 requests per 15 minutes
- General API: No rate limiting currently implemented

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
\`\`\`

## Validation

All request bodies and query parameters are validated using Zod schemas. Invalid requests will return a 400 status code with detailed validation errors.
			`.trim(),
			contact: {
				name: 'Chiphre Team',
				url: 'https://chiph.re'
			}
		},
		servers: [
			{
				url: 'https://chiph.re',
				description: 'Production server'
			},
			{
				url: 'http://localhost:5173',
				description: 'Development server (user)'
			},
			{
				url: 'http://localhost:5175',
				description: 'Development server (Claude)'
			}
		],
		tags: [
			{
				name: 'Assessments',
				description: 'Séries et évaluations'
			},
			{
				name: 'Exercises',
				description: 'Mathematical exercise management and assignment'
			},
			{
				name: 'SRS',
				description: 'Spaced repetition system (flashcards) with FSRS algorithm'
			},
			{
				name: 'Messages',
				description: 'Internal messaging system for teachers and students'
			},
			{
				name: 'Questions',
				description: 'Question template management and generation'
			},
			{
				name: 'Notifications',
				description: 'User notification system'
			},
			{
				name: 'Classes',
				description: 'Class management for teachers'
			},
			{
				name: 'Admin',
				description: 'Administrative operations (admin role required)'
			},
			{
				name: 'Rewards',
				description: 'Gamification and gidouilles reward system'
			},
			{
				name: 'Riddles',
				description: 'Daily riddles and puzzles'
			},
			{
				name: 'Errors',
				description: 'Client-side error logging'
			}
		],
		components: {
			securitySchemes: {
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'session',
					description: 'Session-based authentication using HTTP-only cookies'
				}
			},
			schemas: {
				Error: {
					type: 'object',
					properties: {
						error: {
							type: 'object',
							properties: {
								message: { type: 'string' },
								code: { type: 'string' },
								details: {}
							},
							required: ['message']
						}
					}
				},
				Success: {
					type: 'object',
					properties: {
						success: { type: 'boolean' },
						message: { type: 'string' }
					}
				},
				UUID: {
					type: 'string',
					format: 'uuid'
				},
				Grade: {
					type: 'string',
					enum: ['6eme', '5eme', '4eme', '3eme', '2nde', '1ere', 'Terminale']
				},
				Difficulty: {
					type: 'integer',
					enum: [1, 2, 3],
					description: '1=easy, 2=medium, 3=hard'
				}
			}
		},
		security: [
			{
				cookieAuth: []
			}
		],
		paths: {
			'/api/series': {
				post: {
					tags: ['Assessments'],
					summary: 'Enregistrer une série',
					description:
						'Enregistre le panier comme série (titre, niveau, description, 1 à 50 catégories). Prof et admin.',
					responses: {
						'201': { description: 'Série enregistrée' },
						'400': { description: 'Corps invalide' },
						'403': { description: 'Réservé aux professeurs et aux administrateurs' }
					}
				}
			},
			'/api/evaluations/assignments/{id}/start': {
				post: {
					tags: ['Assessments'],
					summary: 'Ouvrir une évaluation assignée',
					description:
						"Vérifie date limite et tentatives (destinataire) ou ouvre un aperçu (propriétaire) ; rend la forme, le temps limite et les catégories de l'évaluation.",
					responses: {
						'200': { description: 'Validation et évaluation' },
						'403': { description: 'Évaluation non assignée' },
						'404': { description: 'Évaluation introuvable' }
					}
				}
			},
			'/api/exercises': {
				get: {
					tags: ['Exercises'],
					summary: 'List exercises',
					description: 'List exercises with filtering, search, and pagination',
					parameters: [
						{
							name: 'page',
							in: 'query',
							schema: { type: 'integer', default: 1 }
						},
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', default: 50, maximum: 100 }
						},
						{
							name: 'difficulty',
							in: 'query',
							schema: { $ref: '#/components/schemas/Difficulty' }
						},
						{
							name: 'search',
							in: 'query',
							schema: { type: 'string', maxLength: 200 }
						}
					],
					responses: {
						'200': {
							description: 'List of exercises'
						}
					}
				},
				post: {
					tags: ['Exercises'],
					summary: 'Create exercise',
					description: 'Create a new exercise',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['statement_md', 'solution_md', 'difficulty'],
									properties: {
										statement_md: {
											type: 'string',
											minLength: 1,
											maxLength: 50000
										},
										solution_md: {
											type: 'string',
											minLength: 1,
											maxLength: 50000
										},
										difficulty: { $ref: '#/components/schemas/Difficulty' },
										tags: {
											type: 'array',
											items: { type: 'string' },
											maxItems: 20
										}
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'Exercise created successfully'
						}
					}
				}
			},
			'/api/srs/decks': {
				get: {
					tags: ['SRS'],
					summary: 'List decks',
					description: 'List all decks with optional filtering',
					parameters: [
						{
							name: 'deckType',
							in: 'query',
							schema: {
								type: 'string',
								enum: ['official', 'personal']
							}
						}
					],
					responses: {
						'200': {
							description: 'List of decks'
						}
					}
				},
				post: {
					tags: ['SRS'],
					summary: 'Create deck',
					description: 'Create a new deck',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['name', 'deckType'],
									properties: {
										name: {
											type: 'string',
											minLength: 1,
											maxLength: 100
										},
										description: {
											type: 'string',
											maxLength: 500
										},
										deckType: {
											type: 'string',
											enum: ['official', 'personal']
										}
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'Deck created successfully'
						}
					}
				}
			},
			'/api/messages': {
				post: {
					tags: ['Messages'],
					summary: 'Send message',
					description: 'Send a new message',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['subject', 'content'],
									properties: {
										recipientIds: {
											type: 'array',
											items: { $ref: '#/components/schemas/UUID' },
											maxItems: 100
										},
										subject: {
											type: 'string',
											minLength: 1,
											maxLength: 200
										},
										content: {
											type: 'string',
											minLength: 1,
											maxLength: 10000
										},
										isGroupMessage: {
											type: 'boolean',
											default: false
										}
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'Message sent successfully'
						}
					}
				}
			},
			'/api/questions': {
				get: {
					tags: ['Questions'],
					summary: 'List question templates',
					description: 'List question templates with filtering and pagination',
					responses: {
						'200': {
							description: 'List of question templates'
						}
					}
				},
				post: {
					tags: ['Questions'],
					summary: 'Create question template',
					description: 'Create a new question template',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['type', 'title', 'grades', 'theme', 'domain', 'level'],
									properties: {
										type: {
											type: 'string',
											enum: [
												'multiple_choice',
												'numerical',
												'algebraic',
												'fill_blanks',
												'ordering',
												'matrix',
												'true_false'
											]
										},
										title: {
											type: 'string',
											minLength: 1,
											maxLength: 200
										},
										grades: {
											type: 'array',
											items: { $ref: '#/components/schemas/Grade' },
											minItems: 1
										},
										theme: {
											type: 'string',
											minLength: 1,
											maxLength: 100
										},
										domain: {
											type: 'string',
											minLength: 1,
											maxLength: 100
										},
										level: {
											type: 'integer',
											minimum: 1
										}
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'Question template created successfully'
						}
					}
				}
			},
			'/api/notifications': {
				get: {
					tags: ['Notifications'],
					summary: 'List notifications',
					description: 'List notifications with pagination',
					parameters: [
						{
							name: 'page',
							in: 'query',
							schema: { type: 'integer', default: 1 }
						},
						{
							name: 'limit',
							in: 'query',
							schema: { type: 'integer', default: 50 }
						},
						{
							name: 'unreadOnly',
							in: 'query',
							schema: { type: 'boolean', default: false }
						}
					],
					responses: {
						'200': {
							description: 'List of notifications'
						}
					}
				}
			},
			'/api/classes': {
				get: {
					tags: ['Classes'],
					summary: 'List classes',
					description: 'List all classes for the current teacher',
					responses: {
						'200': {
							description: 'List of classes'
						}
					}
				},
				post: {
					tags: ['Classes'],
					summary: 'Create class',
					description: 'Create a new class',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['name', 'grade', 'school_year'],
									properties: {
										name: {
											type: 'string',
											minLength: 1,
											maxLength: 100
										},
										grade: { $ref: '#/components/schemas/Grade' },
										school_year: {
											type: 'string',
											pattern: '^\\d{4}-\\d{4}$'
										},
										description: {
											type: 'string',
											maxLength: 500
										}
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'Class created successfully'
						}
					}
				}
			},
			'/api/rewards/award': {
				post: {
					tags: ['Rewards'],
					summary: 'Award gidouilles',
					description: 'Award gidouilles to a student',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['studentId', 'amount'],
									properties: {
										studentId: { $ref: '#/components/schemas/UUID' },
										amount: {
											type: 'integer',
											minimum: 1,
											maximum: 1000
										}
									}
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'Gidouilles awarded successfully'
						}
					}
				}
			},
			'/api/errors/log': {
				post: {
					tags: ['Errors'],
					summary: 'Log error',
					description: 'Log a client-side error',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['error_type', 'message', 'url'],
									properties: {
										error_type: {
											type: 'string',
											enum: ['frontend', 'backend', 'api', 'database', 'unknown']
										},
										message: {
											type: 'string',
											maxLength: 1000
										},
										url: {
											type: 'string',
											format: 'uri',
											maxLength: 500
										},
										stack_trace: {
											type: 'string',
											maxLength: 5000
										},
										severity: {
											type: 'string',
											enum: ['low', 'medium', 'high', 'critical']
										}
									}
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'Error logged successfully'
						}
					}
				}
			}
		}
	};
}
