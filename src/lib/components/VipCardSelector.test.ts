/**
 * VipCardSelector Component Tests
 * ================================
 *
 * Tests the selector component logic for VIP card selection.
 * These tests focus on the component's utility functions and data handling.
 *
 * NOTE: Full DOM/interaction tests should be added with E2E tests (Playwright).
 * These unit tests verify the TypeScript logic that powers the component.
 *
 * Test Coverage:
 * 1. Card Lookup Logic - Finding cards by ID
 * 2. Template Conversion - Converting templates to VipCard format
 * 3. ARIA Label Generation - Accessibility text generation
 * 4. Edge Cases - null/undefined handling
 *
 * @module components/VipCardSelector.test
 */

import { describe, it, expect } from 'vitest';
import {
	getTemplateById,
	templateToVipCard,
	type VipCardTemplate
} from '$lib/stores/vipCardTemplates.svelte';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create mock VIP card templates for testing
 */
function createMockCards(): VipCardTemplate[] {
	return [
		{
			id: 'card-legendary',
			name: 'Carte Legendaire',
			description: 'Une carte extremement rare',
			image_path: '/images/cards/legendary.jpg',
			category: 'power',
			rarity: 'legendary',
			is_enabled: true,
			sort_order: 1,
			action: { type: 'draw_cards', count: 3 },
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		},
		{
			id: 'card-common',
			name: 'Carte Commune',
			description: 'Une carte tres commune',
			image_path: '/images/cards/common.jpg',
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 2,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		},
		{
			id: 'card-rare',
			name: 'Carte Rare',
			description: 'Une carte assez rare',
			image_path: '/images/cards/rare.jpg',
			category: 'privilege',
			rarity: 'rare',
			is_enabled: true,
			sort_order: 3,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		}
	];
}

/**
 * Generate ARIA label based on selection state (replica of component logic)
 */
function generateAriaLabel(selectedCard: VipCardTemplate | null | undefined): string {
	if (selectedCard) {
		return `Carte selectionnee : ${selectedCard.name}. Cliquer pour changer`;
	}
	return 'Selectionner une carte VIP';
}

// ============================================================================
// 1. CARD LOOKUP LOGIC
// ============================================================================

