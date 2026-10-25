/**
 * Atelier — une fonction définie sur un intervalle, lot 1 (modèle et saisie).
 *
 * Phase 0 `docs/wip/atelier-intervalle-phase0.md`, validée par David le
 * 2026-10-13 (I1-I6 selon les recos). Tout passe par les vrais chemins :
 * `CalcDesk.submit` (la vue Calcul), `Atelier.update` (la carte), la
 * sauvegarde locale et le lien de partage.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { runAction } from '../calcul';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { encodeAtelier, decodeAtelier } from '../url';
import { loadAtelier, saveAtelier } from '../persistence';
import { fieldLatexOf } from '../mathfield';
import { keepReceived } from '../merge';
import {
	intervalLabelOf,
	readInterval,
	splitInterval,
	UNREADABLE_INTERVAL,
	ONLY_FUNCTIONS
} from '../interval';

// =============================================================================
// Décor
// =============================================================================

function desk(): CalcDesk {
	return new CalcDesk(new Atelier());
}

/** La dernière ligne de Calcul : son texte, et si c'est un refus. */
function last(d: CalcDesk): { text: string; failed: boolean } {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return { text: entry.text, failed: entry.failed };
}

function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		setItem: (k: string, v: string) => void map.set(k, v)
	} as Storage;
}

// =============================================================================
// Écriture (I1, I2)
// =============================================================================

describe('le mot « sur » coupe la définition', () => {
	it.each([
		['x^2 - 2 sur [0;+∞[', 'detect', 'x^2 - 2', '[0;+∞['],
		['x^2sur[0;+\\infty[', 'latex', 'x^2', '[0;+\\infty['],
		[
			'\\ln xsur\\left\\lbrack1;2\\right\\rbrack',
			'latex',
			'\\ln x',
			'\\left\\lbrack1;2\\right\\rbrack'
		],
		['x^2\\text{ sur }[0;1]', 'latex', 'x^2', '[0;1]'],
		['xsurR', 'latex', 'x', 'R']
	] as const)('%s → %s | %s', (typed, mode, body, written) => {
		expect(splitInterval(typed, mode)).toEqual({ body, written });
	});

	it.each([
		['surface', 'latex'],
		['x\\surd', 'latex'],
		['xsurface', 'detect']
	] as const)('%s n’est pas coupé (%s)', (typed, mode) => {
		expect(splitInterval(typed, mode).written).toBeNull();
	});
});

// Seconde revue : « sur » ne coupe que s'il est SUIVI d'un ensemble ; sinon la
// saisie reste entière, exactement comme avant le lot 1 (`written` nul ⇒ même chemin)
describe('« sur » sans ensemble derrière : la saisie reste entière', () => {
	it.each([
		['sur', 'detect'],
		['3 sur 4', 'detect'],
		['x sur 2', 'detect'],
		['2sur', 'latex'],
		['xsur', 'latex'],
		['x\\cdot sur', 'latex'],
		['sur^2', 'latex'],
		['x^{sur}', 'latex'],
		['\\text{surélevé}', 'latex'],
		// `\left(` et `\left|` : MathLive les écrit à chaque parenthèse (smartFence)
		['sur\\left(x+1\\right)', 'latex'],
		['sur\\left|x\\right|', 'latex']
	] as const)('%s (%s)', (typed, mode) => {
		expect(splitInterval(typed, mode)).toEqual({ body: typed, written: null });
	});

	it.each(['h(x) = sur', 'p = sur', 'a = 3 sur 4', 'f(x) = x sur 2'])(
		'Calcul : %s n’est pas refusé pour un intervalle',
		(typed) => {
			const d = desk();
			for (const name of ['s', 'u', 'r']) d.submit(`${name} = 2`);
			d.submit(typed);

			expect([UNREADABLE_INTERVAL, ONLY_FUNCTIONS]).not.toContain(last(d).text);
			// L'objet est rangé (pas un refus de saisie) ; « 3 sur 4 » illisible met
			// sa carte en erreur (« x sur 2 » aussi), et la ligne le dit depuis le 2026-10-13
			expect(last(d).text).toMatch(
				/^(« [a-z] » est dans tes objets|[a-z] est correctement défini)/
			);
			expect(d.atelier.get(typed.charAt(0))).toBeDefined();
			expect(last(d).failed).toBe(typed.includes(' sur ') && !typed.endsWith('sur'));
		}
	);
});

