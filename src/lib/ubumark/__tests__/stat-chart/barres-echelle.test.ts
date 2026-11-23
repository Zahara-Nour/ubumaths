/**
 * Échelle choisie par l'élève (` ```barres ` + `axe: à choisir`, chantier
 * `docs/wip/reponses-a-placer-progress.md` § 24, 25)
 *
 * L'axe a 10 graduations sans nombres ; l'élève choisit ce que vaut une
 * graduation parmi 1, 2, 5, 10, puis construit toutes les barres. Juste : la
 * plus petite échelle où toutes les barres rentrent.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import {
	adaptedScale,
	barsCaseCount,
	scaleAxis,
	scaleMistake,
	SCALE_STEPS
} from '../../utils/barres-placer';

// =============================================================================
// Helpers
// =============================================================================

function nodeOf(...lines: string[]) {
	return parseStatChartContent('barres', lines.join('\n'));
}

function specOf(...lines: string[]) {
	const node = nodeOf(...lines);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function messagesOf(...lines: string[]) {
	const node = nodeOf(...lines);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors.map((e) => e.message);
}

const VILLES = ['axes: Ville ; Élèves', 'Alphaville = 42', 'Bêtaville = 35', 'Gammaville = 18'];

// =============================================================================
// Parseur
// =============================================================================

describe('axe: à choisir — lu', () => {
	it('échelle à choisir, pas d’axe écrit', () => {
		const spec = specOf(...VILLES, 'axe: à choisir', 'placer: toutes');
		expect(spec.chooseScale).toBe(true);
		expect(spec.axis).toBeNull();
		expect(spec.toPlace).toEqual([0, 1, 2]);
	});

	it('casse et espaces indifférents', () => {
		expect(specOf(...VILLES, 'axe:  À Choisir ', 'placer: toutes').chooseScale).toBe(true);
	});

	it('axe écrit : pas d’échelle à choisir', () => {
		expect(specOf(...VILLES, 'axe: 0 à 50, de 5 en 5', 'placer: toutes').chooseScale).toBe(false);
	});
});

describe('axe: à choisir — refusé', () => {
	it('sans placer:', () => {
		expect(messagesOf(...VILLES, 'axe: à choisir').join(' ')).toMatch(
			/axe : à choisir seulement avec placer: toutes/
		);
	});

	it('quelques barres seulement : sans échelle, les barres dessinées n’ont pas de hauteur', () => {
		expect(messagesOf(...VILLES, 'axe: à choisir', 'placer: Gammaville').join(' ')).toMatch(
			/axe : à choisir seulement avec placer: toutes/
		);
	});

	it('une barre au-delà de 100 : aucune échelle ne rentre', () => {
		const messages = messagesOf('A = 120', 'B = 3', 'axe: à choisir', 'placer: toutes');
		expect(messages.join(' ')).toMatch(/la barre A \(120\) dépasse 100/);
	});
});

// =============================================================================
// Scène et PDF : l'axe muet
// =============================================================================

describe('scène d’une échelle à choisir', () => {
	it('10 graduations sans nombres', () => {
		const spec = specOf(...VILLES, 'axe: à choisir', 'placer: toutes');
		const scene = buildStatChartScene(spec) as BarScene;
		expect(scene.ticks).toHaveLength(11);
		expect(scene.ticks.every((t) => t.label === '')).toBe(true);
	});

	it('échelle choisie : l’axe se numérote', () => {
		const spec = specOf(...VILLES, 'axe: à choisir', 'placer: toutes');
		const scene = buildStatChartScene({ ...spec, axis: scaleAxis(5) }) as BarScene;
		expect(scene.yMax).toBe(50);
		expect(scene.ticks.map((t) => t.label).slice(0, 3)).toEqual(['0', '5', '10']);
	});

	it('PDF : axe muet, aucune barre, la ligne de l’échelle à écrire', () => {
		const typst = generateStatChartTypst(nodeOf(...VILLES, 'axe: à choisir', 'placer: toutes'));
		expect(typst.match(/\/\/ barre\n/g)).toBeNull();
		expect(typst).not.toContain('[50]');
		expect(typst).toContain('Une graduation vaut');
	});
});

// =============================================================================
// Calcul pur
// =============================================================================

describe('échelle — calcul pur', () => {
	it('les choix : 1, 2, 5, 10', () => {
		expect([...SCALE_STEPS]).toEqual([1, 2, 5, 10]);
		expect(scaleAxis(2)).toEqual({ max: 20, step: 2 });
	});

	it('adaptedScale : la plus petite où tout rentre', () => {
		expect(adaptedScale([42, 35, 18])).toBe(5);
		expect(adaptedScale([10, 3])).toBe(1);
		expect(adaptedScale([11])).toBe(2);
		expect(adaptedScale([50])).toBe(5);
		expect(adaptedScale([51])).toBe(10);
		expect(adaptedScale([100])).toBe(10);
		expect(adaptedScale([101])).toBeNull();
	});

	it('scaleMistake : pas choisie, trop petite, trop grande, juste', () => {
		const data = [
			{ label: 'Alphaville', value: 42 },
			{ label: 'Bêtaville', value: 35 }
		];
		expect(scaleMistake(data, null)).toBe('Tu n’as pas choisi l’échelle.');
		expect(scaleMistake(data, 2)).toBe(
			'Avec 2 par graduation, la barre Alphaville (42) ne rentre pas.'
		);
		expect(scaleMistake(data, 10)).toBe(
			'Avec 10 par graduation, ton diagramme rentre, mais avec 5 il serait plus grand et plus lisible.'
		);
		expect(scaleMistake(data, 5)).toBeNull();
	});

	it('barsCaseCount : une case échelle en plus', () => {
		expect(barsCaseCount(specOf(...VILLES, 'axe: à choisir', 'placer: toutes'))).toBe(4);
		expect(barsCaseCount(specOf(...VILLES, 'axe: 0 à 50, de 5 en 5', 'placer: toutes'))).toBe(3);
	});
});
