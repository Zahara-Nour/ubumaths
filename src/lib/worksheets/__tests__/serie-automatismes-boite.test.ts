/**
 * Série d'automatismes : boîte à moustaches à construire (chantier automatismes-1spe,
 * lot « Statistiques »)
 * ==================================================================================
 *
 * Phase 0 validée le 2026-11-04 : à l'énoncé, l'axe reste vide (ligne `placer:` gardée,
 * le PDF ne dessine alors que l'axe et le nom) ; au corrigé, la boîte est dessinée
 * (`placer:` retirée). Chaque boîte compte pour cinq cases (minimum, Q1, médiane, Q3,
 * maximum). Une boîte en retrait ou citée est déjà refusée par le générateur.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
import { generateStatChartTypst } from '$lib/ubumark/generators/stat-chart-typst';
import type { StatChartNode } from '$lib/ubumark/types/stat-chart';

/** Un modèle d'une variation, énoncé donné, variables q = 8 et m = 12 */
function modele(id: string, statement: string, blanks?: unknown[]): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['3'],
		theme: 'T',
		domain: 'D',
		level: 1,
		status: 'draft',
		variations: [
			{
				statement,
				variables: [
					{ name: 'q', expression: '8' },
					{ name: 'm', expression: '12' }
				],
				...(blanks ? { blanks } : {})
			}
		]
	} as unknown as QuestionTemplate;
}

const boite = (...lignes: string[]) =>
	['```boite-a-moustaches', 'axe: 0 à 20, de 1 en 1', ...lignes, '```'].join('\n');

const une = modele(
	'une',
	`Construis la boîte.\n\n${boite('Notes = 4 ; {{q}} ; {{m}} ; 14 ; 19', 'placer: Notes')}`
);
const deux = modele(
	'deux',
	`Construis les boîtes.\n\n${boite('A = 2 ; 5 ; 9 ; 13 ; 18', 'B = 4 ; {{q}} ; {{m}} ; 14 ; 19', 'placer: toutes')}`
);
const uneSurDeux = modele(
	'une-sur-deux',
	`Construis la boîte B.\n\n${boite('A = 2 ; 5 ; 9 ; 13 ; 18', 'B = 4 ; {{q}} ; {{m}} ; 14 ; 19', 'placer: B')}`
);
const avecCase = modele(
	'avec-case',
	`Calcule $1+{{q}}=?$.\n\n${boite('Notes = 4 ; {{q}} ; {{m}} ; 14 ; 19', 'placer: Notes')}`,
	[{ expectedAnswer: '9' }]
);
const aLire = modele(
	'a-lire',
	`Lis la médiane : $?$.\n\n${boite('Notes = 4 ; 8 ; 12 ; 14 ; 19')}`,
	[{ expectedAnswer: '12' }]
);
const enRetrait = modele(
	'en-retrait',
	`> Construis la boîte.\n>\n${boite('Notes = 4 ; {{q}} ; {{m}} ; 14 ; 19', 'placer: Notes')
		.split('\n')
		.map((l) => `> ${l}`)
		.join('\n')}`
);

const modeles = new Map([une, deux, uneSurDeux, avecCase, aLire, enRetrait].map((t) => [t.id, t]));

/** Les blocs ```boite-a-moustaches d'un texte, analysés (retrait de liste ôté) */
function blocs(texte: string): StatChartNode[] {
	return [...texte.matchAll(/```boite-a-moustaches\n([\s\S]*?)\n\s*```/g)].map((m) =>
		parseStatChartContent(
			'boite-a-moustaches',
			m[1]
				.split('\n')
				.map((l) => l.replace(/^ {3}/, ''))
				.join('\n')
		)
	);
}

/** Le Typst d'un bloc : ce que le PDF dessine */
const typst = (node: StatChartNode) => generateStatChartTypst(node);

describe('buildSerie — boîte à moustaches à construire', () => {
	it('énoncé : axe seul, sans case ; corrigé : la boîte dessinée', () => {
		const serie = buildSerie(modeles, [{ templateId: 'une', seed: 1 }]);

		const [enonce] = blocs(serie.statement);
		expect(enonce.errors).toEqual([]);
		expect(enonce.spec?.boxPlot?.toPlace).toEqual([0]);
		expect(serie.statement).not.toMatch(/case:/);

		const [corrige] = blocs(serie.solution);
		expect(corrige.errors).toEqual([]);
		expect(corrige.spec?.boxPlot?.toPlace ?? null).toBeNull();
		expect(corrige.spec?.boxPlot?.boxes[0].values).toEqual([4, 8, 12, 14, 19]);
		expect(serie.solution).not.toMatch(/placer:|case:/);
	});

	it('le PDF : boîte absente de l’énoncé, présente au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'une', seed: 1 }]);
		const [enonce] = blocs(serie.statement);
		const [corrige] = blocs(serie.solution);
		expect(typst(corrige)).not.toEqual(typst(enonce));
		expect(typst(corrige).length).toBeGreaterThan(typst(enonce).length);
	});

	it('deux boîtes à construire : dix cases, les deux dessinées au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'deux', seed: 1 }]);
		expect(blocs(serie.statement)[0].spec?.boxPlot?.toPlace).toEqual([0, 1]);
		expect(blocs(serie.solution)[0].spec?.boxPlot?.toPlace ?? null).toBeNull();
	});

	it('une boîte sur deux à construire : l’autre reste dessinée à l’énoncé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'une-sur-deux', seed: 1 }]);
		expect(blocs(serie.statement)[0].spec?.boxPlot?.toPlace).toEqual([1]);
		expect(blocs(serie.solution)[0].spec?.boxPlot?.toPlace ?? null).toBeNull();
	});

	it('avec une autre case : la boîte compte pour cinq cases, la formule remplie', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.statement).toContain('\\text{……}');
		expect(serie.solution).toContain('\\mathbf{9}');
	});

	it('boîte à lire : inchangée', () => {
		const serie = buildSerie(modeles, [{ templateId: 'a-lire', seed: 1 }]);
		expect(blocs(serie.solution)[0].spec?.boxPlot?.boxes[0].values).toEqual([4, 8, 12, 14, 19]);
	});

	it('boîte en retrait ou citée : refusée, message à l’appui', () => {
		expect(() => buildSerie(modeles, [{ templateId: 'en-retrait', seed: 1 }])).toThrow(
			/premier niveau de l’énoncé/
		);
	});
});
