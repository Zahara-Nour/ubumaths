/**
 * Atelier — les suites des noms indicés (#1520), décidées par David le 2026-10-19.
 *
 * 1. `u_3` tapé dans Calcul, avec une suite `u`, répond le TERME de rang 3,
 *    comme dans une définition (`b = u_3`). `u_n` seul garde son sens.
 * 2. Une valeur `u_3` et une suite `u` ne cohabitent pas : `u_3` désignerait
 *    deux choses. Refus dans les deux sens ; un atelier rangé qui contient les
 *    deux est relu sans rien perdre (la valeur est renommée, et on le dit).
 * 3. Les analyses en x ne lisent plus `x_1` comme x : c'est une autre lettre,
 *    qui se comporte comme `a` (relevé du 2026-10-19 : `.variations x^2 - x_1 x`
 *    ne trouvait pas de point critique, `.intégrer x_1 de 0 à 1` rendait 1).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { mergeInto } from '../merge';
import { renamedOnReadMessage } from '../geometry';
import { AtelierFigure, syncFigure } from '../figure-sync';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import type { AtelierState } from '../persistence';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

type Session = ReturnType<typeof session>;

function withLines(...lines: string[]): Session {
	const s = session();
	for (const line of lines) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

/** Ce que voit l'élève sur la ligne de Calcul (réponse ou refus), sans espaces. */
function said(s: Session, line: string): string {
	const r = runInput(s, line);
	const text =
		r.kind === 'calcul' || r.kind === 'commande'
			? r.output
			: r.kind === 'refus'
				? r.message
				: r.kind;
	return text.replace(/\s/g, '');
}

/** Le refus d'une ligne, tel quel. */
function refusal(s: Session, line: string): string | null {
	const r = runInput(s, line);
	return r.kind === 'refus' ? r.message : null;
}

const U_TERM = 'u est une suite : u_3 désigne son terme de rang 3. Choisis un autre nom.';

describe('1. u_3 tapé dans Calcul : le terme de rang 3', () => {
	it('u(n) = 2n + 1 : u_3, 2u_3, u_3 + u_4, u_{3}', () => {
		const s = withLines('u(n) = 2n + 1');
		expect(said(s, 'u_3')).toBe('7');
		expect(said(s, '2u_3')).toBe('14');
		expect(said(s, 'u_3 + u_4')).toBe('16');
		expect(said(s, 'u_{3}')).toBe('7');
		expect(said(s, 'u_{12}')).toBe('25');
	});

	it('u_n seul garde son sens : la notation, pas un calcul', () => {
		const s = withLines('u(n) = 2n + 1');
		expect(said(s, 'u_n')).toBe('u_n');
	});

	it('une suite récurrente : v(n+1) = 2v(n) + 1, premier terme 0 → v_3 = 7', () => {
		const s = withLines('v(n+1) = 2v(n) + 1');
		expect(said(s, 'v_3')).toBe('7');
		expect(said(s, 'v_3 + 1')).toBe('8');
	});

	it('un rang avant le premier : le refus de v(…)', () => {
		const s = withLines('v(n+1) = 2v(n) + 1');
		s.atelier.setSequence('v', { firstIndex: 1, firstTerm: '0' });
		expect(said(s, 'v_0')).toBe(said(s, 'v(0)'));
	});

	it('une fonction f, comme dans une définition (g = f_3 vaut f(3))', () => {
		const s = withLines('f(x) = x^2', 'g = f_3');
		expect(said(s, 'g')).toBe('9');
		expect(said(s, 'f_3')).toBe('9');
	});

	it('une fonction à indice f_1 reste un nom : f_1(2), et f_1 sans suite u', () => {
		const s = withLines('f(x) = x^2', 'f_1(x) = x + 1');
		expect(said(s, 'f_1(2)')).toBe('3');
	});

	it('a_1 sans fonction ni suite a : le nom a_1, inchangé (#1520)', () => {
		const s = withLines('a_1 = 3');
		expect(said(s, 'a_1')).toBe('3');
	});
});

