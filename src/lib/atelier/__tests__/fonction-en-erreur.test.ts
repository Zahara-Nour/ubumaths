/**
 * Une fonction dont la définition est en erreur ne sert à rien (V58,
 * décision de David, 2026-10-14).
 *
 * Avant : `f(x) = f(x)+1` passait en erreur (définition circulaire), mais
 * `.dériver f` répondait `d/dx(f) = 0` — le moteur ne connaissait pas f et
 * dérivait la LETTRE f. Et `f(x) = a x` puis `a(x) = x^2` laissait f « ok » :
 * `.dériver f` répondait `a`.
 *
 * Comportement voulu :
 * - toute commande, toute ligne de calcul qui cite un objet en erreur se
 *   refuse, en français, en nommant l'objet ;
 * - un objet qui dépend d'un objet en erreur l'est aussi, et se refuse pareil ;
 * - une lettre utilisée comme nombre (`a x`) qui est une FONCTION de
 *   l'atelier met la définition en erreur, quel que soit l'ordre de saisie ;
 * - les définitions, elles, restent permises : c'est en redéfinissant f
 *   qu'on la corrige.
 *
 * Tous les gestes passent par le vrai chemin (`CalcDesk.submit`) : on
 * asserte la ligne que voit l'élève.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';

function deskWith(...lines: string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const line of lines) desk.submit(line);
	return desk;
}

/** La dernière ligne, telle que l'élève la lit. */
function lastLine(...lines: string[]) {
	const entry = deskWith(...lines).entries.at(-1)!;
	return { text: entry.text, failed: entry.failed };
}

const BROKEN = (name: string, gender: 'f' | 'm' = 'f') =>
	`« ${name} » est mal défini${gender === 'f' ? 'e' : ''} (sa ligne est en erreur) : corrige sa définition d'abord.`;

const AS_NUMBER = (fn: string, user: string, letter = 'x', what = 'fonction') =>
	`« ${fn} » est une ${what} : « ${user} » ne peut pas s'en servir comme d'un nombre. Écris ${fn}(${letter}), ou donne un autre nom à la lettre.`;

/** Le refus d'un objet en erreur À CAUSE D'UN AUTRE : le message de sa carte. */
const FOLLOWS = (name: string, message: string) => `${name} : ${message}`;

// =============================================================================
// Définition circulaire
// =============================================================================

describe('f(x) = f(x)+1 : f est en erreur, rien ne s’en sert', () => {
	const CIRCULAR = 'f(x) = f(x)+1';

	it.each([
		'.dériver f',
		'.limite f en +inf',
		'.évaluer f en x=1',
		'.intégrer f de 0 à 1',
		'.variations f',
		'.domaine f',
		'.résoudre f(x)=0',
		'.factoriser f(x)',
		'.réciproque f',
		'.simplifier f(x)+1',
		'f(2)',
		"f'(2)",
		'f(2)+3'
	])('%s : refus qui nomme f', (input) => {
		expect(lastLine(CIRCULAR, input)).toEqual({ text: BROKEN('f'), failed: true });
	});

	it('f et g qui se définissent l’une par l’autre : .dériver f et .dériver g refusés', () => {
		const setup = ['f(x) = g(x)+1', 'g(x) = f(x)+1'];
		expect(lastLine(...setup, '.dériver f')).toEqual({ text: BROKEN('f'), failed: true });
		expect(lastLine(...setup, '.dériver g')).toEqual({ text: BROKEN('g'), failed: true });
	});

	it('g(x) = f(x)+1 avec f en erreur : g refusée elle aussi', () => {
		const setup = [CIRCULAR, 'g(x) = f(x)+1'];
		// g n'est pas mal écrite : c'est f qu'il faut corriger, la carte de g le dit
		const because = FOLLOWS('g', 'Dépend de « f », qui est en erreur.');
		expect(lastLine(...setup, '.dériver g')).toEqual({ text: because, failed: true });
		expect(lastLine(...setup, 'g(2)')).toEqual({ text: because, failed: true });
	});

	it('une valeur en erreur (a = a+1) : refus au masculin', () => {
		expect(lastLine('a = a+1', 'a+1')).toEqual({ text: BROKEN('a', 'm'), failed: true });
	});

	it('f corrigée : les commandes répondent de nouveau', () => {
		expect(lastLine(CIRCULAR, 'f(x) = x^2', '.dériver f')).toMatchObject({ failed: false });
		expect(lastLine(CIRCULAR, 'f(x) = x^2', '.dériver f').text).toContain('2');
	});

	it('la définition qui cite f reste permise (la ligne dit pourquoi elle est en erreur)', () => {
		const desk = deskWith(CIRCULAR, 'g(x) = f(x)+1');
		expect(desk.atelier.get('g')?.status).toBe('error');
		expect(desk.entries.at(-1)!.text).toContain('« g » est dans tes objets');
	});
});

// =============================================================================
// Une lettre devenue fonction
// =============================================================================

