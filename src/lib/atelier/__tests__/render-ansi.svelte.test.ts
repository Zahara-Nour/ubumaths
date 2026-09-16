/**
 * Ce que l'eleve lit ne doit jamais contenir de sequences de terminal.
 *
 * WARN **Ce fichier est un test CLIENT pour une raison precise.** En node, le
 * moteur rend « d/dx(x^2) = 2x » proprement ; en navigateur il rend
 * « ESC[1md/dx(x^2)ESC[22m = ESC[36m2xESC[39m ». `chalk` detecte le support
 * des couleurs differemment selon l'environnement, donc **un test serveur ne
 * peut pas voir ce defaut**.
 *
 * Meme famille que le `structuredClone` sur un proxy `$state` : mesure en
 * node, tout va bien ; mesure dans Chromium, tout casse.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { renderResult } from '../render';

const run = (input: string) =>
	renderResult(new WebReplEngine().execute(input), { fromCommand: true });

/** Une sequence ANSI, echappee ou non — les deux ont ete vues a l'ecran. */
// eslint-disable-next-line no-control-regex -- c'est justement ce caractere qu'on traque
const ANSI = /\u001b[[]{1}[0-9]+m|[[]{1}[0-9]+m/;

describe('les sequences de terminal ne sortent jamais', () => {
	it('sur une derivee', () => {
		expect(run('.diff x^2').text).not.toMatch(ANSI);
	});

	it('sur un tableau de variations', () => {
		expect(run('.variations x^2-3x+1').text).not.toMatch(ANSI);
	});

	it('sur une resolution', () => {
		expect(run('.solve x^2-1=0').text).not.toMatch(ANSI);
	});

	it('sur un domaine', () => {
		expect(run('.domain 1/x').text).not.toMatch(ANSI);
	});

	it('sur une erreur', () => {
		expect(run('.diff x^^2').text).not.toMatch(ANSI);
	});
});

describe('la ligne « LaTeX: » disparait meme coloree', () => {
	// WARN Elle commence par une sequence ANSI en navigateur : le filtre qui
	// cherchait « ^LaTeX: » ne la reconnaissait plus, et elle s'affichait.
	it('sur une derivee', () => {
		expect(run('.diff x^2').text).not.toContain('LaTeX');
	});

	it('mais le resultat, lui, reste', () => {
		expect(run('.diff x^2').text).toContain('2x');
	});
});

describe('ce que l eleve lit reste lisible', () => {
	it('garde le tableau de variations en entier', () => {
		const rendu = run('.variations x^2-3x+1').text;

		expect(rendu).toContain('3/2');
		expect(rendu).toContain('Derivee');
	});
});