describe('2. une valeur u_3 et une suite u ne cohabitent pas', () => {
	it('u suite : créer la valeur u_3 est refusé, avec la raison', () => {
		const s = withLines('u(n) = 2n + 1');
		expect(refusal(s, 'u_3 = 5')).toBe(U_TERM);
		expect(s.atelier.get('u_3')).toBeUndefined();
		const created = s.atelier.create({ kind: 'value', name: 'u_3', definition: '5' }, 'text');
		expect(created.ok === false && created.message).toBe(U_TERM);
	});

	it('f fonction : la valeur f_1 est refusée de même', () => {
		const s = withLines('f(x) = x^2');
		expect(refusal(s, 'f_1 = 5')).toBe(
			'f est une fonction : f_1 désigne f(1). Choisis un autre nom.'
		);
	});

	it('une fonction f_1 à côté de f reste permise (fonctions à indice)', () => {
		const s = withLines('f(x) = x^2', 'f_1(x) = x + 1');
		expect(s.atelier.get('f_1')?.kind).toBe('function');
	});

	it('dans l’autre sens : la valeur u_3 existe, la suite u est refusée', () => {
		const s = withLines('u_3 = 5');
		expect(refusal(s, 'u(n) = 2n + 1')).toBe(
			'u_3 existe déjà : avec une suite u, u_3 désignerait son terme de rang 3. Renomme u_3, ou choisis un autre nom.'
		);
		expect(s.atelier.get('u')).toBeUndefined();
	});

	it('renommer une valeur en u_3, ou une suite en u : même refus', () => {
		const s = withLines('u(n) = 2n + 1', 'b = 5');
		const toU3 = s.atelier.rename('b', 'u_3');
		expect(toU3.ok === false && toU3.message).toBe(U_TERM);
		const clash = withLines('v(n) = n', 'u_3 = 5');
		const vToU = clash.atelier.rename('v', 'u');
		expect(vToU.ok === false && vToU.message).toMatch(/^u_3 existe déjà/);
	});

	it('le nom proposé d’une valeur n’est jamais u_3 d’une suite u', () => {
		const s = withLines('u(n) = 2n + 1');
		// une valeur nommée d'office prend une lettre libre, jamais `u_1`
		const created = s.atelier.create({ kind: 'value', definition: '4' }, 'text');
		expect(created.ok && created.object.name).not.toMatch(/^u_/);
	});

	describe('un atelier rangé qui contient les deux : rien n’est perdu', () => {
		const stored: AtelierState = {
			version: 3,
			objects: [
				{ kind: 'sequence', name: 'u', definition: '2n + 1', firstIndex: 0, firstTerm: '0' },
				{ kind: 'value', name: 'u_3', definition: '5' },
				{ kind: 'value', name: 'b', definition: 'u_3 + 1' }
			]
		} as unknown as AtelierState;

		it('relu : la valeur u_3 est renommée, la suite garde son nom, on le dit', () => {
			const atelier = new Atelier();
			const report = atelier.restore(stored);
			expect(report.skipped).toEqual([]);
			expect(report.renamed).toHaveLength(1);
			const [{ from, to }] = report.renamed;
			expect(from).toBe('u_3');
			expect(atelier.get(to)?.definition).toBe('5');
			expect(renamedOnReadMessage(report.renamed[0])).toBe(
				`« u_3 » se lit désormais u(3) : ton objet s’appelle maintenant ${to}.`
			);
			expect(atelier.get('u')?.kind).toBe('sequence');
			// b gardé tel qu'il calculait : u_3 y était déjà le terme de rang 3
			expect(atelier.get('b')?.definition).toBe('u_3 + 1');
		});

		it('versé dans un atelier qui a déjà une suite u : la valeur arrive sous un autre nom', () => {
			const atelier = new Atelier();
			atelier.create({ kind: 'sequence', name: 'u', definition: 'n' }, 'text');
			const received = {
				version: 3,
				objects: [{ kind: 'value', name: 'u_3', definition: '5' }]
			} as unknown as AtelierState;
			const report = mergeInto(atelier, received);
			expect(report.refused).toEqual([]);
			expect(report.renamed).toHaveLength(1);
			expect(report.renamed[0].from).toBe('u_3');
			expect(atelier.get(report.renamed[0].to)?.definition).toBe('5');
		});

		it('une suite u versée à côté d’une valeur u_3 locale : u renommée, ce qui la cite suit', () => {
			const s = withLines('u_3 = 5');
			const received = {
				version: 3,
				objects: [
					{ kind: 'sequence', name: 'u', definition: '2n + 1', firstIndex: 0, firstTerm: '0' },
					{ kind: 'value', name: 'c', definition: 'u(3) + 1' },
					{ kind: 'value', name: 'b', definition: 'u_3 + 1' }
				]
			} as unknown as AtelierState;
			const report = mergeInto(s.atelier, received);
			expect(report.refused).toEqual([]);
			const to = report.renamed.find((r) => r.from === 'u')?.to;
			expect(to).toBeDefined();
			expect(s.atelier.get(to!)?.kind).toBe('sequence');
			expect(s.atelier.get('u_3')?.definition).toBe('5');
			expect(s.atelier.get('c')?.definition).toBe(`${to}(3) + 1`);
			// le TERME reçu suit la suite : sans quoi il lirait la valeur locale u_3
			expect(s.atelier.get('b')?.definition).toBe(`${to}_3 + 1`);
			expect(said(s, 'b')).toBe('8');
			expect(said(s, 'c')).toBe('8');
		});
	});

	it('renommer la suite u emmène ses termes : b = u_3 + 1 devient v_3 + 1', () => {
		const s = withLines('u(n) = 2n + 1', 'b = u_3 + 1', 'd = u_{4}');
		expect(s.atelier.rename('u', 'v').ok).toBe(true);
		expect(s.atelier.get('b')?.definition).toBe('v_3 + 1');
		expect(s.atelier.get('d')?.definition).toBe('v_{4}');
		expect(said(s, 'b')).toBe('8');
	});

	it('renommer f garde la fonction f_1 (un nom, pas un terme)', () => {
		const s = withLines('f(x) = x^2', 'f_1(x) = x + 1', 'b = f_1(2)');
		expect(s.atelier.rename('f', 'g').ok).toBe(true);
		expect(s.atelier.get('b')?.definition).toBe('f_1(2)');
	});
});

