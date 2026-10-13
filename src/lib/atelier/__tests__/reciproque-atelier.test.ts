/**
 * La réciproque dans l'atelier — lot 3 de `docs/wip/atelier-reciproque-phase0.md`.
 *
 * R1 : bouton « Réciproque » et `.réciproque f [sur I]` → carte `f⁻¹` + ligne
 * dans Calcul ; R3 : étapes ; R4 : ensembles ; Q5 (b) : la carte porte son
 * ensemble de départ comme intervalle (tracé et calculs). Paramètres : cas 1
 * de David (curseurs). Tous les gestes passent par les vrais chemins
 * (`CalcDesk.submit`, `runFromPanel`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { substitutedAstOf } from '../engine';
import { displayName, reciprocalOf, reciprocalName, validateName } from '../names';
import { actionsFor } from '../actions';
import { plotRestrictionOf, intervalLabelOf } from '../interval';
import { typedLetterOf } from '../letter';
import { mergeInto } from '../merge';
import { loadAtelier, saveAtelier } from '../persistence';
import { approx } from '$lib/mathAST/reciprocal/image';
import { substitute } from '$lib/mathAST/eval/substitute';

// =============================================================================
// Décor
// =============================================================================

const F_INV = 'f^-1';

function deskWith(...lines: string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const line of lines) desk.submit(line);
	return desk;
}

/** La valeur de la carte `name` en x (valeurs de l'atelier remplacées). */
function valueAt(atelier: Atelier, name: string, x: number): number | null {
	const read = substitutedAstOf(atelier, name);
	return read.ok ? approx(substitute(read.ast, { x })) : null;
}

function last(desk: CalcDesk) {
	return desk.entries.at(-1)!;
}

// =============================================================================
// Le nom
// =============================================================================

describe('le nom de la carte f⁻¹', () => {
	it('se range f^-1, s’affiche f⁻¹, et connaît sa fonction', () => {
		expect(reciprocalName('f')).toBe(F_INV);
		expect(displayName(F_INV)).toBe('f⁻¹');
		expect(reciprocalOf(F_INV)).toBe('f');
		expect(reciprocalOf('u_1^-1')).toBe('u_1');
		expect(reciprocalOf('f')).toBeNull();
		expect(reciprocalOf('x^-1')).toBeNull();
	});

	it('aucun élève ne peut prendre ce nom : pas de collision', () => {
		expect(validateName(F_INV, [])).toBe('malformed');
	});
});

// =============================================================================
// Cas nominaux (tableau de la phase 0)
// =============================================================================

