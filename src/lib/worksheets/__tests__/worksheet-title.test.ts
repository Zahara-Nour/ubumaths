/**
 * Titre imprimé d'une fiche (ADR 0041, chantier categorie-fiche)
 *
 * Décisions de David (2026-11-19, synthèse de la phase 0) :
 * - fiche d'exercices sans titre libre : les notions en grand (« Suites ·
 *   Dérivation »), la catégorie en petit dessous ; bas de page « Suites ·
 *   Entraînement technique » ;
 * - titre libre (ou titre des autres types) : lui seul en grand, ni notions
 *   ni catégorie dessous (précisé par David le 2026-11-20) ;
 * - amendé le 2026-11-19 (reprise des 50 fiches) : plusieurs notions pour
 *   toute fiche ; chaque notion commence par une majuscule (sous-notions de
 *   l'arbre écrites en minuscule) ;
 * - fiche en anglais : catégorie traduite ; notions et branche sous leur nom
 *   anglais (ADR 0043, chantier notions-en-anglais, 2026-11-23) ; un seul nom
 *   à imprimer sans anglais → la catégorie seule, jamais de mélange ;
 * - amendé le 2026-11-20 : deux notions ou plus d'une même branche → la branche
 *   en titre (« Suites · Entraînement technique ») ; au PDF, la branche en
 *   grand, les notions dessous, la catégorie en petit. Une seule notion garde
 *   son nom ; des notions de branches différentes restent comme avant.
 */
import { describe, expect, it } from 'vitest';
import {
	composedTitle,
	notionLabel,
	printedTitle,
	type PrintedTitleInput,
	type TitleNotion,
	type TitleTreeNode,
	branchOf,
	englishName,
	missingEnglishNames,
	sharedBranch
} from '../worksheet-title';

/** Notions sans branche connue */
function notions(...names: string[]): TitleNotion[] {
	return names.map((name) => ({ name }));
}

/** Les trois notions des suites, toutes de la branche Suites */
const SUITES: TitleNotion[] = [
	{ name: 'Généralités sur les suites', branch: 'Suites' },
	{ name: 'Suites arithmétiques', branch: 'Suites' },
	{ name: 'Suites géométriques', branch: 'Suites' }
];

const base: PrintedTitleInput = {
	type: 'worksheet',
	category: 'technical_practice',
	customTitle: false,
	title: 'Suites · Entraînement technique',
	notions: notions('Suites'),
	locale: 'fr'
};

describe('notionLabel', () => {
	it('majuscule en tête, le reste intact', () => {
		expect(notionLabel('loi géométrique')).toBe('Loi géométrique');
		expect(notionLabel('équations de droites')).toBe('Équations de droites');
		expect(notionLabel('Suites')).toBe('Suites');
		expect(notionLabel('')).toBe('');
	});
});

describe('composedTitle (le titre écrit en base)', () => {
	it('notion puis catégorie', () => {
		expect(composedTitle('technical_practice', notions('Suites'))).toBe(
			'Suites · Entraînement technique'
		);
	});

	it('plusieurs notions, dans l’ordre', () => {
		expect(composedTitle('review', notions('Suites', 'Dérivation'))).toBe(
			'Suites · Dérivation · Révisions'
		);
	});

	it('sous-notion en minuscule : majuscule en tête', () => {
		expect(composedTitle('technical_practice', notions('loi géométrique'))).toBe(
			'Loi géométrique · Entraînement technique'
		);
	});

	it('Entraînement technique à trois notions', () => {
		expect(
			composedTitle(
				'technical_practice',
				notions('Généralités sur les suites', 'Suites arithmétiques', 'Suites géométriques')
			)
		).toBe(
			'Généralités sur les suites · Suites arithmétiques · Suites géométriques · Entraînement technique'
		);
	});

	it('sans notion : la catégorie seule ; sans rien : vide', () => {
		expect(composedTitle('applications', notions())).toBe('Applications');
		expect(composedTitle(null, notions('Suites'))).toBe('Suites');
		expect(composedTitle(null, notions())).toBe('');
	});
});

