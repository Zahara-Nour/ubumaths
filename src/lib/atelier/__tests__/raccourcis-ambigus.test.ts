/**
 * Les raccourcis que deux commandes revendiquent.
 *
 * ⚠️ Mesuré le 2026-09-19 sur le registre du moteur : **deux** raccourcis sont
 * déclarés par deux commandes chacun — `s` par `simplify` et `solve`, `h` par
 * `help` et `hash`. Le catalogue de l'atelier tranche en faveur de la première
 * (« `aide` est utile à un élève, `empreinte` ne l'est pas ») et l'AFFICHE
 * ainsi ; le moteur, lui, donnait la seconde. L'élève lisait donc
 * « .s — Simplifier » et recevait :
 *
 *   .s x+x   → une ligne entièrement VIDE (solve : « l'entrée doit être une
 *              équation », message qui ne s'affichait même pas)
 *   .h       → une ligne entièrement VIDE (hash, sans argument)
 *
 * Deux moitiés vertes : le catalogue était juste, le moteur aussi de son point
 * de vue — personne ne réconciliait les deux.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string) {
	const result = runInput(session(), input);
	expect(result.kind).toBe('commande');
	return result.kind === 'commande' ? result : null!;
}

describe('le catalogue tranche, y compris à l’exécution', () => {
	it('`.s` simplifie — c’est ce que le catalogue annonce', () => {
		const result = run('.s x+x');

		expect(result.output).toContain('Simplified');
		expect(result.latex).toBe('2 x');
	});

	it('`.h` ouvre l’aide, pas l’empreinte', () => {
		expect(run('.h').output).toContain('Commandes disponibles');
	});

	it('la commande revendiquée en second garde son nom entier', () => {
		// Rien n'est retiré à `solve` ni à `hash` : seul le raccourci change de
		// main, et il change pour celle que l'élève voit dans le catalogue.
		expect(run('.résoudre 3x+5=14').latex).toBe('x = 3');
		expect(run('.empreinte x+1').output).toContain('Hash');
	});

	it('aucun raccourci du catalogue ne rend une ligne vide', () => {
		// ⚠️ La garde générale : le catalogue est construit depuis le registre,
		// donc un raccourci ambigu ajouté demain se voit ici sans qu'on y pense.
		const engine = new WebReplEngine();
		const testables = commandCatalog(engine).filter(
			(c) => c.unavailable === undefined && c.example !== undefined
		);
		expect(testables.length).toBeGreaterThan(5);

		for (const command of testables) {
			const argument = command.example!.slice(command.example!.indexOf(' ') + 1);
			for (const alias of command.aliases) {
				const result = runInput(session(), `.${alias} ${argument}`);
				expect(result.kind, `.${alias}`).toBe('commande');
				const vide =
					result.kind === 'commande' && result.output.trim() === '' && result.latex === undefined;
				expect(vide, `« .${alias} ${argument} » rend une ligne vide`).toBe(false);
			}
		}
	});
});
