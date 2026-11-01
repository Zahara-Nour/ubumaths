/**
 * Énoncé d'une évaluation notée sans la réponse (chantier `fuite-enonce`, lot 1)
 * ==============================================================================
 *
 * `toPublicQuestion` envoie l'énoncé au navigateur : dans chaque bloc à geste, la
 * valeur que l'élève doit trouver devient `?`. Trois choses à tenir, bloc par bloc :
 * 1. rien de la réponse dans l'énoncé public (valeur exacte attendue) ;
 * 2. le bloc masqué se lit encore sans erreur, avec les mêmes noms, le même nombre
 *    de points ou de barres, la même figure (l'écran ne change pas) ;
 * 3. l'instance complète ne bouge pas (la correction du serveur en a besoin).
 * Et `?` écrit par un auteur dans un modèle est refusé par le générateur.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { toPublicQuestion } from '../public-question';
import { maskGestureAnswers } from '../masked-statement';
import { hasMaskedValue } from '$lib/ubumark/utils/masked-value';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';

// Constantes
const META = { position: 0, delaySeconds: 20 };

// Functions
function template(statement: string): QuestionTemplate {
	return {
		id: 'test-fuite-enonce',
		title: 'Fuite',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement: templateMarkdown(statement) }],
		grades: ['CE1'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as unknown as QuestionTemplate;
}

function instance(statement: string): QuestionInstance {
	const result = generateInstance(template(statement), 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** L'énoncé public d'une question, et l'instance d'où il vient */
function sent(statement: string): { full: QuestionInstance; statement: string } {
	const full = instance(statement);
	const before = full.statement;
	const question = toPublicQuestion(full, META);
	expect(full.statement, 'instance complète inchangée').toBe(before);
	return { full, statement: question.statement };
}

/** Corps du premier bloc ```kind (sans clôtures) */
function body(markdown: string, kind: string): string {
	const lines = markdown.split('\n');
	const start = lines.findIndex((line) => line.trim() === '```' + kind);
	const end = lines.findIndex((line, i) => i > start && line.trim() === '```');
	return lines.slice(start + 1, end).join('\n');
}

function block(kind: string, ...lines: string[]): string {
	return ['```' + kind, ...lines, '```'].join('\n');
}

describe('droite graduée à placer (```line)', () => {
	const STATEMENT = `Place A, B et C.\n\n${block('line', 'start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20', 'placer: A=3 ; B=7 ; C=12')}`;

	it('les valeurs deviennent ?, les noms restent', () => {
		const { full, statement } = sent(STATEMENT);
		expect(full.statement).toContain('placer: A=3 ; B=7 ; C=12');
		expect(statement).toContain('placer: A=? ; B=? ; C=?');
		expect(statement).not.toMatch(/placer:.*\d/);
	});

	it('le bloc masqué se lit : 3 points A, B, C, même droite, sa case', () => {
		const { full, statement } = sent(STATEMENT);
		const before = parseNumberLineContent(body(full.statement, 'line')).node!;
		const { node, errors } = parseNumberLineContent(body(statement, 'line'));
		expect(errors).toEqual([]);
		expect(node!.placer!.map((t) => t.name)).toEqual(['A', 'B', 'C']);
		expect(node!.config).toEqual(before.config);
		expect(node!.caseIndex).toBe(before.caseIndex);
	});

	it('un point seul : placer: ?', () => {
		const { statement } = sent(
			`Place 7.\n\n${block('line', 'start: 0', 'end: 20', 'step: 1', 'placer: 7')}`
		);
		expect(statement).toContain('placer: ?');
		expect(parseNumberLineContent(body(statement, 'line')).node!.placer).toHaveLength(1);
	});
});