describe('f(x) = a x, puis a(x) = x^2 : f est mal définie', () => {
	it.each([[['f(x) = a x', 'a(x) = x^2']], [['a(x) = x^2', 'f(x) = a x']]])(
		'%j : f en erreur, avec un message qui le dit',
		(setup) => {
			const desk = deskWith(...setup);
			const f = desk.atelier.get('f')!;
			expect(f.status).toBe('error');
			expect(f.message).toBe(AS_NUMBER('a', 'f'));
		}
	);

	it('.dériver f : refus, plus « a »', () => {
		expect(lastLine('f(x) = a x', 'a(x) = x^2', '.dériver f')).toEqual({
			text: BROKEN('f'),
			failed: true
		});
	});

	it('les boutons de la carte de f sont grisés, avec le message de la carte', () => {
		const desk = deskWith('f(x) = a x', 'a(x) = x^2');
		const derive = actionsFor(desk.atelier.get('f')!, desk.atelier).find((a) => a.id === 'derive');
		expect(derive?.disabledReason).toBe(AS_NUMBER('a', 'f'));
	});

	it('f redéfinie avec une autre lettre : f repart', () => {
		const desk = deskWith('f(x) = a x', 'a(x) = x^2', 'f(x) = k x');
		expect(desk.atelier.get('f')?.status).toBe('pending');
		expect(lastLine('f(x) = a x', 'a(x) = x^2', 'f(x) = k x', '.dériver f').text).toBe(
			'd/dx((kx)) = k'
		);
	});

	it.each(['a_1 x', 'a_1*x', 'a_{1} x'])(
		'a(x) = x^2, h(x) = %s : a_1 est un autre nom, h n’est pas en erreur',
		(body) => {
			const desk = deskWith('a(x) = x^2', `h(x) = ${body}`);
			expect(desk.atelier.get('h')?.status).not.toBe('error');
		}
	);

	it('h(x) = a(2) + a : appel ET nombre sur le même nom, h en erreur', () => {
		const desk = deskWith('a(x) = x^2', 'h(x) = a(2) + a');
		expect(desk.atelier.get('h')?.message).toBe(AS_NUMBER('a', 'h'));
	});

	it('une suite citée comme un nombre (u(n) = 2n ; f(x) = u x) : f en erreur', () => {
		const desk = deskWith('u(n) = 2n', 'f(x) = u x');
		expect(desk.atelier.get('f')?.message).toBe(
			"« u » est une suite : « f » ne peut pas s'en servir comme d'un nombre. Écris un de ses termes, comme u(2), ou donne un autre nom à la lettre."
		);
	});

	it('une suite citée dans une suite : « Écris u(n) »', () => {
		const desk = deskWith('u(n) = 2n', 'v(n) = u n');
		expect(desk.atelier.get('v')?.message).toBe(AS_NUMBER('u', 'v', 'n', 'suite'));
	});

	// Revue de ff91e66a2 : la forme la plus courante, collée (`ax`), passait
	it.each(['ax', '2ax', 'xa', 'ax+b', 'a^2', 'a x^2 + 1'])(
		'a(x) = x^2, f(x) = %s : f en erreur, .dériver f refusé',
		(body) => {
			const desk = deskWith('a(x) = x^2', `f(x) = ${body}`);
			expect(desk.atelier.get('f')?.message).toBe(AS_NUMBER('a', 'f'));
			expect(lastLine('a(x) = x^2', `f(x) = ${body}`, '.dériver f')).toEqual({
				text: BROKEN('f'),
				failed: true
			});
		}
	);

	it.each(['a_1 x + a(2)', 'a(x)^2', 'a(2x) + 1'])(
		'a(x) = x^2, f(x) = %s : f saine (indice, appel)',
		(body) => {
			const desk = deskWith('a(x) = x^2', `f(x) = ${body}`);
			expect(desk.atelier.get('f')?.status).not.toBe('error');
		}
	);

	it.each(['f^{-1}(x) + 1', 'f^-1(x) + 1', "f'(x) + 1"])(
		'f(x) = 2x+1, g(x) = %s : réciproque et dérivée ne sont pas des nombres',
		(body) => {
			const desk = deskWith('f(x) = 2x+1', `g(x) = ${body}`);
			expect(desk.atelier.get('g')?.status).toBe('ok');
		}
	);

	it('v(n) = u_n + 1 : la notation indicée d’une suite n’est pas un nombre', () => {
		const desk = deskWith('u(n) = 2n', 'v(n) = u_n + 1');
		expect(desk.atelier.get('v')?.status).not.toBe('error');
	});

	it('la suggestion suit la variable : v(n) = a n → « Écris a(n) »', () => {
		const desk = deskWith('a(x) = x^2', 'v(n) = a n');
		expect(desk.atelier.get('v')?.message).toBe(AS_NUMBER('a', 'v', 'n'));
	});

	it('f(t) = a t → « Écris a(t) »', () => {
		const desk = deskWith('a(x) = x^2', 'f(t) = a t');
		expect(desk.atelier.get('f')?.message).toBe(AS_NUMBER('a', 'f', 't'));
	});

	it('une valeur b = a + 1 : la suggestion ne parle pas de x', () => {
		const desk = deskWith('a(x) = x^2', 'b = a + 1');
		expect(desk.atelier.get('b')?.message).toBe(
			"« a » est une fonction : « b » ne peut pas s'en servir comme d'un nombre. Écris une de ses valeurs, comme a(2), ou donne un autre nom à la lettre."
		);
	});

	it('f(x) = a(x) + 1 avec a fonction : inchangé, f est saine', () => {
		const desk = deskWith('a(x) = x^2', 'f(x) = a(x) + 1');
		expect(desk.atelier.get('f')?.status).toBe('ok');
	});
});

// =============================================================================
// Non-régression : fonction en attente (V56)
// =============================================================================

describe('une fonction à paramètre, en attente : inchangée', () => {
	it('f(x) = a x seule : .dériver f répond a', () => {
		expect(lastLine('f(x) = a x', '.dériver f')).toMatchObject({
			failed: false,
			text: 'd/dx((ax)) = a'
		});
	});
});