describe('printedTitle', () => {
	it('une notion, sans titre libre : la notion en grand, la catégorie dessous', () => {
		expect(printedTitle(base)).toEqual({
			main: 'Suites',
			notions: '',
			sub: 'entraînement technique',
			footer: 'Suites · Entraînement technique',
			flat: 'Suites · Entraînement technique'
		});
	});

	it('Automatismes à deux notions : les deux en grand, la catégorie dessous', () => {
		expect(
			printedTitle({ ...base, category: 'automatisms', notions: notions('Suites', 'Dérivation') })
		).toEqual({
			main: 'Suites · Dérivation',
			notions: '',
			sub: 'automatismes',
			footer: 'Suites · Dérivation · Automatismes',
			flat: 'Suites · Dérivation · Automatismes'
		});
	});

	it('sans notion, sans titre libre : la catégorie en grand, rien dessous', () => {
		expect(printedTitle({ ...base, category: 'review', notions: notions() })).toEqual({
			main: 'Révisions',
			notions: '',
			sub: '',
			footer: 'Révisions',
			flat: 'Révisions'
		});
	});

	it('ni notion ni catégorie : le titre en base', () => {
		expect(printedTitle({ ...base, category: null, notions: notions(), title: 'Fiche 3' })).toEqual(
			{
				main: 'Fiche 3',
				notions: '',
				sub: '',
				footer: 'Fiche 3',
				flat: 'Fiche 3'
			}
		);
	});

	it('titre libre : lui seul, ni notion ni catégorie dessous', () => {
		expect(printedTitle({ ...base, customTitle: true, title: 'Le produit scalaire' })).toEqual({
			main: 'Le produit scalaire',
			notions: '',
			sub: '',
			footer: 'Le produit scalaire',
			flat: 'Le produit scalaire'
		});
	});

	it('sous-notion en minuscule : majuscule en tête', () => {
		expect(printedTitle({ ...base, notions: notions('loi géométrique') })).toMatchObject({
			main: 'Loi géométrique',
			footer: 'Loi géométrique · Entraînement technique',
			flat: 'Loi géométrique · Entraînement technique'
		});
	});

	it('titre libre en Révisions : le titre seul, ni notions ni catégorie', () => {
		expect(
			printedTitle({
				...base,
				category: 'review',
				customTitle: true,
				title: 'Préparation Bac Blanc 1',
				notions: notions('Suites', 'Dérivation')
			})
		).toEqual({
			main: 'Préparation Bac Blanc 1',
			notions: '',
			sub: '',
			footer: 'Préparation Bac Blanc 1',
			flat: 'Préparation Bac Blanc 1'
		});
	});

	it('évaluation : titre écrit à la main, seul, case ignorée', () => {
		for (const customTitle of [true, false]) {
			expect(
				printedTitle({
					...base,
					type: 'assessment',
					category: null,
					customTitle,
					title: 'Contrôle n° 2',
					notions: notions('Suites', 'Dérivation')
				})
			).toEqual({
				main: 'Contrôle n° 2',
				notions: '',
				sub: '',
				footer: 'Contrôle n° 2',
				flat: 'Contrôle n° 2'
			});
		}
	});

	it('anglais sans titre libre : la catégorie traduite, sans notion', () => {
		expect(printedTitle({ ...base, locale: 'en', title: 'Suites' })).toEqual({
			main: 'Technical practice',
			notions: '',
			sub: '',
			footer: 'Technical practice',
			flat: 'Technical practice'
		});
	});

	it('anglais, Automatismes : « Fluency » (David, 2026-11-19, sur ma reco)', () => {
		expect(printedTitle({ ...base, locale: 'en', category: 'automatisms' }).main).toBe('Fluency');
	});

	it('anglais, titre libre à plusieurs notions : aucune notion imprimée', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				type: 'exam',
				category: null,
				customTitle: true,
				title: 'Mock exam',
				notions: notions('Suites')
			})
		).toEqual({ main: 'Mock exam', notions: '', sub: '', footer: 'Mock exam', flat: 'Mock exam' });
	});
});

