/**
 * Case à remplir dans une cellule de tableau, au PDF (2026-10-04)
 *
 * Défaut : une cellule qui ne contient QUE la case d'une formule (`$?$`, figée
 * en `$\text{……}$` par `buildSerie`) montrait ses pointillés collés en HAUT de
 * la cellule. Une formule Typst seule sur sa ligne prend la hauteur serrée de
 * ses glyphes : des points n'ont presque pas de hauteur, et la cellule (alignée
 * en haut) les remonte au-dessus de la ligne de base des cellules voisines. La
 * case écrite en texte (`{{blank:N}}` → `……`) était, elle, bien placée.
 *
 * Correctif : une formule réduite à des pointillés s'écrit en texte dans une
 * cellule, comme la case texte. Hors tableau, rien ne change.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst, processTableCellContent } from '../typst-generator';

const typst = (md: string) =>
	(generateTypst(parseMarkdown(md), { includeSetup: false }).split(
		'// ubumark: fin de l’en-tête'
	)[1] ?? '') as string;

const TABLEAU = [
	'| $x_k$ | $0$ | $1$ | $2$ |',
	'| --- | --- | --- | --- |',
	'| $P(X=x_k)$ | $0{,}2$ | $\\text{……}$ | …… |'
].join('\n');

describe('case à remplir dans une cellule de tableau (PDF)', () => {
	it('la case d’une formule seule dans sa cellule s’écrit en texte, comme la case texte', () => {
		const sortie = typst(TABLEAU);
		expect(sortie).toContain('[$P(X=x_k)$], [$0","2$], [……], [……]');
		expect(sortie).not.toContain('[$"……"$]');
	});

	it('cellule sans case : inchangée', () => {
		expect(processTableCellContent('$0{,}2$')).toBe('$0","2$');
		expect(processTableCellContent('$P(X=x_k)$')).toBe('$P(X=x_k)$');
	});

	it('corrigé : la réponse en gras reste une formule', () => {
		expect(processTableCellContent('$\\mathbf{0{,}5}$')).toBe('$bold(0","5)$');
	});

	it('case au milieu d’une formule : la formule est gardée (elle porte sa hauteur)', () => {
		expect(processTableCellContent('$x = \\text{……}$')).toBe('$x = "……"$');
	});

	it('hors tableau : la case d’une formule reste une formule', () => {
		expect(typst('Hors tableau : $P(X=1) = \\text{……}$ et $\\text{……}$.')).toContain(
			'$P(X=1) = "……"$ et $"……"$'
		);
	});
});

describe('gras dans une cellule de tableau (PDF)', () => {
	it('le gras markdown d’une cellule (réponse d’une case texte au corrigé) est rendu en gras', () => {
		expect(processTableCellContent('**0,3**')).toBe('#strong[0,3]');
		expect(processTableCellContent('soit **12** cm')).toBe('soit #strong[12] cm');
	});

	it('un astérisque seul reste échappé', () => {
		expect(processTableCellContent('a * b')).toBe('a \\* b');
	});
});
