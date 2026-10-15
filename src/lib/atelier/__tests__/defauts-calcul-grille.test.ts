/**
 * Défauts relevés pendant le chantier du tableur (2026-10-15), corrigés à la
 * demande de David :
 * - Calcul recopiait `mediane(L)` sans le calculer, et lisait `médiane(L)`
 *   « Fonction inconnue : diane » — une fonction de la grille dit où elle vit
 *   (Q-L4-6), accents et nom à point compris ;
 * - la grille lisait `=pi` p·i (« p n'est pas défini ») : le même refus que
 *   Calcul (décision de David du 2026-10-06), `=PI()` restant la fonction.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcResult } from '../calcul';

function session() {
	const s = { atelier: new Atelier(), engine: new WebReplEngine() };
	runInput(s, 'L = 12 ; 15 ; 9 ; 14');
	return s;
}

function said(result: CalcResult): string {
	if (result.kind === 'refus') return `refus : ${result.message}`;
	if (result.kind === 'calcul') return result.output;
	return result.kind;
}

const MEDIANE =
	'refus : MEDIANE est une fonction de la grille (onglet Données). Pour une liste, tape .stats L.';

describe('Calcul : une fonction de la grille dit où elle vit', () => {
	for (const input of ['mediane(L)', 'médiane(L)', 'mediane(2)', 'Mediane(L)']) {
		it(input, () => expect(said(runInput(session(), input))).toBe(MEDIANE));
	}

	it('un nom à point : nb.si', () => {
		expect(said(runInput(session(), 'nb.si(L;12)'))).toBe(
			'refus : NB.SI est une fonction de la grille (onglet Données).'
		);
	});

	it('dans l’argument d’une commande aussi', () => {
		expect(said(runInput(session(), '.dériver mediane(x)'))).toBe(MEDIANE);
	});

	it('les fonctions que Calcul connaît restent des calculs', () => {
		expect(said(runInput(session(), 'max(2;3)'))).toBe('3');
		expect(said(runInput(session(), 'abs(-2)'))).toBe('2');
	});
});

describe('la grille refuse `pi` en lettres, comme Calcul', () => {
	function cell(text: string) {
		const a = new Atelier();
		a.editCells([
			{ column: 1, row: 1, text: 'pile' },
			{ column: 0, row: 1, text }
		]);
		const v = a.cellValue(0, 1);
		return v.kind === 'number' ? v.shown : v.kind === 'error' ? `erreur : ${v.message}` : v.kind;
	}

	it('=pi, =2pi : refus', () => {
		expect(cell('=pi')).toBe('erreur : Écris π avec \\pi ou le symbole π.');
		expect(cell('=2pi')).toBe('erreur : Écris π avec \\pi ou le symbole π.');
	});

	it('=PI() et =pi() restent la fonction π ; π aussi', () => {
		expect(cell('=PI()')).toBe('≈ 3,1416');
		expect(cell('=pi()')).toBe('≈ 3,1416');
		expect(cell('=π')).toBe('≈ 3,1416');
	});

	it('un texte entre guillemets n’est pas visé', () => {
		expect(cell('=NB.SI(B1:B1;"pile")')).toBe('1');
	});
});