// =============================================================================
// Branche commune (David, 2026-11-20)
// =============================================================================

describe('branchOf', () => {
	const TREE = new Map<string, TitleTreeNode>([
		['b', { name: 'Probabilités', kind: 'branch', parent_id: null }],
		['n', { name: 'Lois discrètes', kind: 'notion', parent_id: 'b' }],
		['s', { name: 'loi géométrique', kind: 'subnotion', parent_id: 'n' }],
		['x', { name: 'Orpheline', kind: 'notion', parent_id: 'absent' }],
		['l1', { name: 'Boucle', kind: 'notion', parent_id: 'l2' }],
		['l2', { name: 'Boucle', kind: 'notion', parent_id: 'l1' }]
	]);

	it('notion : son parent ; sous-notion : son grand-parent', () => {
		expect(branchOf('n', TREE)).toBe('Probabilités');
		expect(branchOf('s', TREE)).toBe('Probabilités');
	});

	it('nœud inconnu, parent absent ou arbre bouclé : null', () => {
		expect(branchOf('?', TREE)).toBeNull();
		expect(branchOf('x', TREE)).toBeNull();
		expect(branchOf('l1', TREE)).toBeNull();
	});
});

describe('sharedBranch', () => {
	it('deux notions ou plus de la même branche : la branche', () => {
		expect(sharedBranch(SUITES)).toBe('Suites');
	});

	it('une seule notion : pas de branche, la notion garde son nom', () => {
		expect(sharedBranch([{ name: 'Fonctions affines', branch: 'Fonctions' }])).toBeNull();
	});

	it('branches différentes, ou une branche inconnue : null', () => {
		expect(
			sharedBranch([
				{ name: 'Suites arithmético-géométriques', branch: 'Suites' },
				{ name: 'Dérivation', branch: 'Fonctions' }
			])
		).toBeNull();
		expect(sharedBranch([SUITES[0], { name: 'Suites arithmétiques' }])).toBeNull();
	});
});

describe('titre d’une fiche dont les notions ont une branche commune', () => {
	it('titre en base : la branche puis la catégorie', () => {
		expect(composedTitle('technical_practice', SUITES)).toBe('Suites · Entraînement technique');
	});

	it('sans catégorie : la branche seule', () => {
		expect(composedTitle(null, SUITES)).toBe('Suites');
	});

	it('une seule notion de la branche : la notion, comme avant', () => {
		expect(
			composedTitle('applications', [{ name: 'Fonctions affines', branch: 'Fonctions' }])
		).toBe('Fonctions affines · Applications');
	});

	it('branches différentes : les notions, comme avant', () => {
		expect(
			composedTitle('review', [
				{ name: 'Suites', branch: 'Suites' },
				{ name: 'Dérivation', branch: 'Fonctions' }
			])
		).toBe('Suites · Dérivation · Révisions');
	});

	it('PDF : la branche en grand, les notions dessous, la catégorie en petit', () => {
		expect(printedTitle({ ...base, notions: SUITES })).toEqual({
			main: 'Suites',
			notions: 'Généralités sur les suites · Suites arithmétiques · Suites géométriques',
			sub: 'entraînement technique',
			footer: 'Suites · Entraînement technique',
			flat: 'Généralités sur les suites · Suites arithmétiques · Suites géométriques · Entraînement technique'
		});
	});

	it('PDF, sous-notions en minuscule : majuscule en tête', () => {
		expect(
			printedTitle({
				...base,
				category: 'applications',
				notions: [
					{ name: 'loi géométrique', branch: 'Probabilités' },
					{ name: 'loi binomiale', branch: 'Probabilités' }
				]
			})
		).toMatchObject({ main: 'Probabilités', notions: 'Loi géométrique · Loi binomiale' });
	});

	it('PDF, titre libre : le titre seul, ni branche ni notions', () => {
		expect(
			printedTitle({
				...base,
				customTitle: true,
				title: 'Automatismes : suites (1)',
				notions: SUITES
			})
		).toEqual({
			main: 'Automatismes : suites (1)',
			notions: '',
			sub: '',
			footer: 'Automatismes : suites (1)',
			flat: 'Automatismes : suites (1)'
		});
	});

	it('PDF en anglais : la catégorie traduite, ni branche ni notions', () => {
		expect(printedTitle({ ...base, locale: 'en', notions: SUITES })).toEqual({
			main: 'Technical practice',
			notions: '',
			sub: '',
			footer: 'Technical practice',
			flat: 'Technical practice'
		});
	});
});