describe('3. x_1 est une autre lettre que x : il se comporte comme a', () => {
	/** La réponse avec x_1, et celle où x_1 est remplacé par a. */
	function sameAsA(line: string, setup: readonly string[] = []): void {
		const withX1 = withLines(...setup.map((l) => l.replaceAll('A', 'x_1')));
		const withA = withLines(...setup.map((l) => l.replaceAll('A', 'a')));
		const got = said(withX1, line.replaceAll('A', 'x_1')).replaceAll('x_1', 'a');
		expect(got).toBe(said(withA, line.replaceAll('A', 'a')));
	}

	it('.variations x^2 - x_1 x : le point critique x = x_1/2', () => {
		const s = session();
		expect(said(s, '.variations x^2 - x_1 x')).toContain("x=1/2*x_1(f'=0)");
	});

	it.each([
		'.variations A^2 + 2A',
		'.intégrer A de 0 à 1',
		'.évaluer x^2 + A en x=3',
		'.évaluer A^2 en A=3',
		'.résoudre x - A = 0',
		'.réciproque A x + 1',
		'.réciproque A^2 + 1',
		'.domaine 1/(x - A)',
		'.dériver A^2'
	])('%s : comme avec a', (line) => {
		sameAsA(line);
	});

	it('avec x_1 = 2 posé : .réciproque f garde la lettre x_1, comme a', () => {
		sameAsA('.réciproque f', ['A = 2', 'f(x) = A x + 1']);
	});

	it('.intégrer x_1 de 0 à 1 vaut 1/2, pas 1', () => {
		expect(said(session(), '.intégrer x_1 de 0 à 1')).toContain('=1/2');
	});

	it('une courbe de la figure qui cite a_1 suit son curseur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a_1', definition: '2' }, 'text');
		atelier.create({ kind: 'point', name: 'M', definition: '(a_1 ; 2a_1)' }, 'text');
		const target = new AtelierFigure();
		syncFigure(atelier, target);
		atelier.slideTo('a_1', 3);
		syncFigure(atelier, target);
		const el = target.figure.getAllElements().find((e) => e.visible && e.label === 'M');
		const position = el === undefined ? null : target.figure.getPosition(el.id);
		expect(position && [geoToNumber(position.x), geoToNumber(position.y)]).toEqual([3, 6]);
	});
});
