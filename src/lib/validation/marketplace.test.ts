/**
 * Marketplace Validation Schema Tests
 * ====================================
 *
 * Comprehensive tests for all marketplace Zod validation schemas.
 * Tests bounds checking, refinements, error messages, and edge cases.
 */

import { describe, test, expect } from 'vitest';
import {
	createListingSchema,
	updateListingSchema,
	listingsQuerySchema,
	createProposalSchema,
	updateProposalSchema,
	createTradeSchema,
	createOfferSchema,
	acceptTradeSchema,
	updateConfigSchema,
	chatMessageSchema,
	adminTradesQuerySchema,
	adminStatsQuerySchema
} from './marketplace';

// ============================================================================
// LISTING SCHEMAS
// ============================================================================

describe('createListingSchema', () => {
	test('validates a valid sell listing', () => {
		const data = {
			listing_type: 'sell',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			offered_gidouilles: 100,
			wanted_card_template_ids: [],
			wanted_gidouilles: 200,
			title: 'Selling rare cards',
			description: 'Great deal!'
		};

		const result = createListingSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(data);
		}
	});

	test('validates a valid buy listing', () => {
		const data = {
			listing_type: 'buy',
			offered_card_ids: [],
			offered_gidouilles: 0,
			wanted_card_template_ids: ['550e8400-e29b-41d4-a716-446655440001'],
			wanted_gidouilles: 0,
			title: 'Looking for specific card'
		};

		const result = createListingSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('rejects sell listing without offering anything', () => {
		const data = {
			listing_type: 'sell',
			offered_card_ids: [],
			offered_gidouilles: 0,
			wanted_gidouilles: 100,
			title: 'Invalid listing'
		};

		const result = createListingSchema.safeParse(data);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				'Une annonce doit proposer ou demander au moins un élément'
			);
		}
	});

	test('rejects buy listing without wanting anything', () => {
		const data = {
			listing_type: 'buy',
			offered_card_ids: [],
			offered_gidouilles: 0,
			wanted_card_template_ids: [],
			wanted_gidouilles: 0,
			title: 'Invalid buy listing'
		};

		const result = createListingSchema.safeParse(data);
		expect(result.success).toBe(false);
	});

	test('validates bounds for offered_gidouilles', () => {
		// Negative value
		let result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_gidouilles: -1,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Les gidouilles ne peuvent pas être négatives');
		}

		// Above maximum
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_gidouilles: 10001,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Maximum 10000 gidouilles');
		}

		// Non-integer value
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_gidouilles: 100.5,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Les gidouilles doivent être un nombre entier');
		}

		// Infinity
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_gidouilles: Infinity,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			// Zod rejects Infinity at type level with generic "Invalid input" message
			expect(result.error.issues[0].message).toContain('Invalid input');
		}
	});

	test('validates card ID arrays', () => {
		// Too many cards
		const tooManyCards = Array.from({ length: 11 }, () => '550e8400-e29b-41d4-a716-446655440000');
		let result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_card_ids: tooManyCards,
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Maximum 10 cartes peuvent être offertes');
		}

		// Invalid UUID
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_card_ids: ['not-a-uuid'],
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('ID de carte invalide');
		}
	});

	test('validates title constraints', () => {
		// Too short
		let result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'AB'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Le titre doit contenir au moins 3 caractères');
		}

		// Too long
		const longTitle = 'A'.repeat(101);
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: longTitle
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Le titre ne peut pas dépasser 100 caractères');
		}
	});

	test('validates description constraints', () => {
		const longDescription = 'A'.repeat(501);
		const result = createListingSchema.safeParse({
			listing_type: 'sell',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			title: 'Test',
			description: longDescription
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				'La description ne peut pas dépasser 500 caractères'
			);
		}
	});

	test('applies default values', () => {
		const data = {
			listing_type: 'sell' as const,
			title: 'Test listing'
		};

		const result = createListingSchema.safeParse(data);
		expect(result.success).toBe(false); // Will fail refinement, but let's check defaults applied

		// Parse with minimal valid data
		const validData = {
			listing_type: 'sell' as const,
			title: 'Test listing',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000']
		};

		const validResult = createListingSchema.safeParse(validData);
		expect(validResult.success).toBe(true);
		if (validResult.success) {
			expect(validResult.data.offered_gidouilles).toBe(0);
			expect(validResult.data.wanted_card_template_ids).toEqual([]);
			expect(validResult.data.wanted_gidouilles).toBe(0);
		}
	});
});