// =============================================================================
// Noms anglais des notions (ADR 0043, David, 2026-11-23)
// =============================================================================

describe('printedTitle en anglais, notions traduites', () => {
	/** Les deux notions des suites, traduites, branche traduite */
	const SUITES_EN: TitleNotion[] = [
		{
			name: 'Suites arithmétiques',
			nameEn: 'Arithmetic sequences',
			branch: 'Suites',
			branchEn: 'Sequences'
		},
		{
			name: 'Suites géométriques',
			nameEn: 'Geometric sequences',
			branch: 'Suites',
			branchEn: 'Sequences'
		}
	];

	it('une notion traduite : son nom anglais en grand, la catégorie dessous', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				notions: [{ name: 'Suites arithmétiques', nameEn: 'Arithmetic sequences' }]
			})
		).toEqual({
			main: 'Arithmetic sequences',
			notions: '',
			sub: 'technical practice',
			footer: 'Arithmetic sequences · Technical practice',
			flat: 'Arithmetic sequences · Technical practice'
		});
	});

	it('deux notions d’une branche : la branche anglaise en grand, les notions dessous', () => {
		expect(printedTitle({ ...base, locale: 'en', notions: SUITES_EN })).toEqual({
			main: 'Sequences',
			notions: 'Arithmetic sequences · Geometric sequences',
			sub: 'technical practice',
			footer: 'Sequences · Technical practice',
			flat: 'Arithmetic sequences · Geometric sequences · Technical practice'
		});
	});

	it('sous-notion anglaise en minuscule : majuscule en tête', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				notions: [{ name: 'loi géométrique', nameEn: 'geometric distribution' }]
			}).main
		).toBe('Geometric distribution');
	});

	it('une notion sans anglais : la catégorie seule, rien en français', () => {
		const printed = printedTitle({
			...base,
			locale: 'en',
			notions: [
				SUITES_EN[0],
				{ name: 'Suites géométriques', branch: 'Suites', branchEn: 'Sequences' }
			]
		});
		expect(printed).toEqual({
			main: 'Technical practice',
			notions: '',
			sub: '',
			footer: 'Technical practice',
			flat: 'Technical practice'
		});
	});

	it('branche commune sans anglais : la catégorie seule', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				notions: SUITES_EN.map((notion) => ({ ...notion, branchEn: null }))
			}).main
		).toBe('Technical practice');
	});

	it('branches différentes : leur nom anglais ne sert pas', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				category: 'review',
				notions: [
					{ name: 'Suites', nameEn: 'Sequences', branch: 'Suites' },
					{ name: 'Dérivation', nameEn: 'Derivatives', branch: 'Fonctions' }
				]
			})
		).toMatchObject({
			main: 'Sequences · Derivatives',
			notions: '',
			footer: 'Sequences · Derivatives · Review'
		});
	});

	it('deux branches traduites pareil restent deux branches', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				notions: [
					{ name: 'A', nameEn: 'A', branch: 'Branche 1', branchEn: 'Same' },
					{ name: 'B', nameEn: 'B', branch: 'Branche 2', branchEn: 'Same' }
				]
			}).main
		).toBe('A · B');
	});

	it('fiche française : les noms anglais ne changent rien', () => {
		expect(printedTitle({ ...base, notions: SUITES_EN })).toMatchObject({
			main: 'Suites',
			notions: 'Suites arithmétiques · Suites géométriques'
		});
	});

	it('titre libre en anglais : le titre seul, même notions traduites', () => {
		expect(
			printedTitle({
				...base,
				locale: 'en',
				customTitle: true,
				title: 'Homework',
				notions: SUITES_EN
			})
		).toEqual({ main: 'Homework', notions: '', sub: '', footer: 'Homework', flat: 'Homework' });
	});
});