describe('.réciproque f : la carte f⁻¹ et la ligne de Calcul', () => {
	it.each([
		['2x+3', null, [1, 5, -7], '\\mathbb{R} \\to \\mathbb{R}', null],
		['(2x+1)/(x-3)', null, [0, 5, -7], '\\setminus', 'ℝ \\ {2}'],
		['x^3', null, [8, -27, 2], '\\mathbb{R} \\to \\mathbb{R}', null],
		['e^(2x+1)', null, [1, 5, 0.5], ']0 ; +\\infty[ \\to \\mathbb{R}', ']0 ; +∞['],
		['ln(x-1)', null, [0, 2, -3], '\\mathbb{R} \\to ]1 ; +\\infty[', null],
		['sqrt(x+2)', null, [0, 1, 3], '[0 ; +\\infty[ \\to [-2 ; +\\infty[', '[0 ; +∞['],
		['x^2', '[0;+∞[', [0, 4, 9], '[0 ; +\\infty[ \\to [0 ; +\\infty[', '[0 ; +∞['],
		['x^2', ']-∞;0]', [0, 4, 9], '[0 ; +\\infty[ \\to ]-\\infty ; 0]', '[0 ; +∞[']
	])('f(x) = %s sur %s', (definition, on, points, sets, departure) => {
		const desk = deskWith(`f(x) = ${definition}`);
		desk.submit(on === null ? '.réciproque f' : `.réciproque f sur ${on}`);
		const line = last(desk);
		expect(line.failed).toBe(false);
		// R3 : y = f(x) ⇔ x = …, le renommage, les ensembles
		expect(line.steps?.map((s) => s.rule)).toHaveLength(3);
		expect(line.latex).toContain('f^{-1}');
		// R4 : la ligne dit de quel ensemble à quel ensemble
		expect(line.latex).toContain(sets);

		const card = desk.atelier.get(F_INV);
		expect(card?.status).toBe('ok');
		// f(f⁻¹(y)) = y sur trois points du départ
		for (const y of points) {
			const x = valueAt(desk.atelier, F_INV, y);
			expect(x).not.toBeNull();
			expect(valueAt(desk.atelier, 'f', x!)).toBeCloseTo(y, 9);
		}
		// Q5 : la carte porte son ensemble de départ
		expect(card === undefined ? null : intervalLabelOf(card)).toBe(
			departure === null ? null : departure.replace(/-/g, '−')
		);
	});

	it('√(x + 2) : f⁻¹ se trace sur [0 ; +∞[, pas sur tout ℝ (Q5)', () => {
		const desk = deskWith('f(x) = sqrt(x+2)', '.réciproque f');
		expect(plotRestrictionOf(desk.atelier.get(F_INV))).toEqual([
			{ from: 0, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});

	it('x² sur [0 ; +∞[ tapé sur la carte de f : la carte f⁻¹ prend cet intervalle', () => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', '.réciproque f');
		expect(last(desk).failed).toBe(false);
		expect(valueAt(desk.atelier, F_INV, 9)).toBeCloseTo(3, 9);
	});

	// Revue de #1328 : « sur I » est CROISÉ avec l'ensemble de f, jamais substitué
	it('« sur I » tapé sur une f sans ensemble : f⁻¹ = −√x sur ]−∞ ; 0]', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f sur ]-∞;0]');
		expect(valueAt(desk.atelier, F_INV, 9)).toBeCloseTo(-3, 9);
	});

	it.each([']-∞;0[', '[-4;-1]'])('f sur [0 ; +∞[ puis « sur %s » : vide, refus (pas −√x)', (on) => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', `.réciproque f sur ${on}`);
		expect(last(desk)).toMatchObject({
			failed: true,
			text: "f n'est définie que sur [0 ; +∞[."
		});
		expect(desk.atelier.get(F_INV)).toBeUndefined();
	});

	it('f sur [0 ; +∞[ puis « sur [−1 ; 2] » : √x, sur [0 ; 2] croisé', () => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', '.réciproque f sur [-1;2]');
		expect(last(desk).failed).toBe(false);
		expect(valueAt(desk.atelier, F_INV, 4)).toBeCloseTo(2, 9);
		expect(intervalLabelOf(desk.atelier.get(F_INV)!)).toBe('[0 ; 4]');
	});

	// Revue de #1328 (M1) : l'intersection réduite à {0} faisait dire « fonction constante »
	it('f sur [0 ; +∞[ puis « sur ]-∞;0] » : il ne reste que 0, refus qui le dit', () => {
		const desk = deskWith('f(x) = x^2 sur [0;+∞[', '.réciproque f sur ]-∞;0]');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: "f n'est définie que sur [0 ; +∞[ : sur ]−∞ ; 0], il ne reste que 0."
		});
	});

	it('f redéfinie après « sur I » : l’intersection est recalculée', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f sur [-1;2]');
		expect(last(desk).failed).toBe(true); // x² n'est pas bijective sur [−1 ; 2]
		desk.submit('.réciproque f sur [-3;-1]');
		expect(valueAt(desk.atelier, F_INV, 4)).toBeCloseTo(-2, 9);
		desk.submit('f(x) = x^2 sur [0;+∞[');
		const card = desk.atelier.get(F_INV)!;
		expect(card.status).toBe('error');
		expect(card.message).toBe("f n'est définie que sur [0 ; +∞[.");
	});

	it('la lettre de l’élève : f(t) = 2t + 3 donne f⁻¹(t)', () => {
		const desk = deskWith('f(t) = 2t+3', '.réciproque f');
		expect(last(desk).latex).toContain('f^{-1}\\left( t \\right)');
		const card = desk.atelier.get(F_INV)!;
		expect(typedLetterOf(desk.atelier, card)).toBe('t');
		expect(valueAt(desk.atelier, F_INV, 5)).toBeCloseTo(1, 9);
	});

	it('une expression : la ligne seule, aucune carte', () => {
		const desk = deskWith('.réciproque 2x+3');
		expect(last(desk).failed).toBe(false);
		expect(last(desk).latex).toContain('\\dfrac{x - 3}{2}');
		expect(desk.atelier.objects).toHaveLength(0);
	});
});

