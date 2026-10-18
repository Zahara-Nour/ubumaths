/**
 * Géométrie, lot 2, PR 1 : les CONSTRUCTIONS au clavier, dans le modèle de
 * l'atelier (L1, L2, L3, L8 de `docs/wip/atelier-geometrie-lot2-phase0.md`,
 * validée le 2026-10-18).
 *
 * Ce qui est asserté est ce que l'élève voit : l'objet créé (type, définition
 * telle qu'écrite, état), la ligne de Calcul (coordonnées exactes, équation,
 * longueur), le refus et sa raison.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { promote, runInput, type CalcResult, type CalcSession } from '../calcul';
import { curveNatureOf } from '../curve-nature';
import { figureFullMessage } from '../geometry';
import { MAX_FIGURE_OBJECTS } from '../types';
import { encodeAtelier, decodeAtelier } from '../url';

// =============================================================================
// Outils
// =============================================================================

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

/** A(0 ; 1), B(1 ; 3), O(0 ; 0), C(2 ; 0) : (AB) a pour équation y = 2x + 1. */
function plane(): CalcSession {
	const s = session();
	for (const line of ['A = (0 ; 1)', 'B = (1 ; 3)', 'O = (0 ; 0)', 'C = (2 ; 0)']) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

function refusal(result: CalcResult): string {
	if (result.kind !== 'refus') throw new Error(`attendu un refus, reçu ${JSON.stringify(result)}`);
	return result.message;
}

function answer(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.output;
}

function latex(result: CalcResult): string {
	if (result.kind !== 'calcul')
		throw new Error(`attendu un calcul, reçu ${JSON.stringify(result)}`);
	return result.latex ?? '';
}

function defined(s: CalcSession, line: string) {
	const result = runInput(s, line);
	if (result.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(result)}`);
	const object = s.atelier.get(result.name);
	if (object === undefined) throw new Error(`${result.name} absent`);
	return object;
}

// =============================================================================
// L2 — créer une construction en la nommant
// =============================================================================

describe('L2 : une construction nommée crée un objet de la figure', () => {
	it('L2 : `d = (AB)` crée une droite, définition rangée telle qu’écrite', () => {
		const s = plane();
		const d = defined(s, 'd = (AB)');
		expect([d.kind, d.definition, d.status]).toEqual(['curve', '(AB)', 'ok']);
		expect(curveNatureOf(s.atelier, 'd')?.label).toBe('droite');
		expect(answer(runInput(s, 'd'))).toBe('d : y=2x+1');
	});

	it('L2 : `d = droite(A, B)` est la même droite', () => {
		const s = plane();
		defined(s, 'd = droite(A, B)');
		expect(answer(runInput(s, 'd'))).toBe('d : y=2x+1');
	});

	it('L2 : `s = [AB]` crée un segment, `r = [AB)` une demi-droite', () => {
		const s = plane();
		defined(s, 's = [AB]');
		defined(s, 'r = [AB)');
		expect(curveNatureOf(s.atelier, 's')?.label).toBe('segment');
		expect(curveNatureOf(s.atelier, 'r')?.label).toBe('demi-droite');
		expect(answer(runInput(s, 's'))).toBe('s : segment de longueur sqrt(5)');
	});

	it('L2 : `I = milieu(A, B)` crée un point aux coordonnées exactes', () => {
		const s = plane();
		const i = defined(s, 'I = milieu(A, B)');
		expect([i.kind, i.definition, i.status]).toEqual(['point', 'milieu(A, B)', 'ok']);
		expect(answer(runInput(s, 'I'))).toBe('I(1/2 ; 2)');
	});

	it('L2 : `P = point(1 ; 2)` est un point, comme `P = (1 ; 2)`', () => {
		const s = plane();
		defined(s, 'P = point(1 ; 2)');
		expect(answer(runInput(s, 'P'))).toBe('P(1 ; 2)');
	});

	it('L2 : une droite verticale s’écrit x = …', () => {
		const s = plane();
		runInput(s, 'F = (3 ; 0)');
		runInput(s, 'G = (3 ; 5)');
		defined(s, 'v = (FG)');
		expect(answer(runInput(s, 'v'))).toBe('v : x=3');
	});

	it('L3 : parallèle et perpendiculaire, à une droite nommée ou par deux points', () => {
		const s = plane();
		runInput(s, 'E = (1 ; 1)');
		defined(s, 'd = (AB)');
		defined(s, 'p = parallèle(C, d)');
		defined(s, 'p_1 = parallele(C, A, B)');
		defined(s, 'q = perpendiculaire(C, O, E)');
		defined(s, 'q_1 = perpendiculaire(C, (OE))');
		expect(answer(runInput(s, 'p'))).toBe('p : y=2x-4');
		expect(answer(runInput(s, 'p_1'))).toBe('p_1 : y=2x-4');
		expect(answer(runInput(s, 'q'))).toBe('q : y=-x+2');
		expect(answer(runInput(s, 'q_1'))).toBe('q_1 : y=-x+2');
	});

	it('L3 : parallèle à une droite donnée par son équation (lot 1)', () => {
		const s = plane();
		runInput(s, 'D : y = 3x - 2');
		defined(s, 'p = parallele(O, D)');
		expect(answer(runInput(s, 'p'))).toBe('p : y=3x');
	});

	it('L3 : `H = projection(O, axe=(AB))`, exacte', () => {
		const s = plane();
		defined(s, 'H = projection(O, axe=(AB))');
		expect(answer(runInput(s, 'H'))).toBe('H(-2/5 ; 1/5)');
	});

	it('L3 : les quatre cercles', () => {
		const s = plane();
		defined(s, 'c = cercle(O, 3)');
		defined(s, 'c_1 = cercle(O, rayon=2)');
		defined(s, 'c_2 = cercle(C, passant=O)');
		defined(s, 'c_3 = cercle(O, A, C)');
		expect(curveNatureOf(s.atelier, 'c')?.label).toBe('cercle');
		expect(answer(runInput(s, 'c'))).toBe('c : x^2+y^2=9');
		expect(answer(runInput(s, 'c_1'))).toBe('c_1 : x^2+y^2=4');
		expect(answer(runInput(s, 'c_2'))).toBe('c_2 : (x-2)^2+y^2=4');
		// Centre (1 ; 1/2), rayon² 5/4
		expect(latex(runInput(s, 'c_3'))).toContain('\\left( x - 1 \\right)^2');
		expect(latex(runInput(s, 'c_3'))).toContain('\\dfrac{5}{4}');
	});

	it('L2 : un rayon qui suit un curseur', () => {
		const s = plane();
		runInput(s, 'r = 2');
		defined(s, 'c = cercle(O ; r)');
		expect(answer(runInput(s, 'c'))).toBe('c : x^2+y^2=4');
		s.atelier.slideTo('r', 3);
		expect(answer(runInput(s, 'c'))).toBe('c : x^2+y^2=9');
	});

	it('L2 : `cercle(O, A)` avec un point en second est refusé, avec l’aide', () => {
		const s = plane();
		expect(refusal(runInput(s, 'c = cercle(O, A)'))).toContain('cercle(O, passant=A)');
		expect(s.atelier.get('c')).toBeUndefined();
	});

	it('L3 : un autre mot du DSL est refusé avec sa raison, rien n’est créé', () => {
		const s = plane();
		expect(refusal(runInput(s, 'm = médiatrice(A, B)'))).toBe(
			'« médiatrice » n’est pas encore dans l’atelier.'
		);
		expect(refusal(runInput(s, 'aire(A, B, C)'))).toBe('« aire » n’est pas encore dans l’atelier.');
		expect(s.atelier.get('m')).toBeUndefined();
	});

	it('L2 : une ambiguïté de virgule est refusée', () => {
		const s = plane();
		expect(refusal(runInput(s, 'P = point(1,5, 2)'))).toContain('« ; »');
	});

	it('L2 : `(ab)` avec deux valeurs reste un produit', () => {
		const s = session();
		runInput(s, 'a = 2');
		runInput(s, 'b = 3');
		expect(answer(runInput(s, '(ab)'))).toBe('6');
	});
});

// =============================================================================
// L2 — tapé seul : un calcul
// =============================================================================

describe('L2 : tapée seule, une construction est un calcul', () => {
	it('`(AB)` répond son équation réduite, rien n’est créé', () => {
		const s = plane();
		const before = s.atelier.names.length;
		expect(answer(runInput(s, '(AB)'))).toBe('(AB) : y=2x+1');
		expect(s.atelier.names.length).toBe(before);
	});

	it('`[AB]` répond sa longueur exacte', () => {
		const s = plane();
		const result = runInput(s, '[AB]');
		expect(answer(result)).toBe('[AB] : segment de longueur sqrt(5)');
		expect(latex(result)).toContain('\\sqrt{5}');
	});

	it('`milieu(A, B)` répond ses coordonnées', () => {
		const s = plane();
		expect(answer(runInput(s, 'milieu(A, B)'))).toBe('(1/2 ; 2)');
	});

	it('`cercle(O, 3)` répond son équation', () => {
		const s = plane();
		expect(answer(runInput(s, 'cercle(O, 3)'))).toBe('cercle(O, 3) : x^2+y^2=9');
	});

	it('D5 : « Garder » en fait un objet, définition telle qu’écrite', () => {
		const s = plane();
		const kept = promote(s, runInput(s, '(AB)'));
		expect(kept.ok).toBe(true);
		const d = s.atelier.get('d');
		expect([d?.kind, d?.definition, d?.status]).toEqual(['curve', '(AB)', 'ok']);
	});
});

// =============================================================================
// L8 — dépendances
// =============================================================================

describe('L8 : les dépendances d’une construction', () => {
	it('D9 : un point cité qui manque met la construction en attente, puis elle se répare', () => {
		const s = plane();
		const i = defined(s, 'I = milieu(A, Z)');
		expect(i.status).toBe('pending');
		expect(i.message).toContain('« Z »');
		runInput(s, 'Z = (2 ; 3)');
		expect(s.atelier.get('I')?.status).toBe('ok');
		expect(answer(runInput(s, 'I'))).toBe('I(1 ; 2)');
	});

	it('la suppression en cascade propose les constructions qui en dépendent', () => {
		const s = plane();
		defined(s, 'I = milieu(A, B)');
		defined(s, 'd = (IC)');
		expect(s.atelier.removalOf('A')).toEqual(['I', 'd']);
	});

	it('supprimer A met I en attente', () => {
		const s = plane();
		defined(s, 'I = milieu(A, B)');
		s.atelier.remove('A');
		expect(s.atelier.get('I')?.status).toBe('pending');
	});

	it('redéfinir A recalcule I', () => {
		const s = plane();
		defined(s, 'I = milieu(A, B)');
		runInput(s, 'A = (2 ; 1)');
		expect(answer(runInput(s, 'I'))).toBe('I(3/2 ; 2)');
	});

	it('un point qui suit un curseur, et sa construction avec', () => {
		const s = plane();
		runInput(s, 'a = 1');
		runInput(s, 'M = (a ; 0)');
		defined(s, 'I = milieu(M, O)');
		expect(answer(runInput(s, 'I'))).toBe('I(1/2 ; 0)');
		s.atelier.slideTo('a', 4);
		expect(answer(runInput(s, 'I'))).toBe('I(2 ; 0)');
	});

	it('une construction circulaire est refusée', () => {
		const s = plane();
		expect(refusal(runInput(s, 'K = milieu(K, B)'))).toContain('lui-même');
		defined(s, 'I = milieu(A, B)');
		expect(refusal(runInput(s, 'A = milieu(I, B)'))).toContain('circulaire');
		expect(answer(runInput(s, 'A'))).toBe('A(0 ; 1)');
	});

	it('un objet du mauvais type est refusé, avec sa raison', () => {
		const s = plane();
		defined(s, 'd = (AB)');
		expect(refusal(runInput(s, 'p = parallele(C, A)'))).toBe('« A » n’est pas une droite.');
		expect(refusal(runInput(s, 'I = milieu(d, B)'))).toBe('« d » n’est pas un point.');
		expect(refusal(runInput(s, 'c = cercle(O, d)'))).toBe('« d » n’est pas un nombre.');
	});

	it('une courbe qui n’est pas une droite ne porte pas de parallèle', () => {
		const s = plane();
		defined(s, 'c = cercle(O, 3)');
		const p = defined(s, 'p = parallele(A, c)');
		expect(p.status).toBe('error');
		expect(p.message).toBe('« c » n’est pas une droite.');
	});

	it('V62 : une construction garde son type', () => {
		const s = plane();
		defined(s, 'd = (AB)');
		expect(refusal(runInput(s, 'd = milieu(A, B)'))).toBe('« d » est déjà une courbe.');
	});

	it('deux points confondus : la droite est en erreur, et le dit', () => {
		const s = plane();
		runInput(s, 'F = (1 ; 1)');
		runInput(s, 'G = (1 ; 1)');
		const d = defined(s, 'd = (FG)');
		expect(d.status).toBe('error');
		expect(d.message).toContain('confondus');
	});

	it('trois points alignés : pas de cercle', () => {
		const s = plane();
		runInput(s, 'E = (1 ; 1)');
		runInput(s, 'F = (2 ; 2)');
		const c = defined(s, 'c = cercle(O, E, F)');
		expect(c.status).toBe('error');
		expect(c.message).toContain('alignés');
	});

	it('M2 : le plafond de 50 objets de figure vaut pour les constructions', () => {
		const s = session();
		for (let i = 1; i <= MAX_FIGURE_OBJECTS; i++) {
			s.atelier.create({ kind: 'point', name: `A_${i}`, definition: `(${i} ; 0)` }, 'text');
		}
		expect(refusal(runInput(s, 'I = milieu(A_1, A_2)'))).toBe(
			figureFullMessage(MAX_FIGURE_OBJECTS)
		);
	});

	it('renommer A réécrit les constructions qui le citent, raccourcis compris', () => {
		const s = plane();
		defined(s, 'd = (AB)');
		defined(s, 'I = milieu(A, B)');
		expect(s.atelier.rename('A', 'K').ok).toBe(true);
		expect(s.atelier.get('d')?.definition).toBe('(KB)');
		expect(s.atelier.get('I')?.definition).toBe('milieu(K, B)');
		expect(answer(runInput(s, 'd'))).toBe('d : y=2x+1');
	});
});

// =============================================================================
// Les cartes écrivent en LaTeX (MathLive)
// =============================================================================

describe('L2 : une construction tapée dans une carte', () => {
	it('la carte d’un point : \\operatorname{milieu}\\left(A,B\\right)', () => {
		const s = plane();
		s.atelier.create({ kind: 'point', name: 'I', definition: '' });
		const done = s.atelier.update('I', '\\operatorname{milieu}\\left(A,B\\right)', 'keyboard');
		expect(done.ok).toBe(true);
		expect(s.atelier.get('I')?.status).toBe('ok');
		expect(answer(runInput(s, 'I'))).toBe('I(1/2 ; 2)');
	});

	it('la carte d’une courbe : \\left(AB\\right)', () => {
		const s = plane();
		s.atelier.create({ kind: 'curve', name: 'd', definition: '' });
		s.atelier.update('d', '\\left(AB\\right)', 'keyboard');
		expect(s.atelier.get('d')?.status).toBe('ok');
		expect(curveNatureOf(s.atelier, 'd')?.label).toBe('droite');
	});

	it('une droite tapée dans la carte d’un point est en erreur, avec sa raison', () => {
		const s = plane();
		s.atelier.create({ kind: 'point', name: 'I', definition: '' });
		s.atelier.update('I', '\\left(AB\\right)', 'keyboard');
		expect(s.atelier.get('I')?.status).toBe('error');
		expect(s.atelier.get('I')?.message).toContain('pas un point');
	});
});

// =============================================================================
// Sauvegarde, lien : la définition suffit
// =============================================================================

describe('M1 : une construction se range et se relit par sa définition', () => {
	function constructions(): Atelier {
		const s = plane();
		for (const line of ['d = (AB)', 'I = milieu(A, B)', 'c = cercle(O ; 2,5)', 's = [AB]']) {
			defined(s, line);
		}
		return s.atelier;
	}

	it('serialize → restore : à l’identique', () => {
		const back = new Atelier();
		back.restore(constructions().serialize());
		expect(back.objects.map((o) => [o.name, o.kind, o.definition, o.status])).toEqual([
			['A', 'point', '(0 ; 1)', 'ok'],
			['B', 'point', '(1 ; 3)', 'ok'],
			['O', 'point', '(0 ; 0)', 'ok'],
			['C', 'point', '(2 ; 0)', 'ok'],
			['d', 'curve', '(AB)', 'ok'],
			['I', 'point', 'milieu(A, B)', 'ok'],
			['c', 'curve', 'cercle(O ; 2,5)', 'ok'],
			['s', 'curve', '[AB]', 'ok']
		]);
	});

	it('lien ?a= : à l’identique', async () => {
		const encoded = await encodeAtelier(constructions().serialize());
		const decoded = await decodeAtelier(encoded.payload);
		expect(decoded.ok).toBe(true);
		const back = new Atelier();
		if (decoded.ok) back.restore(decoded.state);
		expect(back.get('c')?.status).toBe('ok');
		expect(back.get('I')?.definition).toBe('milieu(A, B)');
	});
});

// =============================================================================
// Le LaTeX des réponses : aucun antislash perdu (`\r`, `\t` lus comme caractères)
// =============================================================================

describe('L2 : le LaTeX des réponses de construction est intact', () => {
	/** Un caractère de contrôle (`\r`, `\t`, saut de page) : un antislash perdu. */
	const hasControl = (text: string) => [...text].some((char) => char.charCodeAt(0) < 32);

	it('`milieu(A, B)` : \\left( … \\right)', () => {
		const s = plane();
		const formula = latex(runInput(s, 'milieu(A, B)'));
		expect(hasControl(formula)).toBe(false);
		expect(formula).toContain('\\left(');
		expect(formula).toContain('\\right)');
	});

	it('`[AB]` et `[AB)` : \\text{…}', () => {
		const s = plane();
		for (const [line, words] of [
			['[AB]', '\\text{segment de longueur'],
			['[AB)', '\\text{demi-droite portée par']
		]) {
			const formula = latex(runInput(s, line));
			expect(hasControl(formula)).toBe(false);
			expect(formula).toContain(words);
		}
	});

	it('un point construit nommé : I\\left( … \\right)', () => {
		const s = plane();
		defined(s, 'I = milieu(A, B)');
		const formula = latex(runInput(s, 'I'));
		expect(hasControl(formula)).toBe(false);
		expect(formula).toMatch(/^I\\left\(.*\\right\)$/);
	});
});
