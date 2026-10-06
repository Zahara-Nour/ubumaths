/**
 * Atelier — une fonction définie avec une autre lettre que x : `f(t) = t^2`.
 *
 * Décision de David (2026-10-06) : la CARTE garde la lettre de l'élève
 * (définition, champ, rendu), mais l'atelier range la fonction en x — le
 * graphique, les commandes, la composition et la dérivée marchent sans que
 * chaque fonction porte sa propre variable partout.
 *
 * Mesuré sur main le 2026-10-06 : `f(t) = t^2` restait « en attente de t »,
 * sans dire pourquoi.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { CalcDesk } from '../desk.svelte';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';
import { fieldLatexOf } from '../mathfield';
import { letterRejection, studentDefinitionOf, typedLetterOf } from '../letter';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const outputOf = (r: ReturnType<typeof runInput>) =>
	r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind === 'refus' ? r.message : '';

describe('f(t) = t^2 : rangée en x, montrée en t', () => {
	it('se crée saine, sans attendre t', () => {
		const s = session();
		const r = runInput(s, 'f(t) = t^2');

		expect(r.kind).toBe('definition');
		const f = s.atelier.get('f')!;
		expect(f.status).toBe('ok');
		expect(f.missing ?? []).toEqual([]);
	});

	it('f(3) vaut 9', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');

		expect(outputOf(runInput(s, 'f(3)')).replace(/\s/g, '')).toBe('9');
	});

	it('f(2x) se compose en 4x²', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');

		const out = outputOf(runInput(s, '.simplifier f(2x)')).replace(/\s/g, '');
		expect(out).toContain('Simplified:4x^2');
	});

	it('.dériver f crée la carte f′ et rend la dérivée', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');

		const out = outputOf(runInput(s, '.dériver f')).replace(/\s/g, '');
		expect(out).toMatch(/2x$/);
		expect(s.atelier.get("f'")?.status).toBe('ok');
	});

	it('la carte garde la lettre et la définition tapée', () => {
		const s = session();
		runInput(s, 'f(t) = 3t + 1');
		const f = s.atelier.get('f')!;

		expect(typedLetterOf(s.atelier, f)).toBe('t');
		expect(studentDefinitionOf(s.atelier, f)).toBe('3t + 1');
		expect(fieldLatexOf(f, s.atelier.functionNames, 't')).not.toContain('x');
	});

	it('la carte f′ se lit en t', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		runInput(s, '.dériver f');

		expect(typedLetterOf(s.atelier, s.atelier.get("f'")!)).toBe('t');
	});

	it('le grapheur reçoit la courbe en x', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		const graph = new GrapheurStore(null);

		syncPlots(s.atelier, graph);

		const drawn = graph.functions.map((c) => ('latex' in c ? c.latex : ''));
		expect(drawn).toHaveLength(1);
		expect(drawn[0]).toContain('x');
		expect(drawn[0]).not.toContain('t');
	});

	it('f(x) = … reste inchangée (pas de lettre rangée)', () => {
		const s = session();
		runInput(s, 'f(x) = x^2');

		expect(s.atelier.get('f')!.definition).toBe('x^2');
		expect(typedLetterOf(s.atelier, s.atelier.get('f')!)).toBe('x');
	});

	it('redéfinie en x, elle oublie la lettre t', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		runInput(s, 'f(x) = x + 1');

		expect(typedLetterOf(s.atelier, s.atelier.get('f')!)).toBe('x');
		expect(studentDefinitionOf(s.atelier, s.atelier.get('f')!)).toBe('x + 1');
	});

	// ⚠️ Pas `N(s)` : `N(5)` reste non calculé même avec `N(x) = 2x` (mesuré le
	// 2026-10-06, défaut antérieur, hors de ce chantier)
	it('v(s) = 2s : une autre lettre encore', () => {
		const s = session();
		runInput(s, 'v(s) = 2s');

		expect(outputOf(runInput(s, 'v(5)')).replace(/\s/g, '')).toBe('10');
	});
});

describe('refus en français', () => {
	it('lettre déjà prise par un objet : a = 2 puis f(a) = a^2', () => {
		const s = session();
		runInput(s, 'a = 2');
		const r = runInput(s, 'f(a) = a^2');

		expect(r.kind).toBe('refus');
		expect(outputOf(r)).toContain('« a »');
		expect(s.atelier.get('f')).toBeUndefined();
	});

	it('x dans une définition en t : f(t) = t + x', () => {
		const s = session();
		const r = runInput(s, 'f(t) = t + x');

		expect(r.kind).toBe('refus');
		expect(outputOf(r)).toContain('x');
		expect(s.atelier.get('f')).toBeUndefined();
	});

	it.each(['e', 'i'])('lettre réservée : f(%s)', (letter) => {
		const s = session();
		const r = runInput(s, `f(${letter}) = ${letter}^2`);

		expect(r.kind).toBe('refus');
		expect(s.atelier.get('f')).toBeUndefined();
	});

	it('la lettre est le nom de la fonction : f(f) = f^2', () => {
		const s = session();
		const r = runInput(s, 'f(f) = f^2');

		expect(r.kind).toBe('refus');
	});

	it('un objet ne peut pas prendre la lettre d’une fonction : t = 3 après f(t)', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		const r = runInput(s, 't = 3');

		expect(r.kind).toBe('refus');
		expect(outputOf(r)).toContain('f');
	});

	it('les suites u(n) ne changent pas', () => {
		const s = session();
		runInput(s, 'u(n) = 2n + 1');

		expect(s.atelier.get('u')!.kind).toBe('sequence');
		expect(outputOf(runInput(s, 'u(3)')).replace(/\s/g, '')).toBe('7');
	});
});

describe('relire et rejouer', () => {
	it('le lien rangé garde la lettre', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		const copy = new Atelier();

		copy.restore(JSON.parse(JSON.stringify(s.atelier.serialize())));

		const f = copy.get('f')!;
		expect(f.status).toBe('ok');
		expect(typedLetterOf(copy, f)).toBe('t');
		expect(studentDefinitionOf(copy, f)).toBe('t^2');
	});

	it('l’historique exporté se rejoue à l’identique', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('f(t)=t^2');
		d.submit('f(3)');
		const text = historyToJson(d.entries, new Date('2026-10-06T10:00:00Z'));

		const read = readHistory(text);
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		const replayed = new CalcDesk(new Atelier());
		expect(replayed.replay(read.history).ok).toBe(true);
		expect(read.history.entries[0]).toMatchObject({ kind: 'saisie', input: 'f(t)=t^2' });
		expect(replayed.entries.map((e) => e.text)).toEqual(d.entries.map((e) => e.text));
	});
});

// Revue de #905 : `f = …` sans lettre, renommage textuel, relecture abîmée
describe('redéfinie sans (lettre) : f = …', () => {
	it('f = t + 1 hérite de la lettre t et se range en x', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		const r = runInput(s, 'f = t + 1');

		expect(r.kind).toBe('definition');
		const f = s.atelier.get('f')!;
		expect(f.definition.replace(/\s/g, '')).toBe('x+1');
		expect(f.status).toBe('ok');
		expect(f.missing ?? []).toEqual([]);
		expect(typedLetterOf(s.atelier, f)).toBe('t');
		expect(studentDefinitionOf(s.atelier, f).replace(/\s/g, '')).toBe('t+1');
	});

	it('f = x + 1 alors que la lettre est t : refusé comme f(t) = t + x', () => {
		const s = session();
		runInput(s, 'f(t) = t^2');
		const r = runInput(s, 'f = x + 1');

		expect(r.kind).toBe('refus');
		expect(outputOf(r)).toContain('f(t)');
		expect(s.atelier.get('f')!.definition).toBe('x^2');
	});
});

describe('renommage sur l’arbre, pas sur le texte', () => {
	it('a = 2 puis f(t) = at : accepté, f(3) vaut 6, montré at', () => {
		const s = session();
		runInput(s, 'a = 2');
		const r = runInput(s, 'f(t) = at');

		expect(r.kind).toBe('definition');
		const f = s.atelier.get('f')!;
		expect(f.status).toBe('ok');
		expect(f.missing ?? []).toEqual([]);
		expect(outputOf(runInput(s, 'f(3)')).replace(/\s/g, '')).toBe('6');
		expect(studentDefinitionOf(s.atelier, f).replace(/\s/g, '')).toBe('at');
	});

	it('f(t) = 2tcos(t) : accepté, sans t libre', () => {
		const s = session();
		const r = runInput(s, 'f(t) = 2tcos(t)');

		expect(r.kind).toBe('definition');
		const f = s.atelier.get('f')!;
		expect(f.status).toBe('ok');
		expect(f.definition).not.toMatch(/t(?!_)/);
		expect(outputOf(runInput(s, 'f(0)')).replace(/\s/g, '')).toBe('0');
	});

	it('f(t) = t_1 + t : t_1 reste un objet cité, t devient x', () => {
		const s = session();
		const r = runInput(s, 'f(t) = t_1 + t');

		expect(r.kind).toBe('definition');
		const f = s.atelier.get('f')!;
		expect(f.definition.replace(/\s/g, '')).toBe('t_1+x');
		// ⚠️ Pas d'assertion sur `missing` : `referencesOf` lit `a_1` comme `a`
		// pour TOUT nom indicé (mesuré : `y = a_1 + 2` attend `a`), défaut antérieur
		expect(studentDefinitionOf(s.atelier, f).replace(/\s/g, '')).toBe('t_1+t');
	});

	it('x_1 dans une fonction de t n’est pas renommé au retour', () => {
		const s = session();
		runInput(s, 'x_1 = 4');
		runInput(s, 'f(t) = x_1 + t');
		const f = s.atelier.get('f')!;

		expect(f.status).toBe('ok');
		expect(studentDefinitionOf(s.atelier, f).replace(/\s/g, '')).toBe('x_1+t');
		expect(fieldLatexOf(f, s.atelier.functionNames, 't')).toContain('x_1');
	});
});

describe('relecture d’une lettre refusée', () => {
	it.each(['e', 'n', 'f'])('lettre %s : la fonction est gardée, en x', (letter) => {
		const copy = new Atelier();
		copy.restore({
			version: 1,
			objects: [{ kind: 'function', name: 'f', definition: 'x^2', letter }]
		});

		const f = copy.get('f');
		expect(f?.definition).toBe('x^2');
		expect(typedLetterOf(copy, f!)).toBe('x');
	});

	it.each(['', 'tt', '1', 't_1'])('letterRejection refuse la forme « %s »', (letter) => {
		expect(letterRejection(letter, 'f', [])).not.toBeNull();
	});
});
