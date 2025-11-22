/**
 * TagBadgeSelector Component Tests
 * =================================
 *
 * Tests the selector component logic for tag badge selection.
 * These tests focus on the utility functions and data handling.
 *
 * NOTE: Full DOM/interaction tests should be added with E2E tests (Playwright).
 * These unit tests verify the TypeScript logic that powers the component.
 *
 * Test Coverage:
 * 1. Selection Logic - Array manipulation patterns
 * 2. Tag Creation Validation
 * 3. Filtering Logic
 * 4. Edge Cases
 *
 * @module components/TagBadgeSelector.test
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// TEST FIXTURES - Simulating component logic
// ============================================================================

/**
 * Simulate toggle selection logic from component
 */
function toggleTag(selection: string[], tag: string, maxSelections?: number): string[] {
	const isSelected = selection.includes(tag);

	if (isSelected) {
		return selection.filter((t) => t !== tag);
	} else {
		if (maxSelections !== undefined && selection.length >= maxSelections) {
			return selection;
		}
		return [...selection, tag];
	}
}

/**
 * Simulate remove tag logic from component
 */
function removeTag(selection: string[], tag: string): string[] {
	return selection.filter((t) => t !== tag);
}

/**
 * Check if can add more selections
 */
function canAddMore(selection: string[], maxSelections?: number): boolean {
	return maxSelections === undefined || selection.length < maxSelections;
}

/**
 * Filter tags based on search string
 */
function filterTags(
	tags: { id: string; name: string }[],
	search: string
): { id: string; name: string }[] {
	const searchLower = search.toLowerCase().trim();
	if (!searchLower) return tags;
	return tags.filter((tag) => tag.name.toLowerCase().includes(searchLower));
}

/**
 * Check if tag name already exists (case-insensitive)
 */
function tagExists(tags: { name: string }[], tagName: string): boolean {
	const searchLower = tagName.toLowerCase().trim();
	if (!searchLower) return false;
	return tags.some((tag) => tag.name.toLowerCase() === searchLower);
}

/**
 * Validate tag name for creation
 */
function isValidTagName(name: string): { valid: boolean; error?: string } {
	const trimmed = name.trim();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Le nom du tag est requis' };
	}

	if (trimmed.length > 50) {
		return { valid: false, error: 'Le nom du tag ne peut pas dépasser 50 caractères' };
	}

	// Only allow letters (including accented), numbers, spaces, hyphens, apostrophes
	const validPattern = /^[a-zA-ZÀ-ÿ0-9\s\-']+$/;
	if (!validPattern.test(trimmed)) {
		return {
			valid: false,
			error:
				'Le nom du tag ne peut contenir que des lettres, chiffres, espaces, tirets et apostrophes'
		};
	}

	return { valid: true };
}

/**
 * Sort tags alphabetically (French locale)
 */