// =============================================================================
// Le bouton (R1)
// =============================================================================

describe('le bouton « Réciproque »', () => {
	it('est proposé sur la carte d’une fonction', () => {
		const desk = deskWith('f(x) = 2x+3');
		const action = actionsFor(desk.atelier.get('f')!, desk.atelier).find(
			(a) => a.id === 'reciprocal'
		);
		expect(action).toMatchObject({ label: 'Réciproque' });
		expect(action?.disabledReason).toBeUndefined();
	});

	it('écrit la ligne et crée la carte, comme la commande', () => {
		const desk = deskWith('f(x) = 2x+3');
		expect(desk.runFromPanel('reciprocal', 'f')).toBe('ok');
		expect(last(desk)).toMatchObject({ label: 'Réciproque f', failed: false });
		expect(last(desk).latex).toContain('\\dfrac{x - 3}{2}');
		expect(desk.atelier.get(F_INV)?.status).toBe('ok');
	});

	it('f tracée : f⁻¹ l’est aussi', () => {
		const desk = deskWith('f(x) = 2x+3');
		desk.atelier.setPlotted('f', true);
		desk.runFromPanel('reciprocal', 'f');
		expect(desk.atelier.get(F_INV)?.plotted).toBe(true);
	});

	it('sur la carte f⁻¹ : ni réciproque ni dérivée, avec la raison', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f');
		const actions = actionsFor(desk.atelier.get(F_INV)!, desk.atelier);
		expect(actions.find((a) => a.id === 'reciprocal')?.disabledReason).toBe(
			'La réciproque de f⁻¹, c’est f.'.replace('’', "'")
		);
		expect(actions.find((a) => a.id === 'derive')?.disabledReason).toContain('.dériver');
	});

	it('« Variations » sur la carte f⁻¹ : sur son ensemble, nommée f^{-1} en LaTeX', () => {
		const desk = deskWith('f(x) = e^(2x+1)', '.réciproque f');
		desk.runFromPanel('variations', F_INV);
		const line = last(desk);
		const written = [line.latex, ...(line.steps ?? []).map((s) => s.expressionLatex)].join(' ');
		expect(written).toContain('f^{-1}');
		expect(written).not.toContain('f^-1');
		expect(written).toContain(']0 ; +\\infty[');
	});

	it('l’image sur la carte f⁻¹ se calcule (f⁻¹(5) = 1)', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f');
		expect(desk.image(F_INV, '5')).toEqual({ text: '1', failed: false });
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('les refus : en français, sans carte', () => {
	it('x² sur ℝ : explique, liste les deux réciproques en formules', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f');
		const line = last(desk);
		expect(line.failed).toBe(true);
		expect(line.formulas).toBe(true);
		expect(line.text).toContain('f(-1) = f(1) = 1');
		expect(line.text).toContain('$f^{-1}\\left( x \\right) = -\\sqrt{x}$');
		expect(line.text).toContain('$f^{-1}\\left( x \\right) = \\sqrt{x}$');
		expect(desk.atelier.get(F_INV)).toBeUndefined();
	});

	it('x eˣ sur [−1 ; +∞[ : le moteur ne sait pas, il le dit', () => {
		const desk = deskWith('f(x) = x e^x', '.réciproque f sur [-1;+∞[');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: 'Je ne sais pas calculer la réciproque de f algébriquement.'
		});
		expect(desk.atelier.get(F_INV)).toBeUndefined();
	});

	it('f = 5 : une fonction constante n’a pas de réciproque', () => {
		const desk = deskWith('f(x) = 5', '.réciproque f');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: "Une fonction constante n'a pas de réciproque."
		});
	});

	it.each([
		['a = 3', '.réciproque a', 'une valeur'],
		['u(n) = 2n+1', '.réciproque u', 'une suite'],
		['L = 1 ; 2 ; 3', '.réciproque L', 'une liste']
	])('%s puis %s : refus qui nomme le type', (definition, command, kind) => {
		const desk = deskWith(definition, command);
		expect(last(desk).failed).toBe(true);
		expect(last(desk).text).toContain(kind);
	});

	it('un nom qui n’existe pas', () => {
		const desk = deskWith('.réciproque g');
		expect(last(desk)).toMatchObject({ failed: true, text: "« g » n'existe pas dans l'atelier." });
	});

	it.each(['f^-1', 'f^{-1}', 'f^(-1)', 'f⁻¹', 'f^{-1}(x)'])(
		'.réciproque %s : la réciproque de f⁻¹, c’est f (jamais « constante »)',
		(written) => {
			const desk = deskWith('f(x) = 2x+3', '.réciproque f', `.réciproque ${written}`);
			expect(last(desk)).toMatchObject({ failed: true, text: "La réciproque de f⁻¹, c'est f." });
		}
	);

	it('x^-1, e^-1, f(x)^-1 restent des puissances', () => {
		const desk = deskWith('f(x) = 2x+3', 'x^-1', 'e^-1', '.simplifier f(x)^-1');
		expect(desk.entries.slice(-3).every((e) => !e.failed)).toBe(true);
	});

	it('le bouton garde l’intervalle tapé avant pour la carte f⁻¹ (revue)', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f sur [0;+∞[');
		desk.runFromPanel('reciprocal', 'f');
		expect(last(desk).failed).toBe(false);
		expect(desk.atelier.get(F_INV)).toMatchObject({ status: 'ok', reciprocalOn: '[0;+∞[' });
	});

	it('la carte f⁻¹ existante n’est pas doublée', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f', '.réciproque f');
		expect(desk.atelier.names.filter((n) => n === F_INV)).toHaveLength(1);
		expect(last(desk).note).toBe('f⁻¹ existe déjà.');
	});
});