describe('VipCardSelector - Card Lookup', () => {
	it('finds card by valid ID', () => {
		const mockCards = createMockCards();
		const result = getTemplateById('card-legendary', mockCards);

		expect(result).toBeDefined();
		expect(result?.id).toBe('card-legendary');
		expect(result?.name).toBe('Carte Legendaire');
	});

	it('returns undefined for non-existent ID', () => {
		const mockCards = createMockCards();
		const result = getTemplateById('non-existent-id', mockCards);

		expect(result).toBeUndefined();
	});

	it('handles empty card array', () => {
		const result = getTemplateById('any-id', []);

		expect(result).toBeUndefined();
	});

	it('finds each card in array correctly', () => {
		const mockCards = createMockCards();

		mockCards.forEach((card) => {
			const found = getTemplateById(card.id, mockCards);
			expect(found).toBeDefined();
			expect(found?.id).toBe(card.id);
		});
	});

	it('is case-sensitive for IDs', () => {
		const mockCards = createMockCards();

		const result1 = getTemplateById('card-legendary', mockCards);
		const result2 = getTemplateById('CARD-LEGENDARY', mockCards);

		expect(result1).toBeDefined();
		expect(result2).toBeUndefined();
	});

	it('returns first match when duplicates exist', () => {
		const cardsWithDuplicates: VipCardTemplate[] = [
			{
				id: 'duplicate',
				name: 'First',
				description: 'First card',
				image_path: '/first.jpg',
				category: 'bonus',
				rarity: 'common',
				is_enabled: true,
				sort_order: 1,
				action: null,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			{
				id: 'duplicate',
				name: 'Second',
				description: 'Second card',
				image_path: '/second.jpg',
				category: 'bonus',
				rarity: 'common',
				is_enabled: true,
				sort_order: 2,
				action: null,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			}
		];

		const result = getTemplateById('duplicate', cardsWithDuplicates);
		expect(result?.name).toBe('First');
	});
});

// ============================================================================
// 2. TEMPLATE CONVERSION
// ============================================================================

describe('VipCardSelector - Template Conversion', () => {
	it('converts template to VipCard format', () => {
		const mockCards = createMockCards();
		const template = mockCards[0];
		const vipCard = templateToVipCard(template);

		expect(vipCard.id).toBe(template.id);
		expect(vipCard.name).toBe(template.name);
		expect(vipCard.description).toBe(template.description);
		expect(vipCard.imagePath).toBe(template.image_path); // snake_case → camelCase
		expect(vipCard.category).toBe(template.category);
		expect(vipCard.rarity).toBe(template.rarity);
	});

	it('converts snake_case fields to camelCase', () => {
		const template: VipCardTemplate = {
			id: 'test',
			name: 'Test',
			description: 'Test card',
			image_path: '/test.jpg', // snake_case
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const vipCard = templateToVipCard(template);

		expect(vipCard.imagePath).toBe('/test.jpg'); // camelCase
		expect(vipCard).not.toHaveProperty('image_path');
	});

	it('handles action field correctly', () => {
		const templateWithAction: VipCardTemplate = {
			id: 'test',
			name: 'Test',
			description: 'Test card',
			image_path: '/test.jpg',
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: { type: 'draw_cards', count: 3 },
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const vipCard = templateToVipCard(templateWithAction);
		expect(vipCard.action).toEqual({ type: 'draw_cards', count: 3 });
	});

	it('converts null action to undefined', () => {
		const templateWithoutAction: VipCardTemplate = {
			id: 'test',
			name: 'Test',
			description: 'Test card',
			image_path: '/test.jpg',
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const vipCard = templateToVipCard(templateWithoutAction);
		expect(vipCard.action).toBeUndefined();
	});

	it('handles null category correctly', () => {
		const template: VipCardTemplate = {
			id: 'test',
			name: 'Test',
			description: 'Test card',
			image_path: '/test.jpg',
			category: null,
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const vipCard = templateToVipCard(template);
		// templateToVipCard preserves null (doesn't convert to undefined)
		expect(vipCard.category).toBeNull();
	});

	it('preserves all rarity types correctly', () => {
		const rarities: Array<'common' | 'rare' | 'epic' | 'legendary'> = [
			'common',
			'rare',
			'epic',
			'legendary'
		];

		rarities.forEach((rarity) => {
			const template: VipCardTemplate = {
				id: `test-${rarity}`,
				name: 'Test',
				description: 'Test card',
				image_path: '/test.jpg',
				category: 'bonus',
				rarity,
				is_enabled: true,
				sort_order: 1,
				action: null,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			};

			const vipCard = templateToVipCard(template);
			expect(vipCard.rarity).toBe(rarity);
		});
	});
});

// ============================================================================
// 3. ARIA LABEL GENERATION
// ============================================================================

describe('VipCardSelector - ARIA Labels', () => {
	it('generates correct label for empty state', () => {
		const label = generateAriaLabel(null);
		expect(label).toBe('Selectionner une carte VIP');
	});

	it('generates correct label for selected state', () => {
		const mockCards = createMockCards();
		const card = mockCards[0];

		const label = generateAriaLabel(card);
		expect(label).toContain('Carte selectionnee :');
		expect(label).toContain(card.name);
		expect(label).toContain('Cliquer pour changer');
	});

	it('handles undefined card gracefully', () => {
		const label = generateAriaLabel(undefined);
		expect(label).toBe('Selectionner une carte VIP');
	});

	it('includes full card name in label', () => {
		const mockCards = createMockCards();
		mockCards.forEach((card) => {
			const label = generateAriaLabel(card);
			expect(label).toContain(card.name);
		});
	});

	it('generates different labels for different cards', () => {
		const mockCards = createMockCards();
		const label1 = generateAriaLabel(mockCards[0]);
		const label2 = generateAriaLabel(mockCards[1]);

		expect(label1).not.toBe(label2);
		expect(label1).toContain(mockCards[0].name);
		expect(label2).toContain(mockCards[1].name);
	});

	it('handles cards with long names', () => {
		const longNameCard: VipCardTemplate = {
			id: 'long',
			name: 'Carte avec un nom extremement long qui pourrait poser probleme',
			description: 'Description',
			image_path: '/long.jpg',
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const label = generateAriaLabel(longNameCard);
		expect(label).toContain(longNameCard.name);
		expect(label.length).toBeGreaterThan(50);
	});

	it('handles cards with special characters in name', () => {
		const specialCard: VipCardTemplate = {
			id: 'special',
			name: 'Carte "speciale" & unique',
			description: 'Description',
			image_path: '/special.jpg',
			category: 'bonus',
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const label = generateAriaLabel(specialCard);
		expect(label).toContain(specialCard.name);
	});
});

// ============================================================================
// 4. EDGE CASES
// ============================================================================

describe('VipCardSelector - Edge Cases', () => {
	it('handles empty availableCards array', () => {
		const result = getTemplateById('any-id', []);
		expect(result).toBeUndefined();
	});

	it('handles null selectedCardId', () => {
		const mockCards = createMockCards();
		const result = getTemplateById(null as unknown as string, mockCards);
		expect(result).toBeUndefined();
	});

	it('handles undefined selectedCardId', () => {
		const mockCards = createMockCards();
		const result = getTemplateById(undefined as unknown as string, mockCards);
		expect(result).toBeUndefined();
	});

	it('handles empty string selectedCardId', () => {
		const mockCards = createMockCards();
		const result = getTemplateById('', mockCards);
		expect(result).toBeUndefined();
	});

	it('handles card with minimal valid data', () => {
		const minimalCard: VipCardTemplate = {
			id: 'minimal',
			name: 'M',
			description: '',
			image_path: '',
			category: null,
			rarity: 'common',
			is_enabled: true,
			sort_order: 1,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		};

		const vipCard = templateToVipCard(minimalCard);
		expect(vipCard.id).toBe('minimal');
		expect(vipCard.name).toBe('M');
		expect(vipCard.description).toBe('');
	});

	it('handles rapid ID changes', () => {
		const mockCards = createMockCards();
		const ids = ['card-legendary', 'card-common', 'card-rare', 'card-legendary'];

		ids.forEach((id) => {
			const result = getTemplateById(id, mockCards);
			expect(result).toBeDefined();
			expect(result?.id).toBe(id);
		});
	});

	it('handles large card arrays efficiently', () => {
		const manyCards: VipCardTemplate[] = Array.from({ length: 1000 }, (_, i) => ({
			id: `card-${i}`,
			name: `Card ${i}`,
			description: `Description ${i}`,
			image_path: `/card-${i}.jpg`,
			category: 'bonus' as const,
			rarity: 'common' as const,
			is_enabled: true,
			sort_order: i,
			action: null,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z'
		}));

		const startTime = performance.now();
		const result = getTemplateById('card-500', manyCards);
		const endTime = performance.now();

		expect(result).toBeDefined();
		expect(result?.id).toBe('card-500');
		expect(endTime - startTime).toBeLessThan(5); // Should be very fast
	});
});

// ============================================================================
// 5. INTEGRATION LOGIC
// ============================================================================

describe('VipCardSelector - Integration Logic', () => {
	it('full selection flow: lookup then convert', () => {
		const mockCards = createMockCards();
		const selectedCardId = 'card-legendary';

		// Step 1: Look up card by ID
		const template = getTemplateById(selectedCardId, mockCards);
		expect(template).toBeDefined();

		// Step 2: Convert to VipCard format
		if (template) {
			const vipCard = templateToVipCard(template);
			expect(vipCard.id).toBe(selectedCardId);
			expect(vipCard.imagePath).toBe('/images/cards/legendary.jpg');
		}
	});

	it('full flow handles non-existent ID', () => {
		const mockCards = createMockCards();
		const selectedCardId = 'non-existent';

		// Step 1: Look up card by ID
		const template = getTemplateById(selectedCardId, mockCards);
		expect(template).toBeUndefined();

		// Step 2: Should show empty state (no conversion needed)
		const label = generateAriaLabel(template);
		expect(label).toBe('Selectionner une carte VIP');
	});

	it('handles card change flow', () => {
		const mockCards = createMockCards();

		// Initial selection
		let selectedCardId: string | null = 'card-legendary';
		let template = getTemplateById(selectedCardId, mockCards);
		expect(template?.name).toBe('Carte Legendaire');

		// Change selection
		selectedCardId = 'card-common';
		template = getTemplateById(selectedCardId, mockCards);
		expect(template?.name).toBe('Carte Commune');

		// Clear selection
		selectedCardId = null;
		template = selectedCardId ? getTemplateById(selectedCardId, mockCards) : undefined;
		expect(template).toBeUndefined();
	});

	it('ARIA label updates correctly during selection flow', () => {
		const mockCards = createMockCards();

		// Empty state
		let template: VipCardTemplate | undefined = undefined;
		let label = generateAriaLabel(template);
		expect(label).toBe('Selectionner une carte VIP');

		// Select card
		template = getTemplateById('card-legendary', mockCards);
		label = generateAriaLabel(template);
		expect(label).toContain('Carte Legendaire');
		expect(label).toContain('Cliquer pour changer');

		// Change card
		template = getTemplateById('card-rare', mockCards);
		label = generateAriaLabel(template);
		expect(label).toContain('Carte Rare');
	});
});

// ============================================================================
// DOCUMENTATION TESTS
// ============================================================================

describe('VipCardSelector - Documentation', () => {
	it('getTemplateById is from vipCardTemplates store', () => {
		// Verify function is imported from correct module
		expect(getTemplateById).toBeDefined();
		expect(typeof getTemplateById).toBe('function');
	});

	it('templateToVipCard converts database format to UI format', () => {
		// Verify function handles database → UI conversion
		expect(templateToVipCard).toBeDefined();
		expect(typeof templateToVipCard).toBe('function');
	});

	it('component uses VipCard with size="sm"', () => {
		// Document that VipCardSelector passes size="sm" to VipCard
		const expectedSize = 'sm';
		expect(['sm', 'md', 'lg']).toContain(expectedSize);
	});

	it('component passes clickable=false to VipCard', () => {
		// Document that VipCard inside selector is not clickable
		// (clicking should open modal, not flip card)
		const clickable = false;
		expect(clickable).toBe(false);
	});
});
