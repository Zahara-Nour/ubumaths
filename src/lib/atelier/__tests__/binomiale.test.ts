/**
 * `.binomiale X 10 0,3` — la loi binomiale dans l'atelier (Q142, 2026-10-03) :
 * le tableau et les lignes du bloc ```loi, sous la ligne de l'historique, sans
 * créer de liste (des listes décimales perdraient l'exactitude de la loi).
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
	const result = runInput(session(), input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return { result, scene: result.chart as LawScene };
};

const refusal = (input: string) => {
	const result = runInput(session(), input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
};

/** Ce que le bloc donnerait pour la même loi */
const block = (source: string) =>
	buildStatChartScene(parseStatChartContent('loi', source).spec!) as LawScene;

describe('la commande se découvre', () => {
	it('« binomiale » au catalogue, avec son exemple', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'binomiale');
		expect(entry?.example).toBe('.binomiale X 10 0,3');
	});
});

describe('cas nominal', () => {
	it('la ligne d’historique, le tableau et E, V, σ : ceux du bloc', () => {
		const { result, scene } = law('.binomiale X 10 0,3');
		const expected = block('X ~ B(10 ; 0,3)\nindicateurs: espérance ; variance ; écart type');

		expect(result.output).toBe('X suit B(10 ; 0,3)');
		expect(scene.kind).toBe('loi');
		expect(scene.probabilities).toEqual(expected.probabilities);
		expect(scene.indicators).toEqual(expected.indicators);
	});

	it('probabilités, intervalle et seuil, séparés par « ; »', () => {
		const { scene } = law('.binomiale X 10 0,3 P(X ⩽ 4) ; intervalle 0,95 ; seuil P(X > k) ⩽ 0,05');
		expect(scene.indicators).toEqual([
			'E(X) = 3',
			'V(X) = 2,1',
			'σ(X) ≈ 1,45',
			'I = [0 ; 6] : P(X ∈ I) ≈ 0,989 ⩾ 0,95',
			'a et b choisis pour que P(X < a) ⩽ 0,025 et P(X > b) ⩽ 0,025',
			'plus petit k tel que P(X > k) ⩽ 0,05 : k = 5 (P(X > 5) ≈ 0,047)',
			'P(X ⩽ 4) ≈ 0,850'
		]);
	});

	it('p en fraction ; une autre lettre ; aucune liste créée', () => {
		const s = session();
		const result = runInput(s, '.binomiale G 5 1/2');

		expect(result.kind).toBe('commande');
		expect(result.kind === 'commande' && result.output).toBe('G suit B(5 ; 1/2)');
		expect(s.atelier.objects).toHaveLength(0);
	});

	it('au-delà de 30 valeurs : pas de tableau, les lignes restent', () => {
		const { scene } = law('.binomiale X 100 0,5 P(40 ⩽ X ⩽ 60)');
		expect(scene.tableHidden).toBe(true);
		expect(scene.indicators.at(-1)).toBe('P(40 ⩽ X ⩽ 60) ≈ 0,965');
	});
});

describe('erreurs : un message, rien de dessiné', () => {
	it('une mauvaise syntaxe', () => {
		const usage = 'Écris la commande ainsi : .binomiale X 10 0,3';
		expect(refusal('.binomiale')).toBe(usage);
		expect(refusal('.binomiale 10 0,3')).toBe(usage);
		expect(refusal('.binomiale X 10')).toBe(usage);
	});

	it('les erreurs du bloc, sans numéro de ligne', () => {
		expect(refusal('.binomiale X 0 0,3')).toBe('B(n ; p) : n est un entier de 1 à 1 000');
		expect(refusal('.binomiale X 10 2')).toBe('B(n ; p) : p est un nombre entre 0 et 1');
		expect(refusal('.binomiale X 10 0,3 P(Y ⩽ 2)')).toBe(
			'probabilités : « P(Y ⩽ 2) » parle de Y, la variable est X'
		);
		expect(refusal('.binomiale X 10 0,3 intervalle 2')).toMatch(/^intervalle : /);
	});

	it('une option inconnue', () => {
		expect(refusal('.binomiale X 10 0,3 diagramme oui')).toBe(
			'« diagramme oui » : écrire P(X ⩽ 4), intervalle 0,95 ou seuil P(X > k) ⩽ 0,05'
		);
	});
});
