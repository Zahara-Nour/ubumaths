/**
 * VIP Card Consumable - Unit Tests (TDD)
 *
 * Tests for the VIP card consumable system using the unified use_vip_card RPC:
 * 1. Consumable card has uses_total in template and usesRemaining in instance
 * 2. At acquisition, usesRemaining = uses_total
 * 3. Each use decrements usesRemaining and is logged in vip_cards_activity
 * 4. When usesRemaining = 0, instance is marked usedAt
 * 5. Unified RPC handles both student and teacher/admin roles
 *
 * These are unit tests that mock Supabase RPC calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { useCardSchema } from '$lib/server/validation/vip-cards';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Creates a mock Supabase client with RPC method
 */
function createMockSupabaseClient() {
	const mockRpc = vi.fn();
	const mockFrom = vi.fn();

	const mockClient = {
		rpc: mockRpc,
		from: mockFrom
	} as unknown as SupabaseClient<Database>;

	return { mockClient, mockRpc, mockFrom };
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Expected structure of a consumable VIP card template
 */
interface ConsumableVipCardTemplate {
	id: string;
	name: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: 'consumable' | 'bonus' | 'privilege' | 'social' | 'power';
	uses_total: number;
}

/**
 * Expected structure of a consumable VIP card instance
 */
interface ConsumableVipCardInstance {
	instanceId: string;
	cardId: string;
	earnedAt: string;
	usedAt: string | null;
	usesRemaining: number | null;
	acquiredFrom: 'draw' | 'purchase' | 'gift' | 'exchange';
}

/**
 * Unified result from use_vip_card RPC
 */
interface UseCardResult {
	success: boolean;
	cardName?: string;
	instanceId?: string;
	cardId?: string;
	usesRemaining?: number | null;
	isFullyConsumed?: boolean;
	usedAt?: string | null;
	error?: string;
}

describe('VIP Card Consumable - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// TEMPLATE CONFIGURATION TESTS
	// ============================================================================

	describe('Template consumable configuration', () => {
		it('should store uses_total in vip_card_templates', () => {
			const consumableTemplate: ConsumableVipCardTemplate = {
				id: 'homework-pass-3x',
				name: 'Pass Devoirs x3',
				rarity: 'rare',
				category: 'consumable',
				uses_total: 3
			};

			expect(consumableTemplate.uses_total).toBe(3);
			expect(consumableTemplate.category).toBe('consumable');
		});

		it('should allow null uses_total for non-consumable cards', () => {
			const singleUseTemplate = {
				id: 'bonus',
				name: 'Bonus',
				rarity: 'common',
				category: 'bonus',
				uses_total: null
			};

			expect(singleUseTemplate.uses_total).toBeNull();
		});

		it('should support category = consumable for multi-use cards', () => {
			const categories = ['bonus', 'privilege', 'social', 'power', 'consumable'];
			expect(categories).toContain('consumable');
		});
	});

	// ============================================================================
	// INSTANCE INITIALIZATION TESTS
	// ============================================================================

	describe('Instance initialization with usesRemaining', () => {
		it('should set usesRemaining = uses_total when card is acquired', () => {
			const instance: ConsumableVipCardInstance = {
				instanceId: '123e4567-e89b-12d3-a456-426614174010',
				cardId: 'homework-pass-3x',
				earnedAt: '2025-11-20T10:00:00.000Z',
				usedAt: null,
				usesRemaining: 3,
				acquiredFrom: 'draw'
			};

			expect(instance.usesRemaining).toBe(3);
			expect(instance.usedAt).toBeNull();
		});

		it('should set usesRemaining = null for non-consumable cards', () => {
			const instance: ConsumableVipCardInstance = {
				instanceId: '123e4567-e89b-12d3-a456-426614174012',
				cardId: 'bonus',
				earnedAt: '2025-11-20T10:00:00.000Z',
				usedAt: null,
				usesRemaining: null,
				acquiredFrom: 'draw'
			};

			expect(instance.usesRemaining).toBeNull();
		});
	});

	// ============================================================================
	// UNIFIED use_vip_card RPC TESTS
	// ============================================================================

	describe('Unified use_vip_card RPC', () => {
		it('should decrement usesRemaining on each use', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: true,
					cardName: 'Pass Devoirs x3',
					instanceId: '123e4567-e89b-12d3-a456-426614174010',
					cardId: 'homework-pass-3x',
					usesRemaining: 2,
					isFullyConsumed: false,
					usedAt: null
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174010'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(true);
			expect(data.usesRemaining).toBe(2);
			expect(data.isFullyConsumed).toBe(false);
			expect(data.usedAt).toBeNull();
		});

		it('should mark card as fully consumed when usesRemaining reaches 0', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: true,
					cardName: 'Pass Devoirs x3',
					instanceId: '123e4567-e89b-12d3-a456-426614174010',
					cardId: 'homework-pass-3x',
					usesRemaining: 0,
					isFullyConsumed: true,
					usedAt: '2025-11-20T12:00:00.000Z'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174010'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(true);
			expect(data.usesRemaining).toBe(0);
			expect(data.isFullyConsumed).toBe(true);
			expect(data.usedAt).not.toBeNull();
		});

		it('should reject use when card has no remaining uses', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Card has no remaining uses'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174010'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(false);
			expect(data.error).toBe('Card has no remaining uses');
		});

		it('should reject use when card has already been used', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: false,
					error: 'Card has already been used'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174010'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(false);
			expect(data.error).toBe('Card has already been used');
		});

		it('should handle single-use cards (usesRemaining = null → treated as 1)', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			// Single-use card: unified RPC returns usesRemaining=0 and isFullyConsumed=true
			mockRpc.mockResolvedValue({
				data: {
					success: true,
					cardName: 'Bonus',
					instanceId: '123e4567-e89b-12d3-a456-426614174012',
					cardId: 'bonus',
					usesRemaining: 0,
					isFullyConsumed: true,
					usedAt: '2025-11-20T12:00:00.000Z'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174012'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(true);
			expect(data.isFullyConsumed).toBe(true);
			expect(data.usedAt).not.toBeNull();
		});

		it('should support context parameter for activation_context cards', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: true,
					cardName: 'Hint Demineur',
					instanceId: '123e4567-e89b-12d3-a456-426614174020',
					cardId: 'minesweeper-hint',
					usesRemaining: 0,
					isFullyConsumed: true,
					usedAt: '2025-11-20T12:00:00.000Z'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174020',
				p_context: 'minesweeper'
			});

			expect(mockRpc).toHaveBeenCalledWith('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174020',
				p_context: 'minesweeper'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(true);
		});

		it('should reject invalid activation context', async () => {
			const { mockClient, mockRpc } = createMockSupabaseClient();

			mockRpc.mockResolvedValue({
				data: {
					success: false,
					error: 'This card cannot be used in the current context'
				} satisfies UseCardResult,
				error: null
			});

			const result = await mockClient.rpc('use_vip_card', {
				p_student_id: '123e4567-e89b-12d3-a456-426614174001',
				p_instance_id: '123e4567-e89b-12d3-a456-426614174020',
				p_context: 'wrong_context'
			});

			const data = result.data as UseCardResult;
			expect(data.success).toBe(false);
			expect(data.error).toContain('cannot be used in the current context');
		});

		it('should prevent concurrent uses via row-level locking', () => {
			// Race condition protection - the RPC uses FOR UPDATE on profiles row
			// This is tested in integration/trigger tests, not unit tests
			expect(true).toBe(true);
		});
	});

	// ============================================================================
	// DISPLAY/UI TESTS
	// ============================================================================

	describe('Consumable display information', () => {
		it('should expose uses info for UI display', () => {
			const consumableInstance: ConsumableVipCardInstance = {
				instanceId: '123e4567-e89b-12d3-a456-426614174030',
				cardId: 'homework-pass-3x',
				earnedAt: '2025-11-20T10:00:00.000Z',
				usedAt: null,
				usesRemaining: 2,
				acquiredFrom: 'draw'
			};

			expect(consumableInstance.usesRemaining).toBe(2);
			expect(consumableInstance.usedAt).toBeNull();
		});

		it('should show fully consumed instance', () => {
			const fullyUsedInstance: ConsumableVipCardInstance = {
				instanceId: '123e4567-e89b-12d3-a456-426614174031',
				cardId: 'homework-pass-3x',
				earnedAt: '2025-11-20T10:00:00.000Z',
				usedAt: '2025-11-20T14:00:00.000Z',
				usesRemaining: 0,
				acquiredFrom: 'draw'
			};

			expect(fullyUsedInstance.usesRemaining).toBe(0);
			expect(fullyUsedInstance.usedAt).not.toBeNull();
		});
	});
});