describe('updateListingSchema', () => {
	test('validates partial updates', () => {
		const data = {
			title: 'Updated title'
		};

		const result = updateListingSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(data);
		}
	});

	test('validates all optional fields', () => {
		const data = {
			title: 'New title',
			description: 'New description',
			wanted_card_template_ids: ['550e8400-e29b-41d4-a716-446655440000'],
			wanted_gidouilles: 500
		};

		const result = updateListingSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('allows empty object for no updates', () => {
		const result = updateListingSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test('applies same constraints as create schema', () => {
		// Title too short
		let result = updateListingSchema.safeParse({ title: 'AB' });
		expect(result.success).toBe(false);

		// Gidouilles negative
		result = updateListingSchema.safeParse({ wanted_gidouilles: -1 });
		expect(result.success).toBe(false);

		// Too many card templates
		const tooManyTemplates = Array.from(
			{ length: 11 },
			() => '550e8400-e29b-41d4-a716-446655440000'
		);
		result = updateListingSchema.safeParse({ wanted_card_template_ids: tooManyTemplates });
		expect(result.success).toBe(false);
	});
});

describe('listingsQuerySchema', () => {
	test('validates valid query parameters', () => {
		const data = {
			page: '2',
			limit: '25',
			type: 'sell',
			card_template_id: '550e8400-e29b-41d4-a716-446655440000'
		};

		const result = listingsQuerySchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(2);
			expect(result.data.limit).toBe(25);
			expect(result.data.type).toBe('sell');
		}
	});

	test('applies defaults', () => {
		const result = listingsQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(1);
			expect(result.data.limit).toBe(20);
			expect(result.data.type).toBeUndefined();
			expect(result.data.card_template_id).toBeUndefined();
		}
	});

	test('validates pagination bounds', () => {
		// Page < 1
		let result = listingsQuerySchema.safeParse({ page: '0' });
		expect(result.success).toBe(false);

		// Limit > 50
		result = listingsQuerySchema.safeParse({ limit: '51' });
		expect(result.success).toBe(false);

		// Limit < 1
		result = listingsQuerySchema.safeParse({ limit: '0' });
		expect(result.success).toBe(false);
	});

	test('coerces string numbers', () => {
		const result = listingsQuerySchema.safeParse({ page: '5', limit: '30' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(typeof result.data.page).toBe('number');
			expect(typeof result.data.limit).toBe('number');
			expect(result.data.page).toBe(5);
			expect(result.data.limit).toBe(30);
		}
	});

	test('validates listing type enum', () => {
		let result = listingsQuerySchema.safeParse({ type: 'invalid' });
		expect(result.success).toBe(false);

		result = listingsQuerySchema.safeParse({ type: 'buy' });
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// PROPOSAL SCHEMAS
// ============================================================================

describe('createProposalSchema', () => {
	test('validates valid proposal with cards', () => {
		const data = {
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440001'],
			offered_gidouilles: 0,
			message: 'I really want this card!'
		};

		const result = createProposalSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('validates valid proposal with gidouilles', () => {
		const data = {
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_card_ids: [],
			offered_gidouilles: 500
		};

		const result = createProposalSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('validates valid proposal with both cards and gidouilles', () => {
		const data = {
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440001'],
			offered_gidouilles: 200
		};

		const result = createProposalSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('rejects proposal with nothing offered', () => {
		const data = {
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_card_ids: [],
			offered_gidouilles: 0
		};

		const result = createProposalSchema.safeParse(data);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				'Une proposition doit contenir au moins une carte ou des gidouilles'
			);
		}
	});

	test('validates message length', () => {
		const longMessage = 'A'.repeat(501);
		const result = createProposalSchema.safeParse({
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_gidouilles: 100,
			message: longMessage
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Le message ne peut pas dépasser 500 caractères');
		}
	});

	test('validates UUID formats', () => {
		const result = createProposalSchema.safeParse({
			listing_id: 'not-a-uuid',
			offered_gidouilles: 100
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("ID d'annonce invalide");
		}
	});

	test('applies defaults', () => {
		const data = {
			listing_id: '550e8400-e29b-41d4-a716-446655440000',
			offered_gidouilles: 100
			// offered_card_ids not provided
		};

		const result = createProposalSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.offered_card_ids).toEqual([]);
		}
	});
});

describe('updateProposalSchema', () => {
	test('validates status updates', () => {
		const data = {
			status: 'accepted' as const,
			response_message: 'Thanks for the offer!'
		};

		const result = updateProposalSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('allows rejected status', () => {
		const result = updateProposalSchema.safeParse({
			status: 'rejected'
		});
		expect(result.success).toBe(true);
	});

	test('rejects invalid status', () => {
		const result = updateProposalSchema.safeParse({
			status: 'pending'
		});
		expect(result.success).toBe(false);
	});

	test('validates response message length', () => {
		const longMessage = 'A'.repeat(501);
		const result = updateProposalSchema.safeParse({
			status: 'accepted',
			response_message: longMessage
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// TRADE SCHEMAS
// ============================================================================

describe('createTradeSchema', () => {
	test('validates valid trade creation', () => {
		const data = {
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {
				cards: ['550e8400-e29b-41d4-a716-446655440001'],
				gidouilles: 100
			}
		};

		const result = createTradeSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('validates empty initial offer', () => {
		const data = {
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {
				cards: [],
				gidouilles: 0
			}
		};

		const result = createTradeSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('validates card limits in initial offer', () => {
		const tooManyCards = Array.from({ length: 11 }, () => '550e8400-e29b-41d4-a716-446655440000');
		const result = createTradeSchema.safeParse({
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {
				cards: tooManyCards,
				gidouilles: 0
			}
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Maximum 10 cartes peuvent être offertes');
		}
	});

	test('validates gidouilles bounds', () => {
		// Negative
		let result = createTradeSchema.safeParse({
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {
				cards: [],
				gidouilles: -1
			}
		});
		expect(result.success).toBe(false);

		// Above max
		result = createTradeSchema.safeParse({
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {
				cards: [],
				gidouilles: 10001
			}
		});
		expect(result.success).toBe(false);
	});

	test('applies defaults in initial offer', () => {
		const data = {
			partner_id: '550e8400-e29b-41d4-a716-446655440000',
			initial_offer: {}
		};

		const result = createTradeSchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.initial_offer.cards).toEqual([]);
			expect(result.data.initial_offer.gidouilles).toBe(0);
		}
	});
});

describe('createOfferSchema', () => {
	test('validates valid counter-offer', () => {
		const data = {
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			initiator_cards: ['550e8400-e29b-41d4-a716-446655440001'],
			initiator_gidouilles: 100,
			partner_cards: ['550e8400-e29b-41d4-a716-446655440002'],
			partner_gidouilles: 200,
			message: 'How about this instead?'
		};

		const result = createOfferSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('validates card limits for both sides', () => {
		const tooManyCards = Array.from({ length: 11 }, () => '550e8400-e29b-41d4-a716-446655440000');

		// Too many initiator cards
		let result = createOfferSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			initiator_cards: tooManyCards,
			partner_cards: []
		});
		expect(result.success).toBe(false);

		// Too many partner cards
		result = createOfferSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			initiator_cards: [],
			partner_cards: tooManyCards
		});
		expect(result.success).toBe(false);
	});

	test('validates gidouilles bounds for both sides', () => {
		// Negative initiator gidouilles
		let result = createOfferSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			initiator_gidouilles: -1
		});
		expect(result.success).toBe(false);

		// Above max partner gidouilles
		result = createOfferSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			partner_gidouilles: 10001
		});
		expect(result.success).toBe(false);
	});

	test('allows empty offers', () => {
		const result = createOfferSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000'
			// All other fields will use defaults
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.initiator_cards).toEqual([]);
			expect(result.data.initiator_gidouilles).toBe(0);
			expect(result.data.partner_cards).toEqual([]);
			expect(result.data.partner_gidouilles).toBe(0);
		}
	});
});

describe('acceptTradeSchema', () => {
	test('validates valid trade acceptance', () => {
		const result = acceptTradeSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
	});

	test('rejects invalid UUID', () => {
		const result = acceptTradeSchema.safeParse({
			trade_id: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe("ID d'échange invalide");
		}
	});

	test('requires trade_id', () => {
		const result = acceptTradeSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

describe('updateConfigSchema', () => {
	test('validates all config updates', () => {
		const data = {
			enabled_for_class: true,
			max_listings_per_student: 5,
			max_trades_per_day: 10
		};

		const result = updateConfigSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('allows partial updates', () => {
		const result = updateConfigSchema.safeParse({
			enabled_for_class: false
		});
		expect(result.success).toBe(true);
	});

	test('validates max_listings_per_student bounds', () => {
		// Below minimum
		let result = updateConfigSchema.safeParse({ max_listings_per_student: 0 });
		expect(result.success).toBe(false);

		// Above maximum
		result = updateConfigSchema.safeParse({ max_listings_per_student: 11 });
		expect(result.success).toBe(false);

		// Non-integer
		result = updateConfigSchema.safeParse({ max_listings_per_student: 5.5 });
		expect(result.success).toBe(false);
	});

	test('validates max_trades_per_day bounds', () => {
		// Below minimum
		let result = updateConfigSchema.safeParse({ max_trades_per_day: 0 });
		expect(result.success).toBe(false);

		// Above maximum
		result = updateConfigSchema.safeParse({ max_trades_per_day: 21 });
		expect(result.success).toBe(false);

		// Infinity
		result = updateConfigSchema.safeParse({ max_trades_per_day: Infinity });
		expect(result.success).toBe(false);
	});

	test('allows empty update', () => {
		const result = updateConfigSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

describe('chatMessageSchema', () => {
	test('validates valid chat message', () => {
		const data = {
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			message: 'What do you think about this offer?'
		};

		const result = chatMessageSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	test('rejects empty message', () => {
		const result = chatMessageSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			message: ''
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Le message ne peut pas être vide');
		}
	});

	test('validates message length limit', () => {
		const longMessage = 'A'.repeat(501);
		const result = chatMessageSchema.safeParse({
			trade_id: '550e8400-e29b-41d4-a716-446655440000',
			message: longMessage
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Le message ne peut pas dépasser 500 caractères');
		}
	});

	test('validates trade_id format', () => {
		const result = chatMessageSchema.safeParse({
			trade_id: 'invalid-uuid',
			message: 'Test message'
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

describe('adminTradesQuerySchema', () => {
	test('validates full query with all parameters', () => {
		const data = {
			class_id: '550e8400-e29b-41d4-a716-446655440000',
			student_id: '550e8400-e29b-41d4-a716-446655440001',
			status: 'completed',
			date_from: '2024-01-01T00:00:00Z',
			date_to: '2024-12-31T23:59:59Z',
			page: '2',
			limit: '50'
		};

		const result = adminTradesQuerySchema.safeParse(data);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(2);
			expect(result.data.limit).toBe(50);
			expect(result.data.status).toBe('completed');
		}
	});

	test('applies pagination defaults', () => {
		const result = adminTradesQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(1);
			expect(result.data.limit).toBe(50);
		}
	});

	test('validates status enum', () => {
		const validStatuses = ['negotiating', 'completed', 'cancelled'];
		for (const status of validStatuses) {
			const result = adminTradesQuerySchema.safeParse({ status });
			expect(result.success).toBe(true);
		}

		const result = adminTradesQuerySchema.safeParse({ status: 'invalid' });
		expect(result.success).toBe(false);
	});

	test('validates datetime format', () => {
		// Valid ISO datetime
		let result = adminTradesQuerySchema.safeParse({
			date_from: '2024-01-01T00:00:00Z'
		});
		expect(result.success).toBe(true);

		// Invalid datetime
		result = adminTradesQuerySchema.safeParse({
			date_from: '2024-01-01'
		});
		expect(result.success).toBe(false);
	});

	test('validates admin-specific higher limit', () => {
		// Up to 100 for admin
		let result = adminTradesQuerySchema.safeParse({ limit: '100' });
		expect(result.success).toBe(true);

		// Above 100
		result = adminTradesQuerySchema.safeParse({ limit: '101' });
		expect(result.success).toBe(false);
	});
});

describe('adminStatsQuerySchema', () => {
	test('validates period enum', () => {
		const validPeriods = ['day', 'week', 'month'];
		for (const period of validPeriods) {
			const result = adminStatsQuerySchema.safeParse({ period });
			expect(result.success).toBe(true);
		}
	});

	test('applies default period', () => {
		const result = adminStatsQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.period).toBe('week');
		}
	});

	test('validates optional class_id', () => {
		const result = adminStatsQuerySchema.safeParse({
			class_id: '550e8400-e29b-41d4-a716-446655440000',
			period: 'month'
		});
		expect(result.success).toBe(true);
	});

	test('rejects invalid period', () => {
		const result = adminStatsQuerySchema.safeParse({
			period: 'year'
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// EDGE CASES & SPECIAL SCENARIOS
// ============================================================================

describe('Edge cases and special scenarios', () => {
	test('handles null vs undefined correctly', () => {
		// Most fields should treat null as invalid
		const dataWithNull = {
			listing_type: 'sell',
			title: null, // Should fail
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000']
		};
		let result = createListingSchema.safeParse(dataWithNull);
		expect(result.success).toBe(false);

		// Undefined should use defaults or be optional
		const dataWithUndefined = {
			listing_type: 'sell',
			title: 'Valid title',
			description: undefined, // Should be fine (optional)
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000']
		};
		result = createListingSchema.safeParse(dataWithUndefined);
		expect(result.success).toBe(true);
	});

	test('handles malformed JSON input gracefully', () => {
		// Missing required fields
		let result = createListingSchema.safeParse({});
		expect(result.success).toBe(false);

		// Wrong types
		result = createListingSchema.safeParse({
			listing_type: 123, // Should be string
			title: true, // Should be string
			offered_card_ids: 'not-an-array' // Should be array
		});
		expect(result.success).toBe(false);
	});

	test('validates deeply nested refinements', () => {
		// Test complex refinement logic
		const sellWithNothing = {
			listing_type: 'sell',
			title: 'Invalid',
			offered_card_ids: [],
			offered_gidouilles: 0
		};
		let result = createListingSchema.safeParse(sellWithNothing);
		expect(result.success).toBe(false);

		const buyWithNothing = {
			listing_type: 'buy',
			title: 'Invalid',
			wanted_card_template_ids: [],
			wanted_gidouilles: 0
		};
		result = createListingSchema.safeParse(buyWithNothing);
		expect(result.success).toBe(false);
	});

	test('handles special number values correctly', () => {
		// NaN
		let result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'Test',
			offered_gidouilles: NaN,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000']
		});
		expect(result.success).toBe(false);

		// -0 (should be treated as 0)
		result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'Test',
			offered_gidouilles: -0,
			offered_card_ids: ['550e8400-e29b-41d4-a716-446655440000']
		});
		expect(result.success).toBe(true);
		if (result.success) {
			// Check numeric value without distinguishing -0 from +0
			expect(result.data.offered_gidouilles === 0).toBe(true);
		}
	});

	test('validates UUID case sensitivity', () => {
		// UUIDs should be case-insensitive
		const upperCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
		const lowerCaseUUID = '550e8400-e29b-41d4-a716-446655440000';
		const mixedCaseUUID = '550e8400-E29B-41d4-A716-446655440000';

		for (const uuid of [upperCaseUUID, lowerCaseUUID, mixedCaseUUID]) {
			const result = createProposalSchema.safeParse({
				listing_id: uuid,
				offered_gidouilles: 100
			});
			expect(result.success).toBe(true);
		}
	});
});
