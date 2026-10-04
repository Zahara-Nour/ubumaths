/**
 * `.geometrique`, `.uniforme`, `.exponentielle` — les lois de maths
 * complémentaires dans l'atelier (manche 13, PR c, spec validée par David le
 * 2026-10-04). Modèle : `.binomiale` (Q142) : la scène du bloc ```loi, sous la
 * ligne de l'historique, sans liste créée.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '$lib/ubumark/utils/stat-chart-scene';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const law = (input: string) => {
	const s = session();
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return { result, scene: result.chart as LawScene, atelier: s.atelier };
};

const refusal = (input: string) => {
	const result = runInput(session(), input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
};

/** Ce que le bloc donnerait pour la même loi */
const block = (source: string) =>
	buildStatChartScene(parseStatChartContent('loi', source).spec!, { locale: 'fr' }) as LawScene;

describe('les trois commandes se découvrent', () => {
	it('au catalogue, avec un exemple jouable et un décor vide (Q79)', () => {
		const catalog = commandCatalog(new WebReplEngine());
		for (const french of ['géométrique', 'uniforme', 'exponentielle']) {
			const entry = catalog.find((c) => c.french === french);
			expect(entry, french).toBeDefined();
			expect(entry!.exampleSetup).toEqual({});
			const played = runInput(session(), entry!.example!);
			expect(played.kind === 'commande' && played.chart !== undefined, french).toBe(true);
		}
	});
});

describe('.geometrique', () => {
	it('le bloc G(p) : tableau, E, V, σ, diagramme, probabilités, jusqu’à', () => {
		const { result, scene, atelier } = law(
			".geometrique X 0,2 P(X ⩽ 3) ; P(X > 5 | X > 2) ; jusqu'à 15"
		);
		const expected = block(
			"X ~ G(0,2)\nindicateurs: espérance ; variance ; écart type\ndiagramme: oui\njusqu'à: 15\nprobabilités: P(X ⩽ 3) ; P(X > 5 | X > 2)"
		);
		expect(result.output).toBe('X suit G(0,2)');
		expect(scene.values).toEqual(expected.values);
		expect(scene.indicators).toEqual(expected.indicators);
		expect(scene.chart).toEqual(expected.chart);
		expect(atelier.objects).toHaveLength(0);
	});

	it('« 20 % » et « 1 / 5 » avec des espaces ; accent facultatif', () => {
		expect(law('.geometrique X 20 %').scene.probabilities[2].text).toBe('0,128');
		expect(law('.géométrique X 1 / 5').scene.probabilities[2].text).toBe('0,128');
	});

	it('erreurs : usage, minuscule, option sans valeur, erreur du bloc sans « Ligne N : »', () => {
		expect(refusal('.geometrique')).toBe('Écris la commande ainsi : .geometrique X 0,2');
		expect(refusal('.geometrique x 0,2')).toBe(
			'La variable s’écrit en majuscule : .geometrique X 0,2'
		);
		expect(refusal(".geometrique X 0,2 jusqu'à")).toBe(
			"« jusqu'à » sans valeur : écrire par exemple jusqu'à 15"
		);
		expect(refusal('.geometrique X 0')).toBe(
			'G(p) : p est un nombre strictement positif, au plus 1'
		);
		expect(refusal('.geometrique X 0,2 diagramme oui')).toBe(
			"« diagramme oui » : écrire P(X ⩽ 3), jusqu'à 15 ou seuil P(X > k) ⩽ 0,05"
		);
	});
});

describe('.uniforme', () => {
	it('discrète : X suit la loi uniforme sur {1, …, 6}, tableau, E, V, σ, diagramme', () => {
		const { result, scene } = law('.uniforme X 1 6 P(X ⩾ 5)');
		const expected = block(
			'X ~ U(1 ; 6)\nindicateurs: espérance ; variance ; écart type\ndiagramme: oui\nprobabilités: P(X ⩾ 5)'
		);
		expect(result.output).toBe('X suit la loi uniforme sur {1, …, 6}');
		expect(scene.probabilities).toEqual(expected.probabilities);
		expect(scene.indicators).toEqual(expected.indicators);
		expect(scene.chart).toEqual(expected.chart);
	});

	it('à densité : X suit la loi uniforme sur [0 ; 10], courbe, F(x)', () => {
		const { result, scene } = law('.uniforme X [0 ; 10] P(2 ⩽ X ⩽ 5)');
		expect(result.output).toBe('X suit la loi uniforme sur [0 ; 10]');
		expect(scene.densityChart?.area).not.toBeNull();
		expect(scene.indicators).toContain('F(x) = x/10 pour x ∈ [0 ; 10] ; 0 avant, 1 après');
		expect(scene.indicators).toContain('P(2 ⩽ X ⩽ 5) = 3/10 = 0,3');
	});

	it('erreurs', () => {
		const usage = 'Écris la commande ainsi : .uniforme X 1 6 ou .uniforme X [0 ; 10]';
		expect(refusal('.uniforme')).toBe(usage);
		expect(refusal('.uniforme X 1')).toBe(usage);
		expect(refusal('.uniforme x 1 6')).toBe(
			'La variable s’écrit en majuscule : .uniforme X 1 6 ou .uniforme X [0 ; 10]'
		);
		expect(refusal('.uniforme X 6 1')).toBe('U(a ; b) : les bornes dans l’ordre (a < b)');
		expect(refusal('.uniforme X [5 ; 2]')).toBe('U([a ; b]) : les bornes dans l’ordre (a < b)');
		expect(refusal('.uniforme X 1 6 jusqu’à 3')).toBe('« jusqu’à 3 » : écrire P(X ⩽ 3)');
	});
});

