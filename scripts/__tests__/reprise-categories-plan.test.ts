/**
 * Reprise des fiches en prod (`scripts/fiches/reprise-categories-plan.ts`)
 *
 * Nominal : titre composé, titre libre gardé, passage en évaluation.
 * Limites : fiche reprise entre-temps dans l'éditeur → sautée, jamais écrasée.
 * Erreurs : notion inconnue, archivée, branche, catégorie inconnue → sautée.
 */

import { describe, expect, it } from 'vitest';
import {
	type FicheEnBase,
	type NoeudConnu,
	type RepriseReponse,
	planFiche
} from '../fiches/reprise-categories-plan';

// =============================================================================
// Décor
// =============================================================================

const SUITES = '00000000-0000-4000-8000-000000000001';
const ARITH = '00000000-0000-4000-8000-000000000002';
const LOI_GEO = '00000000-0000-4000-8000-000000000003';
const ARCHIVEE = '00000000-0000-4000-8000-000000000004';
const BRANCHE = '00000000-0000-4000-8000-000000000005';
const DERIVATION = '00000000-0000-4000-8000-000000000006';
const FICHE = '00000000-0000-4000-8000-0000000000aa';

const NOEUDS = new Map<string, NoeudConnu>([
	[
		SUITES,
		{ name: 'Généralités sur les suites', kind: 'notion', archived: false, branch: 'Suites' }
	],
	[ARITH, { name: 'Suites arithmétiques', kind: 'notion', archived: false, branch: 'Suites' }],
	[DERIVATION, { name: 'Dérivation', kind: 'notion', archived: false, branch: 'Fonctions' }],
	[
		LOI_GEO,
		{ name: 'loi géométrique', kind: 'subnotion', archived: false, branch: 'Probabilités' }
	],
	[ARCHIVEE, { name: 'Ancienne notion', kind: 'notion', archived: true, branch: 'Suites' }],
	[BRANCHE, { name: 'Suites', kind: 'branch', archived: false, branch: 'Suites' }]
]);

function fiche(champs: Partial<FicheEnBase> = {}): FicheEnBase {
	return {
		id: FICHE,
		title: 'Entraînement technique — Suites',
		type: 'worksheet',
		category: null,
		custom_title: true,
		nombreNotions: 0,
		...champs
	};
}

function reponse(champs: Partial<RepriseReponse> = {}): RepriseReponse {
	return {
		id: FICHE,
		titreActuel: 'Entraînement technique — Suites',
		type: 'worksheet',
		categorie: 'technical_practice',
		notions: [SUITES, ARITH],
		titreLibre: false,
		...champs
	};
}

function raison(plan: ReturnType<typeof planFiche>): string {
	return plan.action === 'sauter' ? plan.raison : 'écrite';
}

// =============================================================================
// Nominal
// =============================================================================

describe('planFiche — nominal', () => {
	it('titre composé, notions d’une même branche : la branche puis la catégorie', () => {
		const plan = planFiche(reponse(), fiche(), NOEUDS);
		expect(plan).toEqual({
			action: 'ecrire',
			id: FICHE,
			avant: fiche(),
			apres: {
				type: 'worksheet',
				category: 'technical_practice',
				custom_title: false,
				title: 'Suites · Entraînement technique',
				notions: [SUITES, ARITH]
			}
		});
	});

	it('notions de branches différentes : les notions dans l’ordre puis la catégorie', () => {
		const plan = planFiche(reponse({ notions: [DERIVATION, SUITES] }), fiche(), NOEUDS);
		expect(plan.action === 'ecrire' && plan.apres.title).toBe(
			'Dérivation · Généralités sur les suites · Entraînement technique'
		);
	});

	it('sous-notion en minuscule : majuscule dans le titre composé', () => {
		const plan = planFiche(
			reponse({ notions: [LOI_GEO], categorie: 'applications' }),
			fiche(),
			NOEUDS
		);
		expect(plan.action === 'ecrire' && plan.apres.title).toBe('Loi géométrique · Applications');
	});

	it('titre libre gardé : le titre ne change pas, la catégorie est posée', () => {
		const plan = planFiche(
			reponse({ titreLibre: true, categorie: 'automatisms' }),
			fiche(),
			NOEUDS
		);
		expect(plan.action === 'ecrire' && plan.apres).toMatchObject({
			title: 'Entraînement technique — Suites',
			custom_title: true,
			category: 'automatisms'
		});
	});

	it('passage en évaluation : ni catégorie ni titre composé, notions gardées', () => {
		const plan = planFiche(
			reponse({ type: 'assessment', categorie: 'review', titreLibre: false }),
			fiche(),
			NOEUDS
		);
		expect(plan.action === 'ecrire' && plan.apres).toEqual({
			type: 'assessment',
			category: null,
			custom_title: true,
			title: 'Entraînement technique — Suites',
			notions: [SUITES, ARITH]
		});
	});
});

// =============================================================================
// Limites : la fiche a changé depuis le relevé
// =============================================================================

describe('planFiche — fiche reprise entre-temps', () => {
	it('titre changé → sautée', () => {
		expect(raison(planFiche(reponse(), fiche({ title: 'Suites (nouvelle)' }), NOEUDS))).toMatch(
			/titre changé/
		);
	});

	it('catégorie déjà posée → sautée', () => {
		expect(raison(planFiche(reponse(), fiche({ category: 'applications' }), NOEUDS))).toMatch(
			/déjà posées/
		);
	});

	it('notions déjà posées → sautée', () => {
		expect(raison(planFiche(reponse(), fiche({ nombreNotions: 1 }), NOEUDS))).toMatch(
			/déjà posées/
		);
	});

	it('fiche disparue → sautée', () => {
		expect(raison(planFiche(reponse(), undefined, NOEUDS))).toMatch(/introuvable/);
	});
});

// =============================================================================
// Erreurs dans la réponse
// =============================================================================

describe('planFiche — réponse invalide', () => {
	it.each([
		['notion inconnue', { notions: ['00000000-0000-4000-8000-0000000000ff'] }, /inconnue/],
		['notion archivée', { notions: [ARCHIVEE] }, /archivée/],
		['branche', { notions: [BRANCHE] }, /n’est pas une notion/],
		['notion en double', { notions: [SUITES, SUITES] }, /double/],
		['catégorie inconnue', { categorie: 'exam' }, /catégorie inconnue/],
		['titre composé vide', { categorie: null, notions: [] }, /vide/]
	])('%s → sautée', (_nom, champs, attendu) => {
		expect(raison(planFiche(reponse(champs), fiche(), NOEUDS))).toMatch(attendu);
	});
});
