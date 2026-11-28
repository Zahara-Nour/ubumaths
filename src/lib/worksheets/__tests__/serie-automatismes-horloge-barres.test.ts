/**
 * Série d'automatismes : horloge à régler, diagramme en barres à construire (V109)
 * ================================================================================
 *
 * Jusqu'ici refusées (« 0 case(s) dans l'énoncé ») : aucune passe ne comptait leurs
 * cases. David, 2026-11-28 : au corrigé imprimé, aiguilles et barres en vert. À
 * l'énoncé, le bloc sans `case:` (cadran sans aiguilles, axe sans les barres à
 * construire) ; au corrigé, `case:` retirée et `solution: oui` ajoutée. Une case par
 * horloge, une par barre (plus une pour l'échelle à choisir). Bloc en retrait ou
 * cité : déjà refusé par le générateur.
 */
import { describe, expect, it } from 'vitest';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import { buildSerie } from '../serie-automatismes';
import { parseHorlogeContent } from '#lib/ubumark/parser/horloge-parser.ts';
import { parseStatChartContent } from '#lib/ubumark/parser/stat-chart-parser.ts';
import { generateHorlogeTypst } from '#lib/ubumark/generators/horloge-typst.ts';
import { generateStatChartTypst } from '#lib/ubumark/generators/stat-chart-typst.ts';

/** Un modèle d'une variation, énoncé donné, variables h = 9 et m = 25 */
function modele(id: string, statement: string, blanks?: unknown[]): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['CE2'],
		level: 1,
		status: 'draft',
		variations: [
			{
				statement,
				variables: [
					{ name: 'h', expression: '9' },
					{ name: 'm', expression: '25' }
				],
				...(blanks ? { blanks } : {})
			}
		]
	} as unknown as QuestionTemplate;
}

const horloge = (...lignes: string[]) => ['```horloge', ...lignes, '```'].join('\n');
const barres = (...lignes: string[]) =>
	['```barres', 'axes: Sport ; Élèves', 'Football = 12', 'Danse = {{m}}', ...lignes, '```'].join(
		'\n'
	);

const regler = modele(
	'regler',
	`Place les aiguilles : il est {{h}} h {{m}}.\n\n${horloge('placer: {{h}} h {{m}}', 'chiffres: tous')}`
);
const reglerTrotteuse = modele(
	'regler-trotteuse',
	`Place les aiguilles.\n\n${horloge('placer: {{h}} h {{m}} min 40 s')}`
);
const construire = modele(
	'construire',
	`Construis la barre de la danse.\n\n${barres('axe: 0 à 30, de 5 en 5', 'placer: Danse')}`
);
const echelle = modele(
	'echelle',
	`Construis le diagramme.\n\n${barres('axe: à choisir', 'placer: toutes')}`
);
const avecCase = modele(
	'avec-case',
	`Combien font $1+{{h}}=?$ ?\n\n${horloge('placer: {{h}} h {{m}}')}`,
	[{ expectedAnswer: '10' }]
);

const modeles = new Map(
	[regler, reglerTrotteuse, construire, echelle, avecCase].map((t) => [t.id, t])
);

/** Le corps du premier bloc `fence` d'un texte (retrait de liste ôté) */
function corps(texte: string, fence: string): string {
	const m = new RegExp('```' + fence + '\\n([\\s\\S]*?)\\n\\s*```').exec(texte);
	if (!m) throw new Error(`pas de bloc ${fence}`);
	return m[1]
		.split('\n')
		.map((l) => l.replace(/^ {3}/, ''))
		.join('\n');
}

describe('buildSerie — horloge à régler', () => {
	it('énoncé : cadran sans aiguilles ni case ; corrigé : aiguilles dessinées en vert', () => {
		const serie = buildSerie(modeles, [{ templateId: 'regler', seed: 1 }]);
		const enonce = parseHorlogeContent(corps(serie.statement, 'horloge'));
		expect(enonce.errors).toEqual([]);
		expect(enonce.spec?.placer).toEqual({ hours: 9, minutes: 25 });
		expect(enonce.spec?.solution).toBeUndefined();
		expect(serie.statement).not.toMatch(/case:|solution:/);
		expect(generateHorlogeTypst(enonce)).not.toContain('// solution');

		const corrige = parseHorlogeContent(corps(serie.solution, 'horloge'));
		expect(corrige.errors).toEqual([]);
		expect(corrige.spec?.solution).toBe(true);
		expect(serie.solution).not.toMatch(/case:/);
		expect(generateHorlogeTypst(corrige)).toContain('// solution');
	});

	it('avec la trotteuse : acceptée', () => {
		const serie = buildSerie(modeles, [{ templateId: 'regler-trotteuse', seed: 1 }]);
		const corrige = parseHorlogeContent(corps(serie.solution, 'horloge'));
		expect(corrige.spec?.placer).toEqual({ hours: 9, minutes: 25, seconds: 40 });
	});

	it('avec une autre case : l’horloge compte pour une case, la formule remplie', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.statement).toContain('\\text{……}');
		expect(serie.solution).toContain('\\mathbf{10}');
	});
});

describe('buildSerie — barres à construire', () => {
	it('énoncé : barre absente, sans case ; corrigé : la barre dessinée en vert', () => {
		const serie = buildSerie(modeles, [{ templateId: 'construire', seed: 1 }]);
		const enonce = parseStatChartContent('barres', corps(serie.statement, 'barres'));
		expect(enonce.errors).toEqual([]);
		expect(enonce.spec?.toPlace).toEqual([1]);
		expect(serie.statement).not.toMatch(/case:|solution:/);
		expect(generateStatChartTypst(enonce).match(/\/\/ barre( solution)?\n/g)).toHaveLength(1);

		const corrige = parseStatChartContent('barres', corps(serie.solution, 'barres'));
		expect(corrige.errors).toEqual([]);
		expect(corrige.spec?.solvedBars).toEqual([1]);
		expect(serie.solution).not.toMatch(/case:/);
		expect(generateStatChartTypst(corrige).match(/\/\/ barre solution\n/g)).toHaveLength(1);
	});

	it('échelle à choisir : l’échelle compte pour une case, le corrigé numérote l’axe juste', () => {
		const serie = buildSerie(modeles, [{ templateId: 'echelle', seed: 1 }]);
		expect(
			generateStatChartTypst(parseStatChartContent('barres', corps(serie.statement, 'barres')))
		).toContain('Une graduation vaut');
		const corrige = parseStatChartContent('barres', corps(serie.solution, 'barres'));
		expect(corrige.errors).toEqual([]);
		// Plus grande barre 25 : de 5 en 5, jusqu'à 50
		expect(corrige.spec?.axis).toEqual({ max: 50, step: 5 });
		expect(corrige.spec?.solvedBars).toEqual([0, 1]);
	});
});
