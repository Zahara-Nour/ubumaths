/**
 * Figures géométriques stockées — schémas d'entrée (ADR 0027).
 *
 * Les bornes doivent être celles de la table : un titre de 201 caractères refusé
 * ici, c'est un message en français au lieu d'une erreur de contrainte.
 */
import { describe, it, expect } from 'vitest';
import {
	figureIdSchema,
	figureInputSchema,
	parseFigureFormData,
	parseFigureListFilters,
	FIGURE_SCRIPT_MAX
} from '../geometry-figures';

const VALID = {
	title: '  Flocon de Koch  ',
	description: 'Quatre étapes',
	dsl_script: 'A = point(0, 0)',
	grades: ['T_SPE', '1_SPE'],
	is_public: true,
	tags: ['fractales', 'suites']
};

function issue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
	return result.success ? null : result.error?.issues[0].message;
}

describe('figureInputSchema', () => {
	it('accepte une figure complète et rogne le titre', () => {
		const result = figureInputSchema.safeParse(VALID);
		expect(result.success).toBe(true);
		expect(result.data?.title).toBe('Flocon de Koch');
	});

	it('accepte aucun niveau, aucun tag, et une description absente', () => {
		const result = figureInputSchema.safeParse({
			...VALID,
			grades: [],
			tags: [],
			description: null
		});
		expect(result.success).toBe(true);
	});

	it('une description vide (ou d’espaces) devient null', () => {
		expect(figureInputSchema.safeParse({ ...VALID, description: '   ' }).data?.description).toBe(
			null
		);
	});

	it('titre : 200 caractères acceptés, 201 refusés, vide refusé', () => {
		expect(figureInputSchema.safeParse({ ...VALID, title: 'a'.repeat(200) }).success).toBe(true);
		expect(issue(figureInputSchema.safeParse({ ...VALID, title: 'a'.repeat(201) }))).toMatch(/200/);
		expect(issue(figureInputSchema.safeParse({ ...VALID, title: '   ' }))).toBe(
			'Le titre est requis'
		);
	});

	it('description : 2000 caractères acceptés, 2001 refusés', () => {
		expect(figureInputSchema.safeParse({ ...VALID, description: 'd'.repeat(2000) }).success).toBe(
			true
		);
		expect(figureInputSchema.safeParse({ ...VALID, description: 'd'.repeat(2001) }).success).toBe(
			false
		);
	});

	it('script : 100 000 caractères acceptés (le flocon en fait 77 000), au-delà refusé', () => {
		expect(
			figureInputSchema.safeParse({ ...VALID, dsl_script: 'x'.repeat(FIGURE_SCRIPT_MAX) }).success
		).toBe(true);
		expect(
			figureInputSchema.safeParse({ ...VALID, dsl_script: 'x'.repeat(FIGURE_SCRIPT_MAX + 1) })
				.success
		).toBe(false);
	});

	it('script vide ou fait d’espaces : refusé', () => {
		expect(issue(figureInputSchema.safeParse({ ...VALID, dsl_script: '' }))).toBe(
			'Le script est vide'
		);
		expect(issue(figureInputSchema.safeParse({ ...VALID, dsl_script: ' \n ' }))).toBe(
			'Le script est vide'
		);
	});

	it('niveaux : un code inconnu ou un doublon est refusé', () => {
		expect(figureInputSchema.safeParse({ ...VALID, grades: ['TS'] }).success).toBe(false);
		expect(issue(figureInputSchema.safeParse({ ...VALID, grades: ['6', '6'] }))).toBe(
			'Un niveau est en double'
		);
	});

	it('tags : 20 au maximum, dédoublonnés, un tag vide refusé', () => {
		const many = Array.from({ length: 21 }, (_, i) => `t${i}`);
		expect(figureInputSchema.safeParse({ ...VALID, tags: many }).success).toBe(false);
		expect(figureInputSchema.safeParse({ ...VALID, tags: ['a', 'a'] }).data?.tags).toEqual(['a']);
		expect(figureInputSchema.safeParse({ ...VALID, tags: [' '] }).success).toBe(false);
	});

	it('is_public doit être un booléen', () => {
		expect(figureInputSchema.safeParse({ ...VALID, is_public: 'true' }).success).toBe(false);
	});
});

describe('figureIdSchema', () => {
	it('accepte un UUID, refuse le reste', () => {
		expect(figureIdSchema.safeParse('1a2b3c4d-1111-4111-8111-111111111111').success).toBe(true);
		expect(figureIdSchema.safeParse('nouvelle').success).toBe(false);
	});
});

describe('parseFigureListFilters', () => {
	it('sans paramètre : aucun filtre', () => {
		const result = parseFigureListFilters(new URLSearchParams());
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ tags: [] });
	});

	it('lit niveau, tags répétés, texte et portée', () => {
		const result = parseFigureListFilters(
			new URLSearchParams('grade=6&tag=aires&tag=périmètres&q=%20carré%20&scope=mine')
		);
		expect(result.data).toEqual({
			grade: '6',
			tags: ['aires', 'périmètres'],
			q: 'carré',
			scope: 'mine'
		});
	});

	it('ignore les paramètres vides envoyés par un formulaire GET', () => {
		const result = parseFigureListFilters(new URLSearchParams('grade=&q=&scope=&tag='));
		expect(result.data).toEqual({ tags: [] });
	});

	it('refuse un niveau inconnu, une portée inconnue, un texte de plus de 100 caractères', () => {
		expect(parseFigureListFilters(new URLSearchParams('grade=TS')).success).toBe(false);
		expect(parseFigureListFilters(new URLSearchParams('scope=all')).success).toBe(false);
		expect(parseFigureListFilters(new URLSearchParams(`q=${'a'.repeat(101)}`)).success).toBe(false);
	});
});

describe('parseFigureFormData', () => {
	function form(entries: Record<string, string>): FormData {
		const data = new FormData();
		for (const [key, value] of Object.entries(entries)) data.set(key, value);
		return data;
	}

	const FIELDS = {
		title: 'Carré',
		description: '',
		dsl_script: 'A = point(0, 0)',
		grades: '["6"]',
		tags: '["aires"]',
		is_public: 'true'
	};

	it('lit le formulaire complet', () => {
		expect(parseFigureFormData(form(FIELDS)).data).toEqual({
			title: 'Carré',
			description: null,
			dsl_script: 'A = point(0, 0)',
			grades: ['6'],
			tags: ['aires'],
			is_public: true
		});
	});

	it('refuse un JSON illisible, une case publique absente, un niveau inconnu', () => {
		expect(parseFigureFormData(form({ ...FIELDS, grades: '[6' })).success).toBe(false);
		expect(parseFigureFormData(form({ ...FIELDS, is_public: 'oui' })).success).toBe(false);
		expect(parseFigureFormData(form({ ...FIELDS, grades: '["TS"]' })).success).toBe(false);
	});

	it('refuse un champ JSON démesuré sans le lire', () => {
		const huge = JSON.stringify(Array.from({ length: 3000 }, () => 'aires'));
		expect(parseFigureFormData(form({ ...FIELDS, tags: huge })).success).toBe(false);
	});
});