describe('missingEnglishNames', () => {
	it('les notions sans anglais, avec majuscule', () => {
		expect(
			missingEnglishNames([
				{ name: 'loi géométrique' },
				{ name: 'Suites arithmétiques', nameEn: 'Arithmetic sequences' }
			])
		).toEqual(['Loi géométrique']);
	});

	it('la branche commune sans anglais, quand elle sert de titre', () => {
		expect(
			missingEnglishNames([
				{ name: 'A', nameEn: 'A', branch: 'Suites' },
				{ name: 'B', nameEn: 'B', branch: 'Suites' }
			])
		).toEqual(['Suites']);
	});

	it('une seule notion : sa branche ne compte pas', () => {
		expect(missingEnglishNames([{ name: 'A', nameEn: 'A', branch: 'Suites' }])).toEqual([]);
	});

	it('aucune notion : rien ne manque', () => {
		expect(missingEnglishNames([])).toEqual([]);
	});
});

describe('englishName', () => {
	it('lit translations.en.name', () => {
		expect(englishName({ en: { name: 'Sequences' } })).toBe('Sequences');
	});

	it('absent, vide, ou de mauvaise forme : null', () => {
		expect(englishName({})).toBeNull();
		expect(englishName(null)).toBeNull();
		expect(englishName({ en: {} })).toBeNull();
		expect(englishName({ en: { name: '  ' } })).toBeNull();
		expect(englishName({ en: { name: 3 } })).toBeNull();
		expect(englishName({ en: 'Sequences' })).toBeNull();
		expect(englishName([])).toBeNull();
	});
});

describe('V111 : fiche anglaise sans catégorie, notion sans nom anglais', () => {
	// Le titre en base est le titre composé, écrit en français par l'éditeur
	const FRENCH_TITLE = 'Suites arithmétiques';
	const notion: TitleNotion = { name: 'suites arithmétiques', branch: 'Suites' };

	function mainTitle(locale: 'fr' | 'en', notions: TitleNotion[]): string {
		return printedTitle({
			type: 'worksheet',
			category: null,
			customTitle: false,
			title: FRENCH_TITLE,
			notions,
			locale
		}).main;
	}

	it('en français : le titre composé', () => {
		expect(mainTitle('fr', [notion])).toBe(FRENCH_TITLE);
	});

	it('notion traduite : son nom anglais', () => {
		expect(mainTitle('en', [{ ...notion, nameEn: 'arithmetic sequences' }])).toBe(
			'Arithmetic sequences'
		);
	});

	it('branche traduite : le nom anglais de la branche', () => {
		expect(mainTitle('en', [{ ...notion, branchEn: 'sequences' }])).toBe('Sequences');
	});

	it('rien de traduit : « Worksheet », jamais le titre français', () => {
		expect(mainTitle('en', [notion])).toBe('Worksheet');
	});

	it('deux notions de branches différentes, une sans nom anglais : « Worksheet »', () => {
		const other: TitleNotion = {
			name: 'probabilités',
			branch: 'Probabilités',
			nameEn: 'probability',
			branchEn: 'probability'
		};
		expect(mainTitle('en', [{ ...notion, branchEn: 'sequences' }, other])).toBe('Worksheet');
	});
});