// =============================================================================
// La carte suit f
// =============================================================================

describe('la carte f⁻¹ suit f', () => {
	it('f modifiée : la formule suit', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f', 'f(x) = 3x-1');
		expect(valueAt(desk.atelier, F_INV, 5)).toBeCloseTo(2, 9);
	});

	it('f devenue non bijective : la carte dit pourquoi, sans formule ; puis revient', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f', 'f(x) = x^2');
		const card = desk.atelier.get(F_INV)!;
		expect(card.status).toBe('error');
		expect(card.message).toContain("n'est pas bijective");
		expect(card.definition).toBe('');
		desk.submit('f(x) = x^3');
		expect(desk.atelier.get(F_INV)?.status).toBe('ok');
		expect(valueAt(desk.atelier, F_INV, 8)).toBeCloseTo(2, 9);
	});

	it('supprimer f emporte f⁻¹ (règle des dépendants, #828)', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f');
		expect(desk.atelier.removalOf('f')).toEqual([F_INV]);
		desk.remove('f');
		expect(desk.atelier.names).toEqual([]);
	});

	it('renommer f renomme f⁻¹', () => {
		const desk = deskWith('f(x) = 2x+3', '.réciproque f');
		expect(desk.atelier.rename('f', 'g').ok).toBe(true);
		expect(desk.atelier.names).toEqual(['g', 'g^-1']);
		expect(desk.atelier.get('g^-1')?.status).toBe('ok');
		expect(desk.atelier.rename('g^-1', 'h').ok).toBe(false);
	});
});

// =============================================================================
// Paramètres (cas 1 de David)
// =============================================================================