describe('.exponentielle', () => {
	it('T suit E(0,5) : courbe et aire, E, V, σ, F(x), probabilités', () => {
		const { result, scene } = law('.exponentielle T 0,5 P(T ⩽ 2) ; P(T > 5 | T > 2)');
		const expected = block(
			'T ~ E(0,5)\nindicateurs: espérance ; variance ; écart type\nrépartition: oui\ndiagramme: oui\nprobabilités: P(T ⩽ 2) ; P(T > 5 | T > 2)'
		);
		expect(result.output).toBe('T suit E(0,5)');
		expect(scene.indicators).toEqual(expected.indicators);
		expect(scene.densityChart).toEqual(expected.densityChart);
	});

	it('erreurs', () => {
		expect(refusal('.exponentielle')).toBe('Écris la commande ainsi : .exponentielle T 0,5');
		expect(refusal('.exponentielle T 0')).toBe('E(λ) : λ est un nombre strictement positif');
		expect(refusal('.exponentielle t 0,5')).toBe(
			'La variable s’écrit en majuscule : .exponentielle T 0,5'
		);
	});
});

describe('revue : crochets, sauts de ligne, texte de l’historique', () => {
	it('.uniforme : un intervalle mal fermé, ou sans crochets', () => {
		const brackets = 'écrire [0 ; 10] avec deux crochets fermés';
		expect(refusal('.uniforme X [0 ; 10[')).toBe(brackets);
		expect(refusal('.uniforme X [0 ; 10')).toBe(brackets);
		expect(refusal('.uniforme X 0 ; 10')).toBe(brackets);
	});

	it('.uniforme X [0;10] sans espaces marche', () => {
		expect(law('.uniforme X [0;10]').result.output).toBe('X suit la loi uniforme sur [0 ; 10]');
	});

	it('un saut de ligne n’ajoute pas de ligne au bloc', () => {
		for (const input of [
			'.uniforme X [0 ; 10\ndiagramme: non]',
			'.uniforme X [0 ; 10]\ndiagramme: non',
			'.geometrique X 0,2\ndiagramme: non',
			'.exponentielle T 0,5\r\ndiagramme: non',
			'.binomiale X 10 0,3\ndiagramme: non'
		]) {
			expect(refusal(input), input).toBe('Écris la commande sur une seule ligne');
		}
	});

	it('le texte de l’historique des quatre commandes', () => {
		const output = (input: string) => law(input).result.output;
		expect(output('.binomiale X 10 0,3')).toBe('X suit B(10 ; 0,3)');
		expect(output('.binomiale X 1 0,3')).toBe('X suit B(1 ; 0,3)');
		expect(output('.geometrique X 0,2')).toBe('X suit G(0,2)');
		expect(output('.uniforme X 1 6')).toBe('X suit la loi uniforme sur {1, …, 6}');
		expect(output('.uniforme X [0 ; 10]')).toBe('X suit la loi uniforme sur [0 ; 10]');
		expect(output('.exponentielle T 0,5')).toBe('T suit E(0,5)');
	});

	it('.binomiale x 10 : la majuscule expliquée', () => {
		expect(refusal('.binomiale x 10')).toBe(
			'La variable s’écrit en majuscule : .binomiale X 10 0,3'
		);
	});
});

describe('.geometrique … seuil (manche 14)', () => {
	it('la ligne du bloc ; `seuil` sans valeur expliqué', () => {
		const { scene } = law('.geometrique X 0,2 seuil P(X > k) ⩽ 0,05');
		expect(scene.indicators).toContain(
			'plus petit k tel que P(X > k) ⩽ 0,05 : k = 14 (P(X > 14) ≈ 0,044)'
		);
		expect(refusal('.geometrique X 0,2 seuil')).toBe(
			'« seuil » sans valeur : écrire par exemple seuil P(X > k) ⩽ 0,05'
		);
	});
});
