/**
 * Atelier — une fonction définie sur un intervalle, lot 2 (les calculs).
 *
 * Phase 0 `docs/archive/wip/atelier-intervalle-phase0.md` (I4, validée par David le
 * 2026-10-13) : `.variations`, `.résoudre` et leurs actions de carte
 * travaillent sur l'ensemble de la fonction ; `f′` hérite de l'ensemble de f.
 * Tout passe par les vrais chemins : `CalcDesk.submit` (la vue Calcul),
 * `CalcDesk.runFromPanel` (les actions des cartes), `Atelier.serialize`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { intervalLabelOf } from '../interval';
import type { Entry } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

function desk(...definitions: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const definition of definitions) {
		d.submit(definition);
		if (d.entries.at(-1)?.failed) throw new Error(`définition refusée : ${definition}`);
	}
	return d;
}

function last(d: CalcDesk): Entry {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return entry;
}

/** Tout ce que la ligne montre : réponse, texte, étapes. */
function shown(entry: Entry): string {
	return [
		entry.latex ?? '',
		entry.text,
		...(entry.steps ?? []).map((s) => `${s.title} ${s.expressionLatex ?? ''}`)
	].join('\n');
}

// =============================================================================
// .variations
// =============================================================================

describe('.variations sur l’ensemble de la fonction', () => {
	it('f = x² sur [0;+∞[ : croissante, tableau de 0 à +∞, 0 compris', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.variations f');
		const entry = last(d);
		expect(entry.failed).toBe(false);
		expect(entry.table?.domain).toEqual([{ expression: '0' }, { expression: '+\\infty' }]);
		expect(shown(entry)).not.toContain('décroissante');
		expect(entry.text).toContain('Domaine : [0 ; +∞[');
	});

	it('l’action « Variations » de la carte dit la même chose', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.runFromPanel('variations', 'f');
		const entry = last(d);
		expect(entry.table?.domain).toEqual([{ expression: '0' }, { expression: '+\\infty' }]);
		expect(shown(entry)).not.toContain('décroissante');
	});

	it('g = 1/x sur ]0;5] : 0 exclu, 5 compris', () => {
		const d = desk('g(x) = 1/x sur ]0;5]');
		d.submit('.variations g');
		expect(last(d).table?.domain).toEqual([{ expression: '0', open: true }, { expression: '5' }]);
	});

	it('la lettre choisie : f(t) = t² sur [0;1]', () => {
		const d = desk('f(t) = t^2 sur [0;1]');
		d.submit('.variations f');
		expect(last(d).table?.domain).toEqual([{ expression: '0' }, { expression: '1' }]);
	});

	it('`dans` tapé se combine avec l’ensemble de f (intersection)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.variations f dans [-3;2]');
		expect(last(d).table?.domain).toEqual([{ expression: '0' }, { expression: '2' }]);
	});

	it('`dans` tapé sur une expression : x² sur [0;+∞[', () => {
		const d = desk();
		d.submit('.variations x^2 dans [0;+∞[');
		expect(last(d).table?.domain).toEqual([{ expression: '0' }, { expression: '+\\infty' }]);
	});
});

// =============================================================================
// .résoudre
// =============================================================================

describe('.résoudre sur l’ensemble de la fonction', () => {
	it('f = x² sur [0;+∞[ : f(x) = 4 donne 2, pas −2, étapes comprises', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.résoudre f(x)=4');
		const entry = last(d);
		expect(entry.failed).toBe(false);
		expect(entry.latex).toBe('x = 2');
		expect(entry.text).not.toContain('-2');
		// Les étapes résolvent sur ℝ, puis gardent ce qui est dans l'ensemble
		expect(entry.steps?.at(-1)?.title).toContain('[0 ; +∞[');
		expect(entry.steps?.at(-1)?.expressionLatex).toBe('x = 2');
	});

	it('l’action « Résoudre f(x) = 0 » de la carte', () => {
		const d = desk('f(x) = x^2-4 sur [0;+∞[');
		d.runFromPanel('solve', 'f');
		expect(last(d).latex).toBe('x = 2');
	});

	it('aucune solution dans l’ensemble : S = ∅', () => {
		const d = desk('f(x) = x+1 sur [0;5]');
		d.submit('.résoudre f(x)=0');
		expect(last(d).latex).toBe('S = \\emptyset');
	});

	it('`dans` tapé se combine avec l’ensemble de f', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.résoudre f(x)=4 dans [1;5]');
		expect(last(d).latex).toBe('x = 2');
		d.submit('.résoudre f(x)=4 dans [-5;1]');
		expect(last(d).latex).toBe('S = \\emptyset');
	});

	it('une inéquation : f(x) > 1 sur [0;+∞[ donne ]1 ; +∞[', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.résoudre f(x) > 1');
		const entry = last(d);
		expect(entry.failed).toBe(false);
		expect(entry.latex?.replace(/\\left|\\right/g, '')).toContain(']1 ; +\\infty[');
		expect(entry.latex).not.toContain('-1');
	});

	it('la lettre choisie : f(t) = t² sur [0;+∞[', () => {
		const d = desk('f(t) = t^2 sur [0;+∞[');
		d.submit('.résoudre f(t)=4');
		expect(last(d).latex).toBe('t = 2');
	});

	it('une réunion : h(x) = x sur [−1;1] ∪ [2;3]', () => {
		const d = desk('h(x) = x sur [−1;1] ∪ [2;3]');
		d.submit('.résoudre h(x)=1.5');
		expect(last(d).latex).toBe('S = \\emptyset');
		d.submit('.résoudre h(x)=2.5');
		expect(last(d).latex).toMatch(/^x = /);
	});

	it('`dans [0 ; +∞[` tapé sur une expression : x² = 4 donne 2', () => {
		const d = desk();
		d.submit('.résoudre x^2=4 dans [0;+∞[');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('x = 2');
	});
});