describe('les ensembles lus (I2)', () => {
	it.each([
		['[0;+∞[', '[0 ; +∞['],
		['[0;+\\infty[', '[0 ; +∞['],
		[']0;5]', ']0 ; 5]'],
		['[-1;1] ∪ [2;3]', '[−1 ; 1] ∪ [2 ; 3]'],
		['ℝ \\ {0}', 'ℝ \\ {0}'],
		['\\R\\setminus\\{0\\}', 'ℝ \\ {0}'],
		['\\left\\lbrack0;1\\right\\rbrack', '[0 ; 1]'],
		['x > 0', ']0 ; +∞[']
	])('%s', (written, shown) => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'x', interval: written },
			'text'
		);
		expect(created.ok).toBe(true);
		expect(intervalLabelOf(atelier.get('f')!)).toBe(shown);
	});

	it('sur ℝ : rien n’est rangé', () => {
		expect(readInterval('ℝ')).toEqual({ ok: true, domain: null });
		expect(readInterval('\\R')).toEqual({ ok: true, domain: null });
	});

	it('+oo n’est pas lu : le refus montre l’écriture attendue', () => {
		expect(readInterval('[0;+oo[')).toEqual({ ok: false, message: UNREADABLE_INTERVAL });
	});
});

// =============================================================================
// Calcul : cas nominaux
// =============================================================================