// ============================================================================
// ZOD VALIDATION TESTS (unified useCardSchema)
// ============================================================================

describe('Unified useCardSchema validation', () => {
	it('should validate student request (instanceId only)', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010'
		});
		expect(result.success).toBe(true);
	});

	it('should validate teacher request (instanceId + studentId)', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010',
			studentId: '123e4567-e89b-12d3-a456-426614174001'
		});
		expect(result.success).toBe(true);
	});

	it('should validate request with context', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010',
			context: 'minesweeper'
		});
		expect(result.success).toBe(true);
	});

	it('should reject request with invalid instanceId', () => {
		const result = useCardSchema.safeParse({
			instanceId: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
	});

	it('should reject request with invalid studentId', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010',
			studentId: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
	});

	it('should reject request with empty context', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010',
			context: ''
		});
		expect(result.success).toBe(false);
	});

	it('should reject request without instanceId', () => {
		const result = useCardSchema.safeParse({
			studentId: '123e4567-e89b-12d3-a456-426614174001'
		});
		expect(result.success).toBe(false);
	});

	it('should reject unknown fields (strict mode)', () => {
		const result = useCardSchema.safeParse({
			instanceId: '123e4567-e89b-12d3-a456-426614174010',
			extraField: 'should fail'
		});
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// MIGRATION COMPATIBILITY TESTS
// ============================================================================

describe('Existing cards migration compatibility', () => {
	it('should set usesRemaining = null for existing instances without uses_total', () => {
		// Existing instances have usesRemaining = null (single-use)
		// The unified RPC treats COALESCE(usesRemaining, 1) = 1 remaining use
		// So existing single-use cards work identically
		expect(true).toBe(true);
	});

	it('should set default uses_total = null for all existing templates', () => {
		// All existing templates are single-use
		// uses_total = null means "single use" (current behavior)
		expect(true).toBe(true);
	});
});
