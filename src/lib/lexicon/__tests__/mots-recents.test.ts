/**
 * Moins de mots soulignés (chantier `mots-cliquables`, comportements validés
 * par David le 2026-11-16, docs/wip/mots-cliquables-progress.md) :
 * R1 mots récents, R3 niveau de lecture d'un professeur ou d'un visiteur,
 * R4 question de cours.
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type DocumentNode, type TextNode } from '#lib/ubumark/index.ts';
import type { GradeCode } from '#lib/types/grades.ts';
import { REFERENCE_DICTIONARY } from '../../../../tests/fixtures/lexique/dictionnaire-reference';
import { createLinker, type LinkOptions } from '../linker';
import { lexiconCard } from '../card';
import { questionReadingGrades } from '../grade';

const linker = createLinker(REFERENCE_DICTIONARY);

function texts(doc: DocumentNode): TextNode[] {
	const out: TextNode[] = [];
	const visit = (node: unknown) => {
		if (!node || typeof node !== 'object') return;
		const n = node as { type?: string; children?: unknown[]; items?: unknown[] };
		if (n.type === 'text') out.push(node as TextNode);
		for (const child of n.children ?? []) visit(child);
		for (const item of n.items ?? []) visit(item);
	};
	visit(doc);
	return out;
}

/** Mots repérés, tels qu'écrits, dans l'ordre du texte. */
function words(markdown: string, grade: GradeCode, options: LinkOptions): string[] {
	return texts(linker.linkDocument(parseMarkdown(markdown), grade, options)).flatMap((n) =>
		(n.terms ?? []).map((t) => n.content.slice(t.start, t.end))
	);
}

const RECENT: LinkOptions = { recentOnly: true };

describe('R1 : mots de l’année de l’élève et de l’année d’avant', () => {
	it('N1. élève de 4e : CE1 et CP non soulignés, 5e souligné, 3e invisible', () => {
		expect(
			words('Calcule la somme de la fraction, puis l’équation et la fonction.', '4', RECENT)
		).toEqual(['équation']);
	});

	it('N2. « fraction » (CE1) : soulignée en CE2, plus en CM1', () => {
		expect(words('Colorie la fraction.', 'CE2', RECENT)).toEqual(['fraction']);
		expect(words('Colorie la fraction.', 'CM1', RECENT)).toEqual([]);
	});

	it('sans l’option, tous les mots visibles (démo, structure, programmes)', () => {
		expect(words('La somme de la fraction.', '4', {})).toEqual(['somme', 'fraction']);
	});

	it('L1. `{.def}` force un mot ancien ; `{.nodef}` bloque un mot récent', () => {
		expect(words('La [fraction]{.def} et l’équation.', '4', RECENT)).toEqual([
			'fraction',
			'équation'
		]);
		expect(words('L’[équation]{.nodef}.', '4', RECENT)).toEqual([]);
	});

	it('L2. élève de CP : pas d’année d’avant, les mots du CP', () => {
		expect(words('La somme des nombres.', 'CP', RECENT)).toContain('somme');
	});

	it('L3. filières : l’année d’avant se compte en années scolaires', () => {
		// « repère orthonormé » (2de) : année d'avant de la 1re spé, pas de la terminale
		expect(words('Dans un repère orthonormé.', '1_SPE', RECENT)).toEqual(['repère orthonormé']);
		expect(words('Dans un repère orthonormé.', 'T_SPE', RECENT)).toEqual([]);
	});

	it('L3. un mot partagé suit le niveau où ce lecteur le rencontre', () => {
		// « nombre dérivé » (1re spé, partagé avec la 1re techno) : rencontré en 1re techno
		expect(words('Le nombre dérivé.', '1_TECHNO', RECENT)).toEqual(['nombre dérivé']);
		expect(words('Le nombre dérivé.', 'T_TECHNO', RECENT)).toEqual(['nombre dérivé']);
	});

	it('L4. première occurrence seulement : trop ancienne, la suivante ne prend pas le relais', () => {
		expect(words('La somme, puis encore la somme.', '4', RECENT)).toEqual([]);
		expect(words('L’équation, puis encore l’équation.', '4', RECENT)).toEqual(['équation']);
	});
});

describe('R1 : homonymes', () => {
	/** Mots repérés et leurs entrées. */
	function links(markdown: string, grade: GradeCode): [string, string[]][] {
		return texts(linker.linkDocument(parseMarkdown(markdown), grade, RECENT)).flatMap((n) =>
			(n.terms ?? []).map((t): [string, string[]] => [n.content.slice(t.start, t.end), t.ids])
		);
	}

	it('élève de 4e : « carré » ouvre le sens récent (puissance, 5e), pas l’ancien (CP)', () => {
		expect(links('Le carré de $5$.', '4')).toEqual([['carré', ['carré (puissance)']]]);
	});

	it('un mot marqué `{.def}` compte comme première occurrence pour le sens récent', () => {
		expect(links('Le [carré]{.def}, puis encore le carré.', '4')).toEqual([
			['carré', ['carré (puissance)', 'carré (géométrie)']]
		]);
	});
});

describe('R4 : question de cours, seuls les mots marqués', () => {
	it('aucun mot repéré automatiquement ; `{.def}` toujours possible', () => {
		const course: LinkOptions = { recentOnly: true, auto: false };
		expect(words('Définition d’une équation.', '4', course)).toEqual([]);
		expect(words('Définition d’une [équation]{.def}.', '4', course)).toEqual(['équation']);
	});
});

describe('R3 : niveaux de lecture d’une carte', () => {
	it('élève : son niveau, pour la fiche comme pour le soulignement', () => {
		expect(questionReadingGrades('5', ['4', '3'])).toEqual({ grade: '5', linkGrade: '5' });
	});

	it('N4. professeur ou visiteur : soulignement au plus haut niveau, fiche au plus petit (Q1)', () => {
		expect(questionReadingGrades(null, ['3', '4'])).toEqual({ grade: '4', linkGrade: '3' });
		expect(questionReadingGrades('inconnu', ['CM2'])).toEqual({ grade: 'CM2', linkGrade: 'CM2' });
	});

	it('E1. niveau inconnu : aucune lecture, aucun mot souligné', () => {
		expect(questionReadingGrades(null, [])).toBeNull();
		expect(questionReadingGrades(undefined, ['inconnu'])).toBeNull();
	});

	it('Q1. un mot souligné au plus haut niveau a sa fiche, même invisible au plus petit', () => {
		const card = (fallback?: GradeCode) =>
			lexiconCard(REFERENCE_DICTIONARY, linker.getTermById, ['fonction'], '4', fallback);
		expect(card()[0].definitions).toEqual([]);
		expect(card('3')[0].definitions.length).toBeGreaterThan(0);
		// Un mot que le plus petit niveau voit garde ses définitions les plus simples
		const fraction = (grade: GradeCode, fallback?: GradeCode) =>
			lexiconCard(REFERENCE_DICTIONARY, linker.getTermById, ['fraction'], grade, fallback)[0]
				.definitions;
		expect(fraction('CE1', 'T_SPE')).toEqual(fraction('CE1'));
	});
});