describe('Calcul : f(x) = x^2 sur [0;+∞[', () => {
	it('crée la fonction avec son ensemble, la définition sans « sur »', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;+∞[');

		const f = d.atelier.get('f');
		expect(last(d).failed).toBe(false);
		expect(f?.kind).toBe('function');
		expect(f?.definition).toBe('x^2');
		expect(f?.status).toBe('ok');
		expect(intervalLabelOf(f!)).toBe('[0 ; +∞[');
	});

	it('f(1) vaut 1', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;+∞[');
		d.submit('f(1)');

		expect(last(d)).toEqual({ text: '1', failed: false });
	});

	it('g(x) = x+1 sur ]0;5] : ensemble lu', () => {
		const d = desk();
		d.submit('g(x) = x+1 sur ]0;5]');

		expect(intervalLabelOf(d.atelier.get('g')!)).toBe(']0 ; 5]');
	});

	it('h(x) = x sur [−1;1] ∪ [2;3] : réunion lue', () => {
		const d = desk();
		d.submit('h(x) = x sur [−1;1] ∪ [2;3]');

		expect(intervalLabelOf(d.atelier.get('h')!)).toBe('[−1 ; 1] ∪ [2 ; 3]');
	});

	it('k(x) = 1/x sur ]0;5] : accepté (0 est exclu)', () => {
		const d = desk();
		d.submit('k(x) = 1/x sur ]0;5]');

		expect(last(d).failed).toBe(false);
		expect(intervalLabelOf(d.atelier.get('k')!)).toBe(']0 ; 5]');
	});

	it('la lettre choisie : f(t) = t^2 sur [0;1]', () => {
		const d = desk();
		d.submit('f(t) = t^2 sur [0;1]');

		const f = d.atelier.get('f');
		expect(f?.definition).toBe('x^2');
		expect(f?.kind === 'function' && f.letter).toBe('t');
		expect(intervalLabelOf(f!)).toBe('[0 ; 1]');
	});

	it('sur ℝ : accepté, rien de plus', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur ℝ');

		const f = d.atelier.get('f');
		expect(last(d).failed).toBe(false);
		expect(f?.kind === 'function' && f.interval).toBeUndefined();
		expect(intervalLabelOf(f!)).toBeNull();
	});

	it('retapée sans « sur » : l’intervalle est retiré (I6)', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;1]');
		d.submit('f(x) = x^2');

		expect(intervalLabelOf(d.atelier.get('f')!)).toBeNull();
		d.submit('f(5)');
		expect(last(d)).toEqual({ text: '25', failed: false });
	});

	it('se trace toujours (sur tout son domaine pour l’instant)', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;+∞[');
		const graph = new GrapheurStore();

		syncPlots(d.atelier, graph);

		expect(graph.functions).toHaveLength(1);
	});

	it('les commandes marchent comme avant', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;+∞[');
		d.submit('.dériver f');

		expect(last(d).failed).toBe(false);
		expect(d.atelier.get("f'")).toBeDefined();
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('Calcul : refus', () => {
	it('I3 : ln x sur [−1;2] déborde du domaine, le point fautif est nommé', () => {
		const d = desk();
		d.submit('f(x) = ln(x) sur [−1;2]');

		expect(last(d)).toEqual({
			text: "ln(x) n'est pas défini sur tout [−1 ; 2] (pas en −1).",
			failed: true
		});
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('I3 : 1/x sur [−1;1] (pas en 0)', () => {
		const d = desk();
		d.submit('f(x) = 1/x sur [−1;1]');

		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain('(pas en 0)');
	});

	it('I3 : une fonction déjà là n’est pas modifiée par un ensemble refusé', () => {
		const d = desk();
		d.submit('f(x) = ln(x) sur [1;2]');
		d.submit('f(x) = ln(x) sur [−1;2]');

		expect(last(d).failed).toBe(true);
		expect(intervalLabelOf(d.atelier.get('f')!)).toBe('[1 ; 2]');
	});

	it('I4 : f(5) hors de [0 ; 2]', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;2]');
		d.submit('f(5)');

		expect(last(d)).toEqual({
			text: "5 n'est pas dans l'ensemble de définition de f, [0 ; 2].",
			failed: true
		});
	});

	it('I4 : f(2+3) aussi, f(1) non', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;2]');
		d.submit('f(2+3)');
		expect(last(d).failed).toBe(true);

		d.submit('f(1) + 1');
		expect(last(d)).toEqual({ text: '2', failed: false });
	});

	// Revue du lot 1 : I4 se contournait par une définition ou une valeur nommée
	it('I4 : a = f(5) est refusé, f(b) avec b = 5 aussi', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;2]');
		d.submit('a = f(5)');
		expect(last(d).failed).toBe(true);
		expect(d.atelier.get('a')).toBeUndefined();

		d.submit('b = 5');
		d.submit('f(b)');
		expect(last(d)).toEqual({
			text: "b n'est pas dans l'ensemble de définition de f, [0 ; 2].",
			failed: true
		});
	});

	it('« sur » sur une valeur déjà là : refusé, pas perdu en silence', () => {
		const d = desk();
		d.submit('a = 3');
		d.submit('a = x^2 sur [0;1]');

		expect(last(d)).toEqual({ text: ONLY_FUNCTIONS, failed: true });
	});

	it('I4 : l’image depuis la carte', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2', interval: '[0;2]' }, 'text');
		const session = { atelier, engine: new WebReplEngine() };

		expect(runAction(session, 'image', 'f', '5')).toEqual({
			ok: false,
			message: "5 n'est pas dans l'ensemble de définition de f, [0 ; 2]."
		});
		expect(runAction(session, 'image', 'f', '1')).toMatchObject({ ok: true, output: '1' });
	});

	it('ensemble illisible', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0,+oo');

		expect(last(d)).toEqual({ text: UNREADABLE_INTERVAL, failed: true });
	});

	it.each([
		['f(x) = x sur ]2;2[', "L'intervalle est vide."],
		['f(x) = x sur [2;2]', "L'intervalle est réduit à un point."]
	])('%s → %s', (typed, message) => {
		const d = desk();
		d.submit(typed);

		expect(last(d)).toEqual({ text: message, failed: true });
	});

	it.each([
		'L = 1 ; 2 ; 3 sur [0;1]',
		'a = 2 sur [0;1]',
		'u(n) = 2n sur [0;5]',
		'u(n+1) = 2u(n) sur [0;5]'
	])('%s : seule une fonction', (typed) => {
		const d = desk();
		d.submit(typed);

		expect(last(d)).toEqual({ text: ONLY_FUNCTIONS, failed: true });
	});
});

// =============================================================================
// La carte (Atelier.update), rechargement, partage
// =============================================================================

