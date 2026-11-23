/**
 * Bloc ```boite-a-moustaches à construire (chantier `boite-a-moustaches`, palier 2)
 *
 * Phase 0 validée par David le 2026-11-01 : `docs/wip/boite-a-moustaches-progress.md`
 * § 5, 8. `placer: Nom` ou `placer: toutes` ; l'élève voit l'axe et le nom, pose
 * cinq traits aimantés aux graduations ; les valeurs écrites sont l'attendu.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BoxPlotScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { hasMaskedValue } from '../../utils/masked-value';
import {
	boxesToPlace,
	boxPlotCaseCount,
	boxTraitMistake,
	boxValueAnswer,
	boxValueAt,
	boxValueOfAnswer,
	solvedBoxPlotSpec,
	stepValue
} from '../../utils/boxplot-placer';

// =============================================================================
// Helpers
// =============================================================================

const KIND = 'boite-a-moustaches';

const NOTES = ['axe: 0 à 20, de 1 en 1', 'placer: Notes', 'Notes = 4 ; 8 ; 11 ; 14 ; 19'].join(
	'\n'
);

const DEUX = [
	'axe: 25 à 60, de 1 en 1',
	'Nautic = 28 ; 30 ; 37 ; 45 ; 58',
	'Neptune = 36 ; 37 ; 39 ; 42 ; 46'
].join('\n');

function specOf(source: string) {
	const node = parseStatChartContent(KIND, source);
	expect(node.errors).toEqual([]);
	return node.spec!;
}

function errorsOf(source: string): string[] {
	const node = parseStatChartContent(KIND, source);
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message);
}

const count = (text: string, marker: string) => text.split(marker).length - 1;

// =============================================================================
// Analyse
// =============================================================================

describe('```boite-a-moustaches à construire — analyse', () => {
	it('placer: Notes : la boîte est à construire, ses valeurs sont l’attendu', () => {
		const spec = specOf(NOTES);
		expect(spec.boxPlot!.toPlace).toEqual([0]);
		expect(boxesToPlace(spec)).toEqual([{ index: 0, name: 'Notes', expected: [4, 8, 11, 14, 19] }]);
		expect(boxPlotCaseCount(spec)).toBe(5);
	});

	it('placer: toutes, ou une boîte parmi deux (nom sans la casse)', () => {
		expect(specOf(`${DEUX}\nplacer: toutes`).boxPlot!.toPlace).toEqual([0, 1]);
		expect(boxPlotCaseCount(specOf(`${DEUX}\nplacer: toutes`))).toBe(10);
		expect(specOf(`${DEUX}\nplacer: neptune`).boxPlot!.toPlace).toEqual([1]);
	});

	it('placer: dans le désordre de l’auteur : rangs dans l’ordre des boîtes', () => {
		expect(specOf(`${DEUX}\nplacer: Neptune ; Nautic`).boxPlot!.toPlace).toEqual([0, 1]);
	});

	it('`données:` + placer: toutes : l’attendu est calculé par describe.ts', () => {
		const spec = specOf(
			'axe: 0 à 25\nplacer: toutes\ndonnées: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21'
		);
		expect(boxesToPlace(spec)[0].expected).toEqual([3, 7, 12, 14, 21]);
	});

	it('sans placer: : boîtes à lire (toPlace null)', () => {
		expect(specOf(DEUX).boxPlot!.toPlace).toBeNull();
	});

	it('case: N posée par le générateur', () => {
		const node = parseStatChartContent(KIND, `case: 3\n${NOTES}`);
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(3);
	});

	it('énoncé masqué : `Notes = ? ; ? ; ? ; ? ; ?` se lit, la boîte reste à construire', () => {
		const masked = 'axe: 0 à 20, de 1 en 1\nplacer: Notes\nNotes = ? ; ? ; ? ; ? ; ?';
		expect(hasMaskedValue(masked)).toBe(true);
		const spec = specOf(masked);
		expect(spec.boxPlot!.toPlace).toEqual([0]);
		expect(spec.boxPlot!.boxes[0].masked).toBe(true);
		expect(spec.boxPlot!.boxes[0].name).toBe('Notes');
	});
});

describe('```boite-a-moustaches à construire — refus situés', () => {
	it('placer: sans axe: (calculé, il trahirait le minimum et le maximum)', () => {
		const [message] = errorsOf('placer: A\nA = 4 ; 8 ; 11 ; 14 ; 19');
		expect(message).toContain('Ligne 1');
		expect(message).toContain('axe');
	});

	it('placer: avec valeurs: oui', () => {
		expect(errorsOf(`${NOTES}\nvaleurs: oui`)[0]).toContain('valeurs: oui');
	});

	it('nom absent, nommé deux fois, vide', () => {
		expect(errorsOf(`${DEUX}\nplacer: Triton`)[0]).toContain('« Triton » n’est pas une boîte');
		expect(errorsOf(`${DEUX}\nplacer: Nautic ; nautic`)[0]).toContain('deux fois');
		expect(errorsOf(`${DEUX}\nplacer:`)[0]).toContain('nommer les boîtes');
	});

	it('boîte sans nom : seulement placer: toutes', () => {
		expect(specOf('axe: 0 à 20\nplacer: toutes\n= 4 ; 8 ; 11 ; 14 ; 19').boxPlot!.toPlace).toEqual([
			0
		]);
	});

	it('valeur attendue hors graduation', () => {
		const [message] = errorsOf(
			'axe: 0 à 20, de 2 en 2\nplacer: Notes\nNotes = 4 ; 8 ; 11 ; 14 ; 18'
		);
		expect(message).toContain('Ligne 3');
		expect(message).toContain('11 n’est pas sur une graduation');
	});

	it('valeur hors de l’axe : le message des boîtes à lire', () => {
		expect(errorsOf('axe: 0 à 10\nplacer: A\nA = 4 ; 8 ; 9 ; 10 ; 12')[0]).toContain(
			'hors de l’axe'
		);
	});

	it('« ? » sans placer:, sur une boîte qui n’est pas à construire, ou en partie', () => {
		expect(errorsOf('axe: 0 à 20\nA = ? ; ? ; ? ; ? ; ?')[0]).toContain('placer:');
		expect(
			errorsOf('axe: 0 à 20\nplacer: B\nA = ? ; ? ; ? ; ? ; ?\nB = 1 ; 2 ; 3 ; 4 ; 5')[0]
		).toContain('Ligne 3');
		expect(errorsOf('axe: 0 à 20\nplacer: A\nA = 1 ; ? ; 3 ; 4 ; 5')[0]).toContain(
			'les cinq valeurs, ou aucune'
		);
	});

	it('case: sans placer:', () => {
		expect(errorsOf('case: 0\nA = 1 ; 2 ; 3 ; 4 ; 5')[0]).toContain('seulement avec placer:');
	});
});

// =============================================================================
// Calcul pur
// =============================================================================

describe('boîte à construire — calcul pur', () => {
	const AXIS = { min: 25, max: 60, step: 5 };

	it('aimant à la graduation la plus proche, borné à l’axe', () => {
		expect(boxValueAt(AXIS, 0)).toBe(25);
		expect(boxValueAt(AXIS, 1)).toBe(60);
		expect(boxValueAt(AXIS, 0.3)).toBe(35);
		expect(boxValueAt(AXIS, -0.2)).toBe(25);
		expect(boxValueAt(AXIS, 1.4)).toBe(60);
		expect(boxValueAt({ min: 0, max: 2, step: 0.1 }, 0.35)).toBe(0.7);
	});

	it('flèches : la graduation voisine ; trait pas posé : le bas de l’axe', () => {
		expect(stepValue(AXIS, 30, 1)).toBe(35);
		expect(stepValue(AXIS, 25, -1)).toBe(25);
		expect(stepValue(AXIS, 60, 1)).toBe(60);
		expect(stepValue(AXIS, null, 1)).toBe(25);
		expect(stepValue({ min: 0, max: 1, step: 0.1 }, 0.2, 1)).toBe(0.3);
	});

	it('réponse d’une case : écrite comme l’attendu, relue', () => {
		expect(boxValueAnswer(12)).toBe('12');
		expect(boxValueAnswer(0.30000000000000004)).toBe('0.3');
		expect(boxValueAnswer(-3)).toBe('-3');
		expect(boxValueOfAnswer('12.5')).toBe(12.5);
		expect(boxValueOfAnswer('-3')).toBe(-3);
		expect(boxValueOfAnswer('')).toBeNull();
		expect(boxValueOfAnswer('abc')).toBeNull();
	});

	it('phrases de la correction', () => {
		expect(boxTraitMistake('median', '12')).toBe('Ta médiane est à 12.');
		expect(boxTraitMistake('max', null)).toBe('Tu n’as pas placé le maximum.');
		expect(boxTraitMistake('q1', '7', 'Nautic')).toBe('Ton Q1 (boîte Nautic) est à 7.');
	});

	it('le diagramme juste : toutes les boîtes à lire', () => {
		expect(solvedBoxPlotSpec(specOf(NOTES)).boxPlot!.toPlace).toBeNull();
	});
});

// =============================================================================
// Scène et PDF
// =============================================================================

describe('boîte à construire — scène et PDF', () => {
	it('la boîte à construire est marquée, sa description ne dit pas les valeurs', () => {
		const scene = buildStatChartScene(specOf(`${DEUX}\nplacer: Neptune`), {
			locale: 'fr'
		}) as BoxPlotScene;
		expect(scene.boxes[0].toPlace).toBeUndefined();
		expect(scene.boxes[1].toPlace).toBe(true);
		expect(scene.description).toContain('Boîte Nautic : minimum 28');
		expect(scene.description).toContain('Boîte Neptune : à construire.');
		expect(scene.description).not.toContain('36');
	});

	it('PDF : axe et nom seuls pour la boîte à construire, l’élève dessine', () => {
		const typst = generateStatChartTypst(parseStatChartContent(KIND, `${DEUX}\nplacer: Neptune`));
		expect(count(typst, '// boîte')).toBe(1);
		expect(count(typst, '// médiane')).toBe(1);
		expect(typst).toContain('"Neptune"');
	});
});