describe('repère à points à placer (```courbe)', () => {
	const STATEMENT = `Place les points.\n\n${block('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: A=(2 ; 3) ; B=(-1 ; 2)')}`;

	it('les coordonnées disparaissent, les noms restent', () => {
		const { statement } = sent(STATEMENT);
		expect(statement).toContain('placer: A=? ; B=?');
		expect(statement).not.toContain('(2 ; 3)');
		expect(statement).not.toContain('(-1 ; 2)');
	});

	it('le bloc masqué se lit : 2 points A, B, même fenêtre, sa case', () => {
		const { full, statement } = sent(STATEMENT);
		const before = parseCourbeContent(body(full.statement, 'courbe')).spec!;
		const node = parseCourbeContent(body(statement, 'courbe'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.placer!.map((t) => t.name)).toEqual(['A', 'B']);
		expect(node.spec!.window).toEqual(before.window);
	});

	it('un point seul, sans nom : placer: ?', () => {
		const { statement } = sent(
			`Place le point.\n\n${block('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: (2 ; 3)')}`
		);
		expect(statement).toContain('placer: ?');
		expect(parseCourbeContent(body(statement, 'courbe')).spec!.placer).toHaveLength(1);
	});
});

describe('horloge à placer (```horloge)', () => {
	it('l’heure disparaît, l’horloge à placer reste', () => {
		const { statement } = sent(`Place 9 h 25.\n\n${block('horloge', 'placer: 9 h 25')}`);
		expect(statement).toContain('placer: ?');
		expect(statement.split('```horloge')[1]).not.toContain('25');
		const node = parseHorlogeContent(body(statement, 'horloge'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.placer).toBeDefined();
		expect(node.caseIndex).toBe(0);
	});
});

describe('collection et monnaie à construire', () => {
	it('collection : construire: ?, se lit, même dessin', () => {
		const { full, statement } = sent(
			`Construis le nombre.\n\n${block('collection', 'construire: 34')}`
		);
		expect(statement).toContain('construire: ?');
		expect(statement).not.toContain('34');
		const before = parseCollectionContent(body(full.statement, 'collection'));
		const node = parseCollectionContent(body(statement, 'collection'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.drawing).toBe(before.spec!.drawing);
	});

	it('monnaie : construire: ?, la même réserve', () => {
		const { full, statement } = sent(
			`Paie le ballon.\n\n${block('monnaie', 'construire: 35', 'réserve: 20 10 5 2')}`
		);
		expect(statement).toContain('construire: ?');
		expect(statement).not.toContain('35');
		const before = parseMonnaieContent(body(full.statement, 'monnaie'));
		const node = parseMonnaieContent(body(statement, 'monnaie'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.reserve).toEqual(before.spec!.reserve);
	});

	// Chantier monnaie-centimes : la réserve par défaut dépend de la somme (décision 5) ;
	// masquée, la somme ne la donne plus : l'énoncé écrit la réserve de l'écran d'entraînement
	for (const build of ['3,45', '35']) {
		it(`monnaie sans réserve: (construire: ${build}) : la même réserve`, () => {
			const { full, statement } = sent(`Paie.\n\n${block('monnaie', `construire: ${build}`)}`);
			expect(statement).toContain('construire: ?');
			expect(statement).not.toContain(build);
			const before = parseMonnaieContent(body(full.statement, 'monnaie'));
			const node = parseMonnaieContent(body(statement, 'monnaie'));
			expect(node.errors).toEqual([]);
			expect(node.spec!.reserve).toEqual(before.spec!.reserve);
		});
	}
});

describe('figure à colorier (```partage)', () => {
	it('colorier: ?, la même figure (forme, unités)', () => {
		const { full, statement } = sent(
			`Colorie la fraction.\n\n${block('partage', 'forme: bande 4', 'unites: 3', 'colorier: 7/4')}`
		);
		expect(statement).toContain('colorier: ?');
		expect(statement).not.toContain('7/4');
		const before = parsePartageContent(body(full.statement, 'partage')).spec!;
		const node = parsePartageContent(body(statement, 'partage'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.shape).toEqual(before.shape);
		expect(node.spec!.units).toBe(before.units);
		expect(node.spec!.colorier).toBeDefined();
	});
});

describe('diagramme en barres à construire (```barres)', () => {
	const BARS = block(
		'barres',
		'axes: Sport ; Effectif',
		'axe: 0 à 20, de 2 en 2',
		'Football = 12',
		'Natation = 8',
		'Danse = 7',
		'placer: Natation ; Danse'
	);

	it('les effectifs des barres à construire deviennent ?, les autres restent', () => {
		const { statement } = sent(`Construis les barres.\n\n${BARS}`);
		expect(statement).toContain('Natation = ?');
		expect(statement).toContain('Danse = ?');
		expect(statement).toContain('Football = 12');
		expect(statement).not.toMatch(/= [87]\b/);
	});

	it('le bloc masqué se lit : mêmes barres à construire, même axe', () => {
		const { full, statement } = sent(`Construis les barres.\n\n${BARS}`);
		const before = parseStatChartContent('barres', body(full.statement, 'barres')).spec!;
		const node = parseStatChartContent('barres', body(statement, 'barres'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.toPlace).toEqual(before.toPlace);
		expect(node.spec!.data.map((d) => d.label)).toEqual(before.data.map((d) => d.label));
		expect(node.spec!.axis).toEqual(before.axis);
	});

	it('placer: toutes avec axe: à choisir : tous les effectifs deviennent ?', () => {
		const { statement } = sent(
			`Construis le diagramme.\n\n${block('barres', 'axes: Ville ; Élèves', 'axe: à choisir', 'Alphaville = 42', 'Bêtaville = 35', 'Gammaville = 18', 'placer: toutes')}`
		);
		expect(statement).not.toMatch(/= \d/);
		const node = parseStatChartContent('barres', body(statement, 'barres'));
		expect(node.errors).toEqual([]);
		expect(node.spec!.chooseScale).toBe(true);
		expect(node.spec!.toPlace).toEqual([0, 1, 2]);
	});
});

describe('ce qui ne change pas', () => {
	it('un énoncé sans bloc à geste revient tel quel', () => {
		const text = `Calcule $3+4$.\n\n${block('line', 'start: 0', 'end: 10', 'step: 1', 'points: A=3')}`;
		expect(maskGestureAnswers(text)).toBe(text);
	});

	it('un bloc dans une option de ```choix reste tel quel (ce n’est pas un geste)', () => {
		const text = [
			'```choix',
			'- Cette horloge :',
			'',
			'  ```horloge',
			'  placer: 9 h 25',
			'  ```',
			'- Aucune',
			'```'
		].join('\n');
		expect(maskGestureAnswers(text)).toBe(text);
	});

	it('barres illisibles (placer: d’une catégorie absente) : toutes les données masquées', () => {
		const text = block(
			'barres',
			'axe: 0 à 20, de 2 en 2',
			'Foot = 12',
			'Danse = 7',
			'placer: Judo'
		);
		const masked = maskGestureAnswers(text);
		expect(masked).toContain('Foot = ?');
		expect(masked).toContain('Danse = ?');
		expect(masked).toContain('axe: 0 à 20, de 2 en 2');
	});

	it('un bloc cité garde ce qui l’imbrique', () => {
		const text = ['> ```horloge', '> placer: 9 h 25', '> ```'].join('\n');
		expect(maskGestureAnswers(text)).toBe(['> ```horloge', '> placer: ?', '> ```'].join('\n'));
	});
});

describe('« ? » écrit par un auteur : refusé par le générateur', () => {
	it.each([
		['line', block('line', 'start: 0', 'end: 20', 'step: 1', 'placer: A=? ; B=7')],
		['horloge', block('horloge', 'placer: ?')],
		['collection', block('collection', 'construire: ?')],
		['partage', block('partage', 'forme: bande 8', 'colorier: ?')],
		['courbe', block('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: A=? ; B=(1 ; 2)')],
		['monnaie', block('monnaie', 'construire: ?')],
		['barres', block('barres', 'axe: 0 à 20, de 2 en 2', 'Foot = 12', 'Danse = ?', 'placer: Danse')]
	])('%s', (_kind, source) => {
		const result = generateInstance(template(`Question.\n\n${source}`), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toContain('« ? »');
	});
});

describe('« ? » ailleurs que sur la ligne de la réponse : permis', () => {
	it.each([
		['légende d’horloge', ['placer: 9 h 25', 'légendes: ?']],
		[
			'titre d’axe des barres',
			['axes: Sport ; ?', 'axe: 0 à 20, de 2 en 2', 'Foot = 12', 'placer: Foot']
		]
	])('%s', (_name, lines) => {
		expect(hasMaskedValue(lines.join('\n'))).toBe(false);
	});

	it('mais la valeur masquée, oui', () => {
		expect(hasMaskedValue('placer: A=3 ; B=?')).toBe(true);
		expect(hasMaskedValue('Danse = ?')).toBe(true);
	});
});

describe('plusieurs blocs à geste dans un énoncé', () => {
	it('chacun est masqué', () => {
		const { statement } = sent(
			[
				'Place, puis construis.',
				'',
				block('line', 'start: 0', 'end: 20', 'step: 1', 'placer: A=3'),
				'',
				block('collection', 'construire: 34')
			].join('\n')
		);
		expect(statement).toContain('placer: A=?');
		expect(statement).toContain('construire: ?');
		expect(statement).not.toContain('34');
	});
});