describe('la carte', () => {
	it('écrit « sur » en mot dans son champ, l’ensemble à la suite', () => {
		const d = desk();
		d.submit('f(x) = x^2 sur [0;+∞[');

		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		expect(latex).toBe('x^2\\text{ sur }[0;+\\infty[');
		expect(splitInterval(latex, 'latex')).toEqual({ body: 'x^2', written: '[0;+\\infty[' });
	});

	it('l’ensemble d’une réunion et de ℝ \\ {0} se relit depuis le champ', () => {
		for (const typed of ['h(x) = x sur [−1;1] ∪ [2;3]', 'k(x) = x sur ℝ \\ {0}']) {
			const d = desk();
			d.submit(typed);
			const object = d.atelier.objects[0];
			const { written } = splitInterval(fieldLatexOf(object, []), 'latex');
			const again = new Atelier();
			again.create(
				{ kind: 'function', name: 'g', definition: 'x', interval: written ?? '' },
				'keyboard'
			);
			expect(intervalLabelOf(again.get('g')!)).toBe(intervalLabelOf(object));
		}
	});

	it('une borne √2 tapée dans Calcul se relit depuis le champ', () => {
		const d = desk();
		d.submit('f(x) = x sur [0;√2]');
		const before = intervalLabelOf(d.atelier.get('f')!);
		const { written } = splitInterval(fieldLatexOf(d.atelier.get('f')!, []), 'latex');

		expect(d.atelier.update('f', 'x', 'keyboard', undefined, written).ok).toBe(true);
		expect(intervalLabelOf(d.atelier.get('f')!)).toBe(before);
		expect(before).toMatch(/^\[0 ; .*2\]$/);
	});

	it('modifier depuis la carte : null retire l’intervalle (I6)', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2', interval: '[0;1]' }, 'text');

		expect(atelier.update('f', 'x^2', 'keyboard', undefined, null).ok).toBe(true);
		expect(intervalLabelOf(atelier.get('f')!)).toBeNull();
	});

	it('modifier depuis la carte : I3 refusé, rien ne change', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x', interval: '[-1;1]' }, 'text');

		const updated = atelier.update('f', '\\ln x', 'keyboard', undefined, '[-1;1]');
		expect(updated.ok).toBe(false);
		expect(atelier.get('f')?.definition).toBe('x');
	});
});

describe('rechargement et partage', () => {
	function withInterval(): Atelier {
		const d = desk();
		d.submit('f(t) = t^2 sur [0;+∞[');
		return d.atelier;
	}

	it('la sauvegarde locale garde l’intervalle', () => {
		const storage = memoryStorage();
		expect(saveAtelier(storage, withInterval().serialize()).kind).toBe('saved');

		const loaded = loadAtelier(storage);
		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(intervalLabelOf(fresh.get('f')!)).toBe('[0 ; +∞[');
		expect(fresh.get('f')?.kind === 'function' && fresh.get('f')).toMatchObject({ letter: 't' });
	});

	it('le lien de partage garde l’intervalle', async () => {
		const encoded = await encodeAtelier(withInterval().serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const fresh = new Atelier();
		fresh.restore(decoded.state);
		expect(intervalLabelOf(fresh.get('f')!)).toBe('[0 ; +∞[');
	});

	it('« Garder dans mon atelier » garde l’intervalle', () => {
		const storage = memoryStorage();
		keepReceived(storage, withInterval().serialize());

		const loaded = loadAtelier(storage);
		if (loaded.kind !== 'loaded') throw new Error(loaded.kind);
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(intervalLabelOf(fresh.get('f')!)).toBe('[0 ; +∞[');
	});

	it('ensemble ET lettre refusés à la relecture : la fonction est gardée, en x', () => {
		const fresh = new Atelier();
		const report = fresh.restore({
			version: 1,
			objects: [{ name: 'f', kind: 'function', definition: 'x^2', interval: '}}}{{{', letter: 'e' }]
		});

		expect(report.skipped).toEqual([]);
		expect(fresh.get('f')).toMatchObject({ definition: 'x^2' });
		expect(fresh.get('f')?.kind === 'function' && fresh.get('f')).not.toHaveProperty('letter');
	});

	it('un intervalle abîmé dans un lien : la fonction est gardée sur son domaine', () => {
		const fresh = new Atelier();
		const report = fresh.restore({
			version: 1,
			objects: [{ name: 'f', kind: 'function', definition: 'ln(x)', interval: '[-1;2]' }]
		});

		expect(report.skipped).toEqual([]);
		expect(fresh.get('f')?.definition).toBe('ln(x)');
		expect(intervalLabelOf(fresh.get('f')!)).toBeNull();
	});
});