describe('f cite des valeurs à curseur : la formule garde les lettres', () => {
	function withParameters(): CalcDesk {
		return deskWith('a = 2', 'b = 3', 'f(x) = a x + b', '.réciproque f');
	}

	it('f(x) = a x + b : f⁻¹(x) = (x − b)/a, qui suit les curseurs', () => {
		const desk = withParameters();
		const card = desk.atelier.get(F_INV)!;
		expect(card.status).toBe('ok');
		expect(card.definition).toMatch(/a/);
		expect(card.definition).toMatch(/b/);
		expect(valueAt(desk.atelier, F_INV, 5)).toBeCloseTo(1, 9);
		desk.atelier.slideTo('a', 4);
		expect(valueAt(desk.atelier, F_INV, 7)).toBeCloseTo(1, 9);
	});

	it('a = 0 : « pour a = 0, f est constante : pas de réciproque », puis elle revient', () => {
		const desk = withParameters();
		desk.atelier.slideTo('a', 0);
		const card = desk.atelier.get(F_INV)!;
		expect(card.status).toBe('error');
		expect(card.message).toBe('Pour a = 0 et b = 3, f est constante : pas de réciproque.');
		desk.atelier.slideTo('a', 1);
		expect(desk.atelier.get(F_INV)?.status).toBe('ok');
		expect(valueAt(desk.atelier, F_INV, 5)).toBeCloseTo(2, 9);
	});

	it('la ligne de Calcul dit avec quelles valeurs les étapes sont faites', () => {
		const desk = withParameters();
		expect(last(desk).note).toContain('a = 2 et b = 3');
	});
});

// =============================================================================
// Rechargement, lien, fusion
// =============================================================================

describe('f⁻¹ se recrée comme f′ : sa formule n’est pas rangée', () => {
	it('rangée sans formule, avec l’intervalle tapé ; relue, elle se recalcule', () => {
		const desk = deskWith('f(x) = x^2', '.réciproque f sur ]-∞;0]');
		const state = desk.atelier.serialize();
		const stored = state.objects.find((o) => o.name === F_INV);
		expect(stored).toMatchObject({ definition: '', reciprocalOn: ']-∞;0]' });
		expect(stored).not.toHaveProperty('interval');

		const memory = new Map<string, string>();
		const storage = {
			getItem: (key: string) => memory.get(key) ?? null,
			setItem: (key: string, value: string) => void memory.set(key, value),
			removeItem: (key: string) => void memory.delete(key)
		} as Storage;
		expect(saveAtelier(storage, state).kind).toBe('saved');
		const read = loadAtelier(storage);
		expect(read.kind).toBe('loaded');
		const reloaded = new Atelier();
		reloaded.restore(read.kind === 'loaded' ? read.state : state);
		expect(reloaded.get(F_INV)?.status).toBe('ok');
		expect(valueAt(reloaded, F_INV, 9)).toBeCloseTo(-3, 9);
	});

	it('fusion : une f refusée n’emmène pas sa réciproque sur la f locale (revue)', () => {
		// La f envoyée manque (refusée, abîmée) : seule sa réciproque arrive
		const sent = deskWith('f(x) = x^2', '.réciproque f sur [0;+∞[').atelier.serialize();
		const mine = deskWith('f(x) = 2x+3').atelier;
		const report = mergeInto(mine, {
			...sent,
			objects: sent.objects.filter((o) => o.name !== 'f')
		});
		expect(mine.names).toEqual(['f']);
		expect(report.refused.map((r) => r.name)).toEqual([F_INV]);
	});

	it('fusion : f arrivée sous le nom g, sa réciproque devient g⁻¹', () => {
		const sent = deskWith('f(x) = 2x+3', '.réciproque f').atelier.serialize();
		const mine = deskWith('f(x) = x').atelier;
		mergeInto(mine, sent);
		expect(mine.names).toEqual(['f', 'g', 'g^-1']);
		expect(valueAt(mine, 'g^-1', 5)).toBeCloseTo(1, 9);
	});
});
