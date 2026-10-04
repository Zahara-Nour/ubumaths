/**
 * « Dériver » crée la carte `f′` — lot 3a du passage de `/grapheur` par
 * l'atelier.
 *
 * Phase 0 `docs/wip/atelier-grapheur-phase0.md` §2 (D1 à D7, L1 à L4, E1 à
 * E3), décisions G6 et G7 de David : la dérivée s'appelle `f′`, jamais `g`,
 * et elle SUIT `f` (dérivée vivante : le parseur lit `f'` comme la dérivée de
 * `f`, mesuré avant ce lot — `g(x) = f'(x)` valait déjà `2x-3`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { expressionOf } from '../engine';
import { derivativeOf, displayName, isDerivativeName } from '../names';
import { runInput } from '../calcul';
import { CalcDesk } from '../desk.svelte';
import { mergeInto } from '../merge';
import { actionsFor } from '../actions';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

function withF(definition = 'x^2-3x+1'): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition }, 'text');
	return atelier;
}

function expression(atelier: Atelier, name: string): string | undefined {
	const result = expressionOf(atelier, name);
	return result.ok ? result.expression : undefined;
}

// =============================================================================
// Le nom
// =============================================================================

describe('le nom d’une dérivée', () => {
	it.each([
		["f'", true],
		["f''", true],
		["u_1'", true],
		['f', false],
		["f'g", false],
		["x'", false],
		["'f", false]
	])('%s est un nom de dérivée : %s', (name, expected) => {
		expect(isDerivativeName(name)).toBe(expected);
	});

	it('connaît sa fonction et son ordre', () => {
		expect(derivativeOf("f''")).toEqual({ base: 'f', order: 2 });
		expect(derivativeOf('f')).toBeNull();
	});

	it('s’affiche avec le vrai signe prime', () => {
		expect(displayName("f'")).toBe('f′');
		expect(displayName("f''")).toBe('f″');
		expect(displayName('a')).toBe('a');
	});
});

// =============================================================================
// Créer la dérivée
// =============================================================================

describe('créer la carte f′', () => {
	// D1
	it('crée un objet f′ qui vaut la dérivée de f', () => {
		const atelier = withF();

		const result = atelier.createDerivative('f');

		expect(result.ok).toBe(true);
		expect(atelier.names).toContain("f'");
		expect(atelier.get("f'")).toMatchObject({ kind: 'function', status: 'ok' });
		expect(expression(atelier, "f'")).toBe('2x-3');
	});

	// D4 : vivante
	it('suit f quand f change', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		atelier.update('f', 'x^3', 'text');

		expect(expression(atelier, "f'")).toBe('3x^2');
	});

	// D2
	it('est tracée d’office quand f est tracée', () => {
		const atelier = withF();
		atelier.setPlotted('f', true);

		atelier.createDerivative('f');

		expect(atelier.get("f'")?.plotted).toBe(true);
	});

	it('ne l’est pas quand f ne l’est pas', () => {
		const atelier = withF();

		atelier.createDerivative('f');

		expect(atelier.get("f'")?.plotted).toBeFalsy();
	});

	// D6
	it('dériver f′ donne f″', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		atelier.createDerivative("f'");

		expect(atelier.names).toContain("f''");
		expect(expression(atelier, "f''")).toBe('2');
	});

	// L1
	it('ne crée pas de doublon : la carte existante est rendue', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		const again = atelier.createDerivative('f');

		expect(again).toMatchObject({ ok: true, existed: true });
		expect(atelier.names.filter((n) => n === "f'")).toHaveLength(1);
	});

	// E2
	it.each([
		['vide', ''],
		['illisible', '2 + * 3']
	])('refuse de dériver une fonction %s', (_, definition) => {
		const atelier = withF(definition);

		expect(atelier.createDerivative('f').ok).toBe(false);
		expect(atelier.names).not.toContain("f'");
	});

	it('refuse de dériver ce qui n’est pas une fonction', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });

		expect(atelier.createDerivative('a').ok).toBe(false);
		expect(atelier.createDerivative('z').ok).toBe(false);
	});

	// E1 au niveau du modèle : f′ se calcule, elle ne se définit pas
	it('refuse un objet nommé f′ défini autrement que comme la dérivée de f', () => {
		const atelier = withF();

		const result = atelier.create({ kind: 'function', name: "f'", definition: '3x' });

		expect(result.ok).toBe(false);
	});

	// L3
	it('passe en attente quand f est supprimée, et revit quand f revient', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		atelier.remove('f');
		expect(atelier.get("f'")?.status).toBe('pending');

		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		expect(atelier.get("f'")?.status).toBe('ok');
		expect(expression(atelier, "f'")).toBe('2x');
	});

	it('renommer f renomme sa dérivée', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		atelier.rename('f', 'h');

		expect(atelier.names).toContain("h'");
		expect(atelier.names).not.toContain("f'");
		expect(expression(atelier, "h'")).toBe('2x-3');
	});

	it('se range et se relit', () => {
		const atelier = withF();
		atelier.createDerivative('f');

		const fresh = new Atelier();
		const report = fresh.restore(atelier.serialize());

		expect(report.skipped).toEqual([]);
		expect(expression(fresh, "f'")).toBe('2x-3');
	});

	it('suit sa fonction quand un lien est fusionné et que f est renommée', () => {
		const source = withF();
		source.createDerivative('f');
		const target = new Atelier();
		target.create({ kind: 'function', name: 'f', definition: 'x' }, 'text');

		mergeInto(target, source.serialize());

		// `f` arrive sous un autre nom : sa dérivée le suit
		const arrived = target.names.find((n) => n !== 'f' && !n.includes("'"))!;
		expect(target.names).toContain(`${arrived}'`);
		expect(expression(target, `${arrived}'`)).toBe('2x-3');
	});
});

// =============================================================================
// Les deux portes : la carte et la commande
// =============================================================================

describe('« Dériver » et `.dériver f`', () => {
	// D1 + G7 : une carte, ET une ligne dans Calcul
	it('le bouton crée la carte et écrit le calcul dans l’historique', () => {
		const atelier = withF();
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('derive', 'f');

		expect(atelier.names).toContain("f'");
		const last = desk.entries.at(-1);
		expect(last?.failed).toBe(false);
		expect(last?.steps?.length ?? 0).toBeGreaterThan(0);
	});

	// D3
	it('`.dériver f` crée la même carte', () => {
		const atelier = withF();

		runInput({ atelier, engine: new WebReplEngine() }, '.dériver f');

		expect(atelier.names).toContain("f'");
	});

	// L4
	it('`.dériver x^2 + 1` ne crée aucune carte', () => {
		const atelier = new Atelier();

		const result = runInput({ atelier, engine: new WebReplEngine() }, '.dériver x^2 + 1');

		expect(result.kind).toBe('commande');
		expect(atelier.names).toEqual([]);
	});

	// E1
	it("refuse `f'(x) = 3x` tapé dans Calcul, avec une raison", () => {
		const atelier = withF();

		const result = runInput({ atelier, engine: new WebReplEngine() }, "f'(x) = 3x");

		expect(result.kind).toBe('refus');
		if (result.kind === 'refus') expect(result.message).toContain('dérivée');
		expect(atelier.names).not.toContain("f'");
	});

	// Le moteur calcule f′ à partir de f : un objet f′ ne doit pas le dérouter
	it("`f'(2)` se calcule toujours dans Calcul", () => {
		const atelier = withF();
		atelier.createDerivative('f');

		const result = runInput({ atelier, engine: new WebReplEngine() }, "f'(2)");

		expect(result.kind).toBe('calcul');
		expect(JSON.stringify(result)).toContain('1');
	});

	it('« Garder la dérivée » a disparu, « Dériver » la remplace', () => {
		const atelier = withF();

		const labels = actionsFor(atelier.get('f')!, atelier).map((a) => a.id);

		expect(labels).toContain('derive');
		expect(labels).not.toContain('keep-derivative');
	});
});
