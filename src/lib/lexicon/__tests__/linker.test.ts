/**
 * Mots cliquables (lot 2 du lexique) : repérage des mots du dictionnaire dans
 * le texte d'un énoncé. Spécification validée par David le 2026-10-09 :
 * docs/wip/lexique/lot2-mots-cliquables-spec.md (numéros des comportements).
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import type { DocumentNode, TextNode } from '$lib/ubumark';
import type { GradeCode } from '$lib/types/grades';
import { lexiconGrade, linkDocument } from '../linker';

/** Texte de chaque nœud texte, avec les entrées ouvertes par les mots repérés. */
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

/** Mots repérés, dans l'ordre du texte : [mot tel qu'écrit, entrées]. */
function links(markdown: string, grade: GradeCode): [string, string[]][] {
	return texts(linkDocument(parseMarkdown(markdown), grade))
		.filter((n) => n.term)
		.map((n) => [n.content, n.term?.ids ?? []]);
}

/** Texte complet, pour vérifier que le découpage ne perd ni n'ajoute rien. */
function plain(doc: DocumentNode): string {
	return texts(doc)
		.map((n) => n.content)
		.join('');
}

describe('mots cliquables : repérage', () => {
	it('1. repère les mots du dictionnaire visibles au niveau de l’élève', () => {
		expect(links('Calcule l’aire du rectangle.', '6')).toEqual([
			['Calcule', ['calculer']],
			['aire', ['aire']],
			['rectangle', ['rectangle']]
		]);
	});

	it('le découpage garde le texte exact', () => {
		const doc = parseMarkdown('Calcule l’aire du rectangle, puis trace un angle droit.');
		expect(plain(linkDocument(doc, '6'))).toBe(plain(doc));
	});

	it('2. mots entiers seulement : « angle » ne s’allume pas dans « rectangle »', () => {
		expect(links('Un rectangle.', '6').map(([word]) => word)).toEqual(['rectangle']);
	});

	it('3. accents exacts : « tracé » n’est pas « trace », la casse est ignorée', () => {
		expect(links('Le tracé est fini.', '6')).toEqual([]);
		expect(links('Trace un rectangle.', '6')[0]).toEqual(['Trace', ['tracer']]);
	});

	it('4. pluriel admis sur chaque mot', () => {
		expect(links('Les nombres premiers inférieurs à 20.', '5')).toContainEqual([
			'nombres premiers',
			['nombre premier']
		]);
	});

	it('5. l’expression la plus longue gagne', () => {
		expect(links('Dans un repère orthonormé, place le point.', '2')).toEqual([
			['repère orthonormé', ['repère orthonormé']]
		]);
		expect(links('Une fonction affine.', '3')).toEqual([['fonction affine', ['fonction affine']]]);
	});

	it('6. un mot n’est souligné qu’une fois par énoncé, même sur plusieurs paragraphes', () => {
		expect(links('Calcule $a$, puis calcule $b$.', '6')).toEqual([['Calcule', ['calculer']]]);
		expect(links('Calcule $a$.\n\nCalcule $b$.', '6')).toHaveLength(1);
	});

	it('7. formes conjuguées reconnues, mots de la liste fermée jamais', () => {
		expect(links('Développe l’expression et le nombre.', '5')).toEqual([
			['Développe', ['développer']]
		]);
	});

	it('7. apostrophe typographique ou droite', () => {
		expect(links('Le taux d’évolution.', '3')).toEqual([
			['taux d’évolution', ["taux d'évolution"]]
		]);
		expect(links("Le taux d'évolution.", '3')).toEqual([
			["taux d'évolution", ["taux d'évolution"]]
		]);
	});

	it('8. jamais dans une formule ni dans du code', () => {
		expect(links('$aire$ et `aire`', '6')).toEqual([]);
	});

	it('dans une liste et un encadré aussi', () => {
		expect(links('- Calcule l’aire.', '6').map(([word]) => word)).toEqual(['Calcule', 'aire']);
		expect(links('> [!rappel] L’aire du carré.', '6').map(([word]) => word)).toEqual([
			'aire',
			'carré'
		]);
	});

	it('9. un mot caché au niveau de l’élève n’est pas repéré ; une filière partagée le voit', () => {
		expect(links('Calcule la dérivée.', '3').map(([word]) => word)).toEqual(['Calcule']);
		expect(links('Calcule la dérivée.', '1_SPE')).toContainEqual(['dérivée', ['dérivée']]);
		expect(links('Calcule la dérivée.', '1_TECHNO')).toContainEqual(['dérivée', ['dérivée']]);
		expect(links('Calcule la dérivée.', '1_GEN').map(([word]) => word)).toEqual(['Calcule']);
	});

	it('10. un homonyme ouvre tous ses sens visibles', () => {
		const [[, ids]] = links('Le carré de 5.', '5');
		expect([...ids].sort()).toEqual(['carré (géométrie)', 'carré (puissance)']);
		expect(links('Le carré de 5.', 'CE1')).toEqual([['carré', ['carré (géométrie)']]]);
	});

	it('n’abîme pas l’arbre d’origine, qui peut venir du cache', () => {
		const doc = parseMarkdown('Calcule l’aire.');
		const before = JSON.stringify(doc);
		linkDocument(doc, '6');
		expect(JSON.stringify(doc)).toBe(before);
	});
});

describe('mots cliquables : marquage à la main', () => {
	it('15. [mot]{.def} souligne un mot de la liste fermée', () => {
		expect(links('Un [nombre]{.def} pair.', 'CP')).toContainEqual(['nombre', ['nombre']]);
	});

	it('15. le mot forcé admet le pluriel', () => {
		expect(links('Deux [triangles]{.def}.', 'CP')).toEqual([['triangles', ['triangle']]]);
	});

	it('16. [mot]{.def=…} choisit l’entrée', () => {
		expect(links('Deux [carrés]{.def=carré (géométrie)}.', '5')).toEqual([
			['carrés', ['carré (géométrie)']]
		]);
	});

	it('17. [mot]{.nodef} bloque le mot, qui ne compte pas pour la suite', () => {
		expect(links('Une [aire]{.nodef} de jeux, puis l’aire du rectangle.', '6')).toEqual([
			['aire', ['aire']],
			['rectangle', ['rectangle']]
		]);
	});

	it('18. un mot absent du dictionnaire, ou caché, reste du texte normal', () => {
		expect(links('Le [zorglub]{.def} vole.', '6')).toEqual([]);
		expect(links('La [dérivée]{.def} de $f$.', '3')).toEqual([]);
		expect(links('Un [carré]{.def=carré (inconnu)}.', '5')).toEqual([]);
	});
});

describe('mots cliquables : niveau de lecture', () => {
	it('12. le niveau de l’élève, sinon le plus petit niveau de la question', () => {
		expect(lexiconGrade('1_GEN', ['2'])).toBe('1_GEN');
		expect(lexiconGrade(null, ['3', '4'])).toBe('4');
		expect(lexiconGrade('inconnu', ['5'])).toBe('5');
		expect(lexiconGrade(undefined, [])).toBeNull();
	});
});