describe('suites de revue', () => {
	it('une équation périodique sur un ensemble non borné : refus honnête, pas une réponse finie', () => {
		const d = desk('f(x) = sin(x) sur [0;+∞[');
		d.submit('.résoudre f(x)=0');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain('infinité');
		d.runFromPanel('solve', 'f');
		expect(last(d).failed).toBe(true);
		d.submit('.résoudre sin(x)=0 dans [0;+∞[');
		expect(last(d).failed).toBe(true);
		// Borné : les solutions comme avant
		d.submit('.résoudre sin(x)=0 dans [0;4]');
		expect(last(d).failed).toBe(false);
	});

	it('f(2x) : f appelée sur autre chose que l’inconnue est refusée, pas résolue sur ℝ', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.résoudre f(2x)=4');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain('f(2x)');
	});

	it('f(a) avec a une valeur : un nombre, l’inconnue n’est pas restreinte', () => {
		const d = desk('a = 3', 'f(x) = x^2 sur [0;+∞[');
		d.submit('.résoudre f(a) = -x');
		expect(last(d).latex).toBe('x = -9');
	});

	it('`dans [0;+∞[ pour t` tapé dans cet ordre', () => {
		const d = desk();
		d.submit('.résoudre t^2=4 dans [0;+∞[ pour t');
		expect(last(d).latex).toBe('t = 2');
		d.submit('.variations t^2 dans [0;+∞[ pour t');
		expect(last(d).failed).toBe(false);
		expect(last(d).table?.domain).toEqual([{ expression: '0' }, { expression: '+\\infty' }]);
	});
});

// =============================================================================
// f′ hérite de l'ensemble de f
// =============================================================================

describe('f′ hérite de l’ensemble de f', () => {
	it('« Dériver » : la carte f′ porte l’ensemble de f', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.runFromPanel('derive', 'f');
		const derived = d.atelier.get("f'");
		expect(derived).toBeDefined();
		expect(intervalLabelOf(derived!)).toBe('[0 ; +∞[');
	});

	it('`.dériver f` aussi', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.dériver f');
		expect(intervalLabelOf(d.atelier.get("f'")!)).toBe('[0 ; +∞[');
	});

	it('l’ensemble de f′ suit celui de f, et disparaît avec lui', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.dériver f');
		d.submit('f(x) = x^2 sur [1;2]');
		expect(intervalLabelOf(d.atelier.get("f'")!)).toBe('[1 ; 2]');
		d.submit('f(x) = x^2');
		expect(intervalLabelOf(d.atelier.get("f'")!)).toBeNull();
	});

	it('f′(5) hors de l’ensemble est refusé, comme f(5) — carte ou pas', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.submit("f'(5)");
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("5 n'est pas dans l'ensemble de définition de f′, [0 ; 2].");
		d.submit("f'(1)");
		expect(last(d).failed).toBe(false);
		d.submit('.dériver f');
		d.submit("f'(5)");
		expect(last(d).failed).toBe(true);
	});

	it('l’image de f′ depuis sa carte', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.submit('.dériver f');
		d.image("f'", '5');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("5 n'est pas dans l'ensemble de définition de f′, [0 ; 2].");
	});

	it('.résoudre f′(x) = 0 : sur l’ensemble de f', () => {
		const d = desk('f(x) = x^3-3x sur [0;+∞[');
		d.submit(".résoudre f'(x)=0");
		expect(last(d).latex).toBe('x = 1');
	});

	it('l’ensemble de f′ n’est pas sauvegardé : il se relit sur f', () => {
		const atelier = new Atelier();
		const d = new CalcDesk(atelier);
		d.submit('f(x) = x^2 sur [0;+∞[');
		d.submit('.dériver f');
		const saved = atelier.serialize();
		const derived = saved.objects.find((o) => o.name === "f'");
		expect(derived).toBeDefined();
		expect('interval' in derived!).toBe(false);
		const restored = new Atelier();
		restored.restore(saved);
		expect(intervalLabelOf(restored.get("f'")!)).toBe('[0 ; +∞[');
	});
});

// =============================================================================
// Sans intervalle : rien ne change
// =============================================================================

describe('une fonction sans intervalle : comme avant', () => {
	it('.variations, .résoudre, les actions', () => {
		const d = desk('f(x) = x^2');
		d.submit('.variations f');
		expect(shown(last(d))).toContain('décroissante');
		d.submit('.résoudre f(x)=4');
		expect(last(d).latex).toBe('S = \\left\\{ -2 \\,;\\, 2 \\right\\}');
		d.runFromPanel('derive', 'f');
		expect(intervalLabelOf(d.atelier.get("f'")!)).toBeNull();
	});

	it('le moteur seul ne connaît pas l’ensemble (rien ne fuit hors de l’atelier)', () => {
		const engine = new WebReplEngine();
		const result = engine.execute('.solve x^2=4');
		expect(result.output).toContain('-2');
	});
});