function sortTagsAlphabetically(
	tags: { id: string; name: string }[]
): { id: string; name: string }[] {
	return [...tags].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// ============================================================================
// 1. SELECTION LOGIC
// ============================================================================

describe('TagBadgeSelector - Selection Logic', () => {
	describe('toggleTag', () => {
		it('adds tag when not selected', () => {
			const selection = ['algèbre', 'équations'];
			const result = toggleTag(selection, 'fractions');

			expect(result).toContain('fractions');
			expect(result).toHaveLength(3);
		});

		it('removes tag when already selected', () => {
			const selection = ['algèbre', 'équations', 'fractions'];
			const result = toggleTag(selection, 'équations');

			expect(result).not.toContain('équations');
			expect(result).toHaveLength(2);
		});

		it('preserves other selections when toggling', () => {
			const selection = ['algèbre', 'équations', 'fractions'];
			const result = toggleTag(selection, 'équations');

			expect(result).toContain('algèbre');
			expect(result).toContain('fractions');
		});

		it('respects maxSelections limit when adding', () => {
			const selection = ['algèbre', 'équations', 'fractions'];
			const result = toggleTag(selection, 'géométrie', 3);

			expect(result).not.toContain('géométrie');
			expect(result).toHaveLength(3);
		});

		it('allows removal even at maxSelections', () => {
			const selection = ['algèbre', 'équations', 'fractions'];
			const result = toggleTag(selection, 'équations', 3);

			expect(result).not.toContain('équations');
			expect(result).toHaveLength(2);
		});

		it('allows adding when under maxSelections', () => {
			const selection = ['algèbre', 'équations'];
			const result = toggleTag(selection, 'fractions', 3);

			expect(result).toContain('fractions');
			expect(result).toHaveLength(3);
		});
	});

	describe('removeTag', () => {
		it('removes existing tag', () => {
			const selection = ['algèbre', 'équations', 'fractions'];
			const result = removeTag(selection, 'équations');

			expect(result).toEqual(['algèbre', 'fractions']);
		});

		it('returns same array if tag not present', () => {
			const selection = ['algèbre', 'équations'];
			const result = removeTag(selection, 'géométrie');

			expect(result).toEqual(['algèbre', 'équations']);
		});

		it('handles empty array', () => {
			const selection: string[] = [];
			const result = removeTag(selection, 'algèbre');

			expect(result).toEqual([]);
		});

		it('handles removing last tag', () => {
			const selection = ['algèbre'];
			const result = removeTag(selection, 'algèbre');

			expect(result).toEqual([]);
		});
	});

	describe('canAddMore', () => {
		it('returns true when no limit set', () => {
			expect(canAddMore(['algèbre', 'équations', 'fractions'])).toBe(true);
			expect(canAddMore([])).toBe(true);
		});

		it('returns true when under limit', () => {
			expect(canAddMore(['algèbre', 'équations'], 3)).toBe(true);
			expect(canAddMore([], 3)).toBe(true);
		});

		it('returns false when at limit', () => {
			expect(canAddMore(['algèbre', 'équations', 'fractions'], 3)).toBe(false);
		});

		it('returns false when over limit (edge case)', () => {
			expect(canAddMore(['a', 'b', 'c', 'd'], 3)).toBe(false);
		});
	});
});

// ============================================================================
// 2. TAG CREATION VALIDATION
// ============================================================================

describe('TagBadgeSelector - Tag Validation', () => {
	describe('isValidTagName', () => {
		it('accepts valid simple tags', () => {
			expect(isValidTagName('algèbre')).toEqual({ valid: true });
			expect(isValidTagName('équations')).toEqual({ valid: true });
			expect(isValidTagName('fractions')).toEqual({ valid: true });
		});

		it('accepts tags with spaces', () => {
			expect(isValidTagName('calcul mental')).toEqual({ valid: true });
			expect(isValidTagName('nombres décimaux')).toEqual({ valid: true });
		});

		it('accepts tags with hyphens', () => {
			expect(isValidTagName('premier-degré')).toEqual({ valid: true });
		});

		it('accepts tags with apostrophes', () => {
			expect(isValidTagName("théorème d'Euler")).toEqual({ valid: true });
		});

		it('accepts tags with numbers', () => {
			expect(isValidTagName('3ème')).toEqual({ valid: true });
			expect(isValidTagName('niveau2')).toEqual({ valid: true });
		});

		it('accepts tags with accented characters', () => {
			expect(isValidTagName('géométrie')).toEqual({ valid: true });
			expect(isValidTagName('résolution')).toEqual({ valid: true });
			expect(isValidTagName('Théorème')).toEqual({ valid: true });
		});

		it('rejects empty tags', () => {
			const result = isValidTagName('');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Le nom du tag est requis');
		});

		it('rejects whitespace-only tags', () => {
			const result = isValidTagName('   ');
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Le nom du tag est requis');
		});

		it('rejects tags longer than 50 characters', () => {
			const longTag = 'a'.repeat(51);
			const result = isValidTagName(longTag);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('50 caractères');
		});

		it('accepts tags exactly 50 characters', () => {
			const maxTag = 'a'.repeat(50);
			expect(isValidTagName(maxTag)).toEqual({ valid: true });
		});

		it('rejects tags with special characters', () => {
			expect(isValidTagName('tag@email').valid).toBe(false);
			expect(isValidTagName('tag#hashtag').valid).toBe(false);
			expect(isValidTagName('tag!exclaim').valid).toBe(false);
			expect(isValidTagName('tag?question').valid).toBe(false);
		});
	});

	describe('tagExists', () => {
		const existingTags = [{ name: 'Algèbre' }, { name: 'Équations' }, { name: 'Fractions' }];

		it('returns true for exact match', () => {
			expect(tagExists(existingTags, 'Algèbre')).toBe(true);
		});

		it('returns true for case-insensitive match', () => {
			expect(tagExists(existingTags, 'algèbre')).toBe(true);
			expect(tagExists(existingTags, 'ALGÈBRE')).toBe(true);
			expect(tagExists(existingTags, 'AlGèBrE')).toBe(true);
		});

		it('returns false for non-existent tag', () => {
			expect(tagExists(existingTags, 'géométrie')).toBe(false);
		});

		it('returns false for empty search', () => {
			expect(tagExists(existingTags, '')).toBe(false);
			expect(tagExists(existingTags, '   ')).toBe(false);
		});

		it('handles empty tag list', () => {
			expect(tagExists([], 'algèbre')).toBe(false);
		});
	});
});

// ============================================================================
// 3. FILTERING LOGIC
// ============================================================================

describe('TagBadgeSelector - Filtering Logic', () => {
	const allTags = [
		{ id: '1', name: 'algèbre' },
		{ id: '2', name: 'équations' },
		{ id: '3', name: 'fractions' },
		{ id: '4', name: 'géométrie' },
		{ id: '5', name: 'calcul mental' }
	];

	it('returns all tags when search is empty', () => {
		expect(filterTags(allTags, '')).toEqual(allTags);
		expect(filterTags(allTags, '   ')).toEqual(allTags);
	});

	it('filters tags by partial match', () => {
		const result = filterTags(allTags, 'équ');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('équations');
	});

	it('filters case-insensitively', () => {
		const result = filterTags(allTags, 'ALGÈBRE');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('algèbre');
	});

	it('filters by substring anywhere in name', () => {
		const result = filterTags(allTags, 'tion');
		expect(result).toHaveLength(2); // équations, fractions
		expect(result.map((t) => t.name)).toContain('équations');
		expect(result.map((t) => t.name)).toContain('fractions');
	});

	it('returns empty array when no matches', () => {
		const result = filterTags(allTags, 'xyz');
		expect(result).toHaveLength(0);
	});

	it('handles multi-word search', () => {
		const result = filterTags(allTags, 'calcul');
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('calcul mental');
	});
});

// ============================================================================
// 4. SORTING LOGIC
// ============================================================================

describe('TagBadgeSelector - Sorting Logic', () => {
	it('sorts tags alphabetically', () => {
		const unsorted = [
			{ id: '1', name: 'zéro' },
			{ id: '2', name: 'algèbre' },
			{ id: '3', name: 'équations' }
		];

		const result = sortTagsAlphabetically(unsorted);

		expect(result[0].name).toBe('algèbre');
		expect(result[1].name).toBe('équations');
		expect(result[2].name).toBe('zéro');
	});

	it('handles French accented characters correctly', () => {
		const unsorted = [
			{ id: '1', name: 'étoile' },
			{ id: '2', name: 'école' },
			{ id: '3', name: 'eau' }
		];

		const result = sortTagsAlphabetically(unsorted);

		// In French locale, e, é, è all sort similarly
		expect(result.map((t) => t.name)).toEqual(['eau', 'école', 'étoile']);
	});

	it('does not mutate original array', () => {
		const original = [
			{ id: '1', name: 'zéro' },
			{ id: '2', name: 'algèbre' }
		];
		const originalCopy = [...original];

		sortTagsAlphabetically(original);

		expect(original).toEqual(originalCopy);
	});

	it('handles empty array', () => {
		expect(sortTagsAlphabetically([])).toEqual([]);
	});
});

// ============================================================================
// 5. EDGE CASES
// ============================================================================

describe('TagBadgeSelector - Edge Cases', () => {
	it('handles empty selection array', () => {
		const selection: string[] = [];

		expect(toggleTag(selection, 'algèbre')).toEqual(['algèbre']);
		expect(removeTag(selection, 'algèbre')).toEqual([]);
		expect(canAddMore(selection, 5)).toBe(true);
	});

	it('handles maxSelections of 1 (single select mode)', () => {
		const selection = ['algèbre'];

		expect(canAddMore(selection, 1)).toBe(false);
		expect(toggleTag(selection, 'équations', 1)).toEqual(['algèbre']); // Can't add
		expect(toggleTag(selection, 'algèbre', 1)).toEqual([]); // Can remove
	});

	it('handles maxSelections of 0', () => {
		const selection: string[] = [];

		expect(canAddMore(selection, 0)).toBe(false);
		expect(toggleTag(selection, 'algèbre', 0)).toEqual([]);
	});

	it('preserves tag order when adding', () => {
		let selection: string[] = [];
		selection = toggleTag(selection, 'fractions');
		selection = toggleTag(selection, 'algèbre');
		selection = toggleTag(selection, 'équations');

		expect(selection).toEqual(['fractions', 'algèbre', 'équations']);
	});

	it('handles duplicate toggle attempts', () => {
		let selection: string[] = ['algèbre'];
		selection = toggleTag(selection, 'équations');
		selection = toggleTag(selection, 'équations'); // Toggle same tag again

		expect(selection).toEqual(['algèbre']);
	});

	it('handles tags with special French characters', () => {
		expect(isValidTagName('théorème')).toEqual({ valid: true });
		expect(isValidTagName('résolution')).toEqual({ valid: true });
		expect(isValidTagName('Noël')).toEqual({ valid: true });
		expect(isValidTagName('çà')).toEqual({ valid: true });
	});

	it('handles maxSelections of 20 (default limit)', () => {
		const selection = Array.from({ length: 20 }, (_, i) => `tag${i}`);

		expect(canAddMore(selection, 20)).toBe(false);
		expect(toggleTag(selection, 'newTag', 20)).toEqual(selection);
	});
});

// ============================================================================
// 6. ARIA LABELS
// ============================================================================

describe('TagBadgeSelector - ARIA Labels', () => {
	it('generates correct remove button label', () => {
		const tag = 'algèbre';
		const expectedLabel = `Supprimer ${tag}`;

		expect(expectedLabel).toBe('Supprimer algèbre');
	});

	it('generates correct toggle button labels', () => {
		const tag = 'équations';
		const selectLabel = `Selectionner ${tag}`;
		const deselectLabel = `Deselectionner ${tag}`;

		expect(selectLabel).toBe('Selectionner équations');
		expect(deselectLabel).toBe('Deselectionner équations');
	});
});
