/**
 * `.fréquence L M n` et `.échantillons L M N n` (outils statistiques v2,
 * PR (c), Q74-Q76, Q80-Q83, 2026-10-02). Aucune liste créée ; le graphique se
 * dessine sous la ligne de la commande (Q80).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { CalcDesk } from '../desk.svelte';

function session(lists: Record<string, string>, seed = 4821): CalcSession {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return { atelier, engine: new WebReplEngine(), seed: () => seed };
}

const DIE = { L: '1;2;3;4;5;6', M: '1/6;1/6;1/6;1/6;1/6;1/6' };
const COIN = { L: '1;0', M: '0,5;0,5' };

const commande = (s: CalcSession, input: string) => {
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return result;
};

describe('les commandes se découvrent', () => {
	it.each([
		['fréquence', '.fréquence L M 1000'],
		['échantillons', '.échantillons L M 50 100']
	])('« %s » est au catalogue, avec son exemple', (french, example) => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === french);

		expect(entry?.example).toBe(example);
		expect(entry?.exampleSetup).toBeDefined();
	});

	it('formes sans accent : .frequence, .echantillons', () => {
		expect(runInput(session(COIN), '.frequence L M 100').kind).toBe('commande');
		expect(runInput(session(DIE), '.echantillons L M 10 20').kind).toBe('commande');
	});
});

describe('.fréquence — loi des grands nombres (Q74)', () => {
	it('pièce, 5 000 tirages : texte, courbe, aucune liste créée', () => {
		const s = session(COIN);
		const result = commande(s, '.fréquence L M 5000');
		const lines = result.output.split('\n');

		expect(lines[0]).toBe('5 000 tirages de L avec probabilités M (graine 4821)');
		expect(lines[1]).toMatch(/^moyenne des tirages : 0,\d+ — espérance E = 1\/2$/);
		expect(result.chart?.kind).toBe('moyenne-selon-n');
		expect(s.atelier.objects).toHaveLength(2);
	});

	it('même graine, même courbe', () => {
		const a = commande(session(COIN), '.fréquence L M 300').chart;
		const b = commande(session(COIN), '.fréquence L M 300').chart;

		expect(b).toEqual(a);
	});

	it('n au-delà de 10 000 : refusé', () => {
		expect(runInput(session(COIN), '.fréquence L M 10001')).toEqual({
			kind: 'refus',
			message: 'n doit être un entier entre 1 et 10 000'
		});
	});
});

describe('.échantillons — N échantillons de taille n (Q75)', () => {
	it('dé, 50 × 100 : μ, σ, 2σ/√n, proportion ; histogramme ; aucune liste', () => {
		const s = session(DIE);
		const result = commande(s, '.échantillons L M 50 100');
		const lines = result.output.split('\n');

		expect(lines[0]).toBe('50 échantillons de 100 tirages de L avec probabilités M (graine 4821)');
		expect(lines[1]).toBe('μ = 7/2 ; σ ≈ 1,708 ; 2σ/√n ≈ 0,342');
		expect(lines[2]).toMatch(
			/^\d+ échantillons sur 50 \(\d+ %\) ont une moyenne à moins de 0,342 de μ$/
		);
		expect(result.chart?.kind).toBe('histogramme');
		expect(s.atelier.objects).toHaveLength(2);
	});

	// Revue : le dessin contredisait le texte (pièce, n = 4 : 50 annoncés, 48 en couleur)
	it('le nombre de moyennes EN COULEUR égale celui du texte', () => {
		for (const seed of [4821, 1, 2, 3]) {
			const result = commande(session(COIN, seed), '.échantillons L M 50 4');
			const announced = Number(result.output.split('\n')[2].split(' ')[0]);
			const rects = result.chart?.kind === 'histogramme' ? result.chart.rects : [];
			const colored = rects.filter((r) => r.highlighted).reduce((t, r) => t + r.height, 0);

			expect(colored, `graine ${seed}`).toBe(announced);
		}
	});

	it('n = 1 pour .fréquence : un texte au singulier, un graphique valide', () => {
		const result = commande(session(COIN), '.fréquence L M 1');

		expect(result.output.split('\n')[0]).toBe('1 tirage de L avec probabilités M (graine 4821)');
		expect(result.chart?.kind === 'moyenne-selon-n' && result.chart.xMax > result.chart.xMin).toBe(
			true
		);
	});

	it.each([
		['.échantillons L M 1001 10', 'N doit être un entier entre 1 et 1 000'],
		['.échantillons L M 10 1001', 'n doit être un entier entre 1 et 1 000'],
		[
			'.échantillons L M 10',
			'Écris la commande ainsi : .échantillons L M 50 100 (valeurs, probabilités, nombre d’échantillons, taille).'
		]
	])('%s : refusé', (input, message) => {
		expect(runInput(session(DIE), input)).toEqual({ kind: 'refus', message });
	});
});

describe('Q83 — .simuler propose d’aller plus loin', () => {
	it('dernière ligne : les deux commandes, avec les noms de l’élève', () => {
		const result = commande(session({ X: '1;0', P: '0,3;0,7' }), '.simuler X P 100');

		expect(result.output.split('\n').at(-1)).toBe(
			'Pour aller plus loin : .fréquence X P 1000 · .échantillons X P 50 100'
		);
	});
});

describe('Q80 — le graphique arrive dans l’historique', () => {
	it('la ligne de l’historique porte le graphique', () => {
		const s = session(COIN);
		const desk = new CalcDesk(s.atelier);
		desk.submit('.fréquence L M 200');

		expect(desk.entries.at(-1)?.chart?.kind).toBe('moyenne-selon-n');
	});
});
