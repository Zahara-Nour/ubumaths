/**
 * Lecture en mode produit : identique à avant les longueurs
 * =========================================================
 *
 * Empreinte figée (`fixtures/lectures-mode-produit.json`), calculée avec le code
 * d'AVANT le lot 4 du chantier « longueurs de segments » (2026-10-12) : pour
 * chacune des 200 saisies du corpus, la lecture de l'expression entière et une
 * empreinte de tout ce que voit la page (LaTeX marqué, nœuds sans leur AST,
 * lectures de chaque sous-expression, segment par segment). En mode `'product'`
 * (et sans option), tout doit être strictement identique.
 *
 * Le corpus contient `AB^2=AC^2+BC^2` : en mode longueur, il change (témoin).
 *
 * Mise à jour le 2026-10-13 pour 15 saisies, empreinte seule (lectures, écriture
 * sans marqueurs et arbre identiques, vérifiés) : l'exposant d'une parenthèse
 * s'écrit désormais dans son marqueur (`(−½ + x)²`, exposant trop bas sinon).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CapitalPairs } from '../../parser/types';
import { readingOf, readingPlainText, structureFromLatex } from '..';

// Types
type Fingerprint = { reading: string; hash: string } | { status: string };

// Constantes
const CORPUS = readFileSync(new URL('./fixtures/corpus-saisies.txt', import.meta.url), 'utf8')
	.split('\n')
	.filter((line) => line.trim() !== '');
const BEFORE: Record<string, Fingerprint> = JSON.parse(
	readFileSync(new URL('./fixtures/lectures-mode-produit.json', import.meta.url), 'utf8')
);

// Fonctions
function fingerprint(latex: string, capitalPairs?: CapitalPairs): Fingerprint {
	const result =
		capitalPairs === undefined
			? structureFromLatex(latex)
			: structureFromLatex(latex, { capitalPairs });
	if (result.status !== 'ok') return { status: result.status };
	const structure = result.structure;
	const readings = structure.nodes.map((node) => readingOf(structure, node.id));
	const full = JSON.stringify({
		latex: structure.latex,
		nodes: structure.nodes.map((node) => ({ ...node, ast: undefined })),
		readings
	});
	return {
		reading: readingPlainText(readings[0]),
		hash: createHash('sha1').update(full).digest('hex').slice(0, 16)
	};
}

describe('lecture en mode produit : identique à avant (empreinte)', () => {
	it('l’empreinte couvre les 200 saisies du corpus', () => {
		expect(CORPUS).toHaveLength(200);
		expect(Object.keys(BEFORE)).toHaveLength(200);
	});

	it.each(CORPUS)('%s', (latex) => {
		expect(fingerprint(latex, 'product')).toEqual(BEFORE[latex]);
		expect(fingerprint(latex)).toEqual(BEFORE[latex]);
	});

	it('témoin : en mode longueur, Pythagore change', () => {
		const latex = 'AB^2=AC^2+BC^2';
		expect(fingerprint(latex, 'length')).not.toEqual(BEFORE[latex]);
	});
});
