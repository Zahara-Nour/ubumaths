/**
 * List Numbering Types
 * ====================
 *
 * Types and constants for configurable list numbering schemes.
 * Used by the markdown renderer to style ordered lists.
 */

export type NumberingStyle = 'numeric' | 'alpha' | 'Alpha' | 'roman' | 'Roman';
export type Separator = ')' | '.' | '()';

export interface NumberingLevel {
	style: NumberingStyle;
	separator: Separator;
}

export interface NumberingScheme {
	id: string;
	name: string;
	levels: NumberingLevel[];
	decimal?: boolean;
}

/**
 * Available numbering schemes.
 * The id is used as CSS class name (with dashes).
 */
export const NUMBERING_SCHEMES: Record<string, NumberingScheme> = {
	'1-a-i': {
		id: '1-a-i',
		name: '1) a) i)',
		levels: [
			{ style: 'numeric', separator: ')' },
			{ style: 'alpha', separator: ')' },
			{ style: 'roman', separator: ')' }
		]
	},
	'a-i': {
		id: 'a-i',
		name: 'a) i)',
		levels: [
			{ style: 'alpha', separator: ')' },
			{ style: 'roman', separator: ')' }
		]
	},
	'1.a.i': {
		id: '1.a.i',
		name: '1. a. i.',
		levels: [
			{ style: 'numeric', separator: '.' },
			{ style: 'alpha', separator: '.' },
			{ style: 'roman', separator: '.' }
		]
	},
	'I.A.1': {
		id: 'I.A.1',
		name: 'I. A. 1.',
		levels: [
			{ style: 'Roman', separator: '.' },
			{ style: 'Alpha', separator: '.' },
			{ style: 'numeric', separator: '.' }
		]
	},
	decimal: {
		id: 'decimal',
		name: '1. 1.1. 1.1.1.',
		decimal: true,
		levels: []
	}
};

export type SchemeId = keyof typeof NUMBERING_SCHEMES;

export interface ListNumberingConfig {
	/** 'auto' for automatic detection, or a specific scheme id */
	scheme: 'auto' | SchemeId;
	/** Scheme to use when nested lists are detected (auto mode) */
	schemeWithNesting: SchemeId;
	/** Scheme to use when no nesting is detected (auto mode) */
	schemeWithoutNesting: SchemeId;
}

export const DEFAULT_CONFIG: ListNumberingConfig = {
	scheme: 'auto',
	schemeWithNesting: '1-a-i',
	schemeWithoutNesting: 'a-i'
};
