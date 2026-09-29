/**
 * Lots « clôture » : les derniers modèles R / N sans correction
 * =============================================================
 *
 * Liste calculée en prod (lecture seule) le 2026-09-30 : modèles classés R ou N
 * dans `docs/wip/corrections-manquantes-frontiere.md` (avec ses « Décisions ») qui
 * n'ont encore aucune correction (ni variation, ni `shared`) : 40 modèles.
 *
 * Là où la question ne pose aucun calcul lisible (opération dans la phrase, chiffre
 * d'un rang, facteur commun…), l'entrée DÉCLARE un contrôle structurel
 * (`checks`, cf. `StructuralChecks` dans lib/verify.ts), vérifié à chaque tirage.
 * Jamais de passe-droit global.
 *
 * Écarté (voir LEFT_OUT) : ce que rien ne permet de vérifier.
 * Deux lots (import tout-ou-rien, statut en prod) : `cloture-brouillons`, `cloture-publies`.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import { alignBlock, colored, inline } from '../lib/palette';
import type { EntryChecks, StructuralChecks } from '../lib/verify';
import { positionTable } from './numeration';
import { conversions } from './vague3';
import { VAGUE4_ENTRIES } from './vague4';

// ============================================================================
// TYPES
// ============================================================================

interface ClotureEntry extends LotEntry {
	status: 'draft' | 'published';
}

type Written = (template: QuestionTemplate) => WrittenCorrection;

// ============================================================================
// HELPERS
// ============================================================================

const O = (latex: string) => colored('transformed', latex);
const B = (latex: string) => colored('intermediate', latex);
const G = (latex: string) => colored('conclusion', latex);

const one =
	(steps: string[], notes: string[] = []): Written =>
	() => ({ steps: { shared: steps }, notes });

const byVariation =
	(
		build: (variation: QuestionTemplate['variations'][number], index: number) => string[],
		notes: string[] = []
	): Written =>
	(template) => ({ steps: { byVariation: template.variations.map(build) }, notes });

function entry(
	templateId: string,
	classe: 'R' | 'N',
	code: string,
	status: ClotureEntry['status'],
	written: Written,
	checks?: EntryChecks
): ClotureEntry {
	return { templateId, classe, code, status, written, ...(checks ? { checks } : {}) };
}

/** Correction déjà rédigée en vague 4 (lots/vague4.ts), notes remplacées */
function fromVague4(templateId: string, notes: string[]): Written {
	const source = VAGUE4_ENTRIES.find((e) => e.templateId === templateId);
	if (!source?.written) throw new Error(`${templateId} : absent de la vague 4`);
	const written = source.written;
	return (template) => ({ steps: written(template).steps, notes });
}

// ============================================================================
// R : DOUBLE, QUADRUPLE, COMPLÉMENT, DIZAINES
// ============================================================================

const RULE_DOUBLE =
	'**Double.** Pour doubler un nombre, on double ses dizaines, puis ses unités, et on ajoute.';
const RULE_QUAD = '**Quadruple.** Le quadruple, c’est $4$ fois le nombre : le double du double.';

/** Double de `{{x}}` : dizaines puis unités (x ∈ 1..9, 11..15, 25, dizaines entières) */
function doubleSteps(x: string): string[] {
	const tens = `{{eval:${x}-mod(${x},10)}}`;
	const units = `{{eval:mod(${x},10)}}`;
	return [
		RULE_DOUBLE,
		alignBlock([
			`2 \\times ${O(`{{${x}}}`)} ` +
				`{{if:mod(${x},10)=0|&= 2 \\times {{eval:${x}/10}} \\times 10 \\\\ &= ${B(`{{eval:2*${x}/10}}`)} \\times 10 \\\\ |}}` +
				`{{if:(${x}-mod(${x},10))*mod(${x},10)>0|&= 2 \\times ${tens} + 2 \\times ${units} \\\\ &= ${B(`{{eval:2*(${x}-mod(${x},10))}}`)} + ${B(`{{eval:2*mod(${x},10)}}`)} \\\\ |}}` +
				'&= {{solution}}'
		])
	];
}

const DOUBLE_POSED: StructuralChecks = { posed: { expression: '2*{{a}}', constants: ['2'] } };

function quadSteps(x: string): string[] {
	return [
		RULE_QUAD,
		`Le double de $${O(`{{${x}}}`)}$ est $${B(`{{eval:2*${x}}}`)}$, puis on double encore.`,
		alignBlock([
			`4 \\times ${O(`{{${x}}}`)} &= 2 \\times \\left( 2 \\times ${O(`{{${x}}}`)} \\right)`,
			`&= 2 \\times ${B(`{{eval:2*${x}}}`)}`,
			'&= {{solution}}'
		])
	];
}

const quadPosed = (x: string): StructuralChecks => ({
	posed: { expression: `4*{{${x}}}`, constants: ['4'] }
});

/** 17a3c039 : de 10 000 − c jusqu'au millier suivant, puis jusqu'à 10 000 */
const COMPL_STEPS = [
	'**Compléter.** On avance par bonds : jusqu’au millier suivant, puis jusqu’à $10\\,000$.',
	`De $${O('{{eval:10000-(c)}}')}$ à $${B('{{eval:10000-a*1000}}')}$, il faut $${B('{{eval:b*100}}')}$ ; ` +
		`de $${B('{{eval:10000-a*1000}}')}$ à $10\\,000$, il faut $${B('{{eval:a*1000}}')}$.`,
	alignBlock([
		`10\\,000 - ${O('{{eval:10000-(c)}}')} &= ${B('{{eval:b*100}}')} + ${B('{{eval:a*1000}}')}`,
		'&= {{solution}}'
	])
];

/** 4ee04b22 : dans 80, combien de fois 2 → 8 dizaines : 2 = 4 dizaines */
const DIV_DIZ_STEPS = [
	'**Diviser des dizaines.** On compte en dizaines, on divise avec la table, puis on revient aux unités.',
	`$${O('{{eval:a*b*10}}')}$, c’est $${O('{{eval:a*b}}')}$ dizaines ; $${O('{{eval:a*b}}')} : {{b}} = ${B('{{a}}')}$.`,
	alignBlock([
		`${O('{{eval:a*b*10}}')} : {{b}} &= \\left( ${O('{{eval:a*b}}')} : {{b}} \\right) \\times 10`,
		`&= ${B('{{a}}')} \\times 10`,
		'&= {{solution}}'
	])
];

// ============================================================================
// N-POSITION : chiffre d'un rang (tableau de numération)
// ============================================================================

const RANKS: Record<string, number> = {
	milliers: 1000,
	centaines: 100,
	dizaines: 10,
	unités: 1,
	dixièmes: 0.1,
	centièmes: 0.01,
	millièmes: 0.001
};

const RULE_POSITION =
	'**Tableau de numération.** Chaque chiffre a un rang ; on range les chiffres du nombre ' +
	'dans le tableau, puis on lit la colonne demandée.';

/**
 * Chiffre de rang : `digits` = variable → rang (valeur). Le rang demandé est lu dans
 * l'énoncé de chaque variation (« chiffre des **centièmes** »).
 */
function positionEntry(
	templateId: string,
	status: ClotureEntry['status'],
	digits: Record<string, number>,
	template: { statements: string[] }
): ClotureEntry {
	const ranked = Object.entries(digits).sort((a, b) => b[1] - a[1]);
	const number = ranked.map(([name, rank]) => `{{${name}}}*${rank}`).join('+');
	const asked = template.statements.map((statement) => {
		const word = /chiffre des \**([a-zéè]+)/.exec(statement)?.[1] ?? '';
		const rank = RANKS[word];
		if (rank === undefined) throw new Error(`${templateId} : rang illisible « ${word} »`);
		return { word, rank };
	});
	const table = (rank: number) => {
		const headers: string[] = [];
		const cells: string[] = [];
		for (const [name, r] of ranked) {
			if (r === 0.1) {
				headers.push(',');
				cells.push(',');
			}
			const label = Object.keys(RANKS).find((k) => RANKS[k] === r) ?? '';
			headers.push(label);
			cells.push(r === rank ? O(`{{${name}}}`) : `{{${name}}}`);
		}
		return positionTable(headers, cells);
	};
	return entry(
		templateId,
		'N',
		'N-POSITION',
		status,
		(t) => ({
			steps: {
				byVariation: t.variations.map((_, index) => [
					RULE_POSITION,
					table(asked[index].rank),
					`Le chiffre des ${asked[index].word} est ${inline(G('{{solution}}'))}.`
				])
			},
			notes: [
				'Contrôle déclaré `digit` : le tableau relit le nombre, la colonne du rang porte la réponse.'
			]
		}),
		asked.map(({ rank }) => ({ digit: { number: `{{eval:${number}}}`, rank } }))
	);
}

// ============================================================================
// N-ENCADR
// ============================================================================

const RULE_ENCADR =
	'**Encadrer.** On garde les chiffres jusqu’au rang demandé (on supprime les suivants) : ' +
	'c’est la borne inférieure ; on ajoute $1$ à ce rang : c’est la borne supérieure.';

function encadrSteps(
	n: string,
	drop: string,
	lower: string,
	step: string,
	upper: string,
	rank: string
): string[] {
	return [
		RULE_ENCADR,
		`On garde les chiffres de $${O(`{{${n}}}`)}$ jusqu’aux ${rank}, puis on ajoute $${B(step)}$.`,
		alignBlock([`${O(`{{${n}}}`)} - ${drop} &= ${lower}`]),
		alignBlock([`${lower} + ${B(step)} &= ${upper}`]),
		`Donc $${lower} < {{${n}}} < ${upper}$.`
	];
}

// ============================================================================
// N-FRAC-ADD : trous (numérateur ou dénominateur), même dénominateur
// ============================================================================

const RULE_FRAC_ADD =
	'**Fractions de même dénominateur.** On garde le dénominateur et on ajoute (ou on ' +
	'soustrait) les numérateurs : $\\dfrac{a}{d} + \\dfrac{b}{d} = \\dfrac{a + b}{d}$.';

/** Numérateur manquant / dénominateur manquant, lu dans la variable d'expression */
function fracHole(variation: QuestionTemplate['variations'][number]): {
	steps: string[];
	checks: StructuralChecks;
} {
	const expression = String(
		variation.variables?.find((v) => v.name.startsWith('expression'))?.expression ?? ''
	);
	const minus = expression.includes('-{{') || expression.includes('-?');
	const [left] = expression.split('=');
	const terms = left.split(/[+-](?![^{]*\})/);
	if (/\/\?/.test(expression)) {
		return {
			steps: [
				RULE_FRAC_ADD,
				`Toutes les autres fractions ont pour dénominateur $${B('{{c}}')}$ : le dénominateur manquant est le même.`,
				alignBlock(['? &= {{solution}}'])
			],
			checks: { hole: 'denominator' }
		};
	}
	// Numérateur manquant : premier ou second terme
	const first = terms[0].startsWith('?');
	const total = minus ? '{{eval:a-(b)}}' : '{{eval:a+(b)}}';
	const minusB = '{{if:b<0|+ {{eval:-(b)}}|- {{b}}}}';
	const plusB = '{{if:b<0|- {{eval:-(b)}}|+ {{b}}}}';
	const minusA = '{{if:a<0|+ {{eval:-(a)}}|- {{a}}}}';
	const calc = first
		? `${total} ${minus ? plusB : minusB}`
		: minus
			? // a − ? = T donc ? = a − T ; T = 0 → ? = −(0 − a), sans « − 0 »
				`{{if:a-(b)=0|-\\left( 0 ${minusA} \\right)|{{a}} {{if:a-(b)<0|+ {{eval:b-(a)}}|- {{eval:a-(b)}}}}}}`
			: `${total} ${minusA}`;
	return {
		steps: [
			RULE_FRAC_ADD,
			'Les dénominateurs sont égaux : on cherche le numérateur manquant dans l’égalité des numérateurs.',
			alignBlock([`? &= ${calc}`, '&= {{solution}}'])
		],
		checks: {}
	};
}

function fracHoleEntry(templateId: string, template: { expressions: string[] }): ClotureEntry {
	const variations = template.expressions.map((expression) =>
		fracHole({
			variables: [{ name: 'expression1', expression }]
		} as QuestionTemplate['variations'][number])
	);
	return entry(
		templateId,
		'N',
		'N-FRAC-ADD',
		'draft',
		() => ({
			steps: { byVariation: variations.map((v) => v.steps) },
			notes: [
				'Trou au dénominateur : contrôle déclaré `hole: denominator` (les autres dénominateurs donnent la réponse).'
			]
		}),
		variations.map((v) => v.checks)
	);
}

// ============================================================================
// N-UNITES
// ============================================================================

/** 355bd41a : `a~\unit{U1} = ?~\unit{U2}` (litre ↔ volumes), facteur par le convertisseur */
const LITRE_VARIATIONS: [string, string, number][] = [
	['m^3', 'L', 1000],
	['L', 'm^3', 0.001],
	['dm^3', 'L', 1],
	['L', 'dm^3', 1],
	['cm^3', 'mL', 1],
	['mL', 'cm^3', 1],
	['cm^3', 'L', 0.001],
	['L', 'cm^3', 1000]
];

const unitText = (u: string) =>
	`\\text{${u.replace(/\^(\d)/, '')}}${/\^(\d)/.exec(u) ? `^${/\^(\d)/.exec(u)?.[1]}` : ''}`;

function litreSteps([from, to, factor]: [string, string, number]): string[] {
	const op =
		factor === 1
			? '{{a}} \\times 1'
			: factor > 1
				? `{{a}} \\times ${B(String(factor))}`
				: `{{a}} : ${B(String(1 / factor))}`;
	return [
		'**Litres et volumes.** $1~\\text{L} = 1~\\text{dm}^3$ et $1~\\text{mL} = 1~\\text{cm}^3$ ; ' +
			'$1~\\text{m}^3 = 1000~\\text{dm}^3$ et $1~\\text{dm}^3 = 1000~\\text{cm}^3$.',
		`$1~${unitText(from)}$ vaut $${B(String(factor).replace('.', '{,}'))}~${unitText(to)}$.`,
		alignBlock([`? &= ${op}`, '&= {{solution}}'])
	];
}

/** b6269f1e : `c + d = ?[m]` — on convertit c dans l'unité du résultat */
const UNIT_SUM = (unit: string): string[] => [
	'**Calculer avec des unités.** On convertit dans la même unité avant d’additionner.',
	`On convertit d’abord le premier nombre en $\\text{${unit}}$, puis on additionne.`,
	alignBlock([`? &= ${O(`{{eval:(c)/(1[${unit}]);d}}`)} + {{b}}`, '&= {{solution}}'])
];

// ============================================================================
// ENTRIES
// ============================================================================

const POSITION_DECIMAL = (n: number, word: string) =>
	`Quel est le chiffre des **${word}** dans le nombre ${n}`;

export const CLOTURE_ENTRIES: ClotureEntry[] = [
	// ------------------------------------------------ R (vague 1, sans variable d'expression)
	entry(
		'56b2737d-f208-4b46-a4af-80ba3a4d8c03',
		'R',
		'R-QUAD',
		'published',
		one(quadSteps('b')),
		quadPosed('b')
	),
	entry(
		'b7cd1846-fb2a-4d5e-8269-925887ebfb3d',
		'R',
		'R-QUAD',
		'published',
		one(quadSteps('a')),
		quadPosed('a')
	),
	entry(
		'3c79eb9c-af15-4bce-ac3a-fff675a30484',
		'R',
		'R-QUAD',
		'published',
		one(quadSteps('a')),
		quadPosed('a')
	),
	entry(
		'022130ca-f6c1-4c78-a147-6519a15f62cd',
		'R',
		'R-DOUBLE',
		'published',
		one(doubleSteps('a')),
		DOUBLE_POSED
	),
	entry(
		'47f97c9f-5117-4817-8d10-7c17777397d8',
		'R',
		'R-DOUBLE',
		'published',
		one(doubleSteps('a')),
		DOUBLE_POSED
	),
	entry('4ee04b22-c7c3-42a7-8cbf-26022ffbbc28', 'R', 'R-DIV-DIZ', 'published', one(DIV_DIZ_STEPS), {
		posed: { expression: '{{eval:a*10*b}}:{{b}}' }
	}),
	entry('17a3c039-744d-4108-9b47-49f0183990b7', 'R', 'R-COMPL', 'published', one(COMPL_STEPS), {
		posed: { expression: '10000-{{eval:10000-(c)}}' }
	}),
	// ------------------------------------------------ N-POSITION
	positionEntry(
		'f96588e4-50ee-4505-9015-54f965f8ab43',
		'draft',
		{ a: 0.01, b: 0.1, c: 1 },
		{
			statements: ['centièmes', 'dixièmes', 'unités'].map((w) => POSITION_DECIMAL(0, w))
		}
	),
	positionEntry(
		'ce00dd64-d584-4bfc-b23c-75d895f82a37',
		'draft',
		{ a: 0.01, b: 0.1, c: 1, d: 10, f: 100 },
		{
			statements: ['centièmes', 'dixièmes', 'unités', 'dizaines', 'centaines'].map((w) =>
				POSITION_DECIMAL(0, w)
			)
		}
	),
	positionEntry(
		'1b94c415-df9a-43ad-b48e-0cbf894c342e',
		'draft',
		{ a: 0.001, b: 0.01, c: 0.1, d: 1 },
		{
			statements: ['millièmes', 'centièmes', 'dixièmes', 'unités'].map((w) =>
				POSITION_DECIMAL(0, w)
			)
		}
	),
	positionEntry(
		'5cc22ecd-351e-4959-ab27-79883cb9c9d3',
		'draft',
		{ a: 0.001, b: 0.01, c: 0.1, d: 1, f: 10, g: 100, h: 1000 },
		{
			statements: [
				'millièmes',
				'centièmes',
				'dixièmes',
				'unités',
				'dizaines',
				'centaines',
				'milliers'
			].map((w) => POSITION_DECIMAL(0, w))
		}
	),
	positionEntry(
		'5bd4b19a-0416-4fcf-b55a-59f4ceb733e3',
		'published',
		{ a: 10, b: 1 },
		{
			statements: ['dizaines', 'unités'].map((w) => POSITION_DECIMAL(0, w))
		}
	),
	positionEntry(
		'17ed1fc1-07b6-4ec8-b140-393b5c56f55e',
		'published',
		{ a: 100, b: 10, c: 1 },
		{
			statements: ['centaines', 'dizaines', 'unités'].map((w) => POSITION_DECIMAL(0, w))
		}
	),
	positionEntry(
		'13d52989-fff8-4da6-a189-1f589cd53355',
		'published',
		{ a: 1000, b: 100, c: 10, d: 1 },
		{
			statements: ['milliers', 'centaines', 'dizaines', 'unités'].map((w) => POSITION_DECIMAL(0, w))
		}
	),
	entry(
		'ec030034-54c7-413a-a379-ab494b41f70d',
		'N',
		'N-POSITION',
		'published',
		byVariation((_, index) => {
			const k = index === 0 ? 2 : 3;
			const word = index === 0 ? 'double' : 'triple';
			return [
				'**Nombre de dizaines.** Un nombre de dizaines compte pour ce nombre $\\times 10$ ; on ajoute ensuite les unités.',
				`Le nombre de dizaines est le ${word} de $${O('{{a}}')}$, soit $${B(`{{eval:${k}*a}}`)}$ dizaines.`,
				alignBlock([
					`\\left( ${k} \\times ${O('{{a}}')} \\right) \\times 10 + ${O('{{a}}')} &= ${B(`{{eval:${k}*a}}`)} \\times 10 + ${O('{{a}}')}`,
					`&= {{eval:${k}*a*10}} + ${O('{{a}}')}`,
					'&= {{solution}}'
				])
			];
		}),
		[
			{ posed: { expression: '2*{{a}}*10+{{a}}', constants: ['2', '10'] } },
			{ posed: { expression: '3*{{a}}*10+{{a}}', constants: ['3', '10'] } }
		]
	),
	// ------------------------------------------------ N-ENCADR
	entry(
		'6379fa20-672c-4771-9d48-6d167a7a922e',
		'N',
		'N-ENCADR',
		'draft',
		one(
			encadrSteps(
				'f',
				'{{eval:d*0.001;d}}',
				'{{eval:a+b*0.1+c*0.01;d}}',
				'0.01',
				'{{eval:a+b*0.1+(c+1)*0.01;d}}',
				'centièmes'
			)
		)
	),
	entry(
		'32724446-558b-4eea-ad4a-13d7c6afe435',
		'N',
		'N-ENCADR',
		'draft',
		one(
			encadrSteps(
				'd',
				'{{eval:c*0.01;d}}',
				'{{eval:a+b*0.1;d}}',
				'0.1',
				'{{eval:a+(b+1)*0.1;d}}',
				'dixièmes'
			)
		)
	),
	entry(
		'fac5225d-2dae-49ec-b449-8900e7385fe6',
		'N',
		'N-ENCADR',
		'draft',
		one(encadrSteps('c', '{{eval:b*0.1;d}}', '{{a}}', '1', '{{eval:a+1}}', 'unités'))
	),
	entry(
		'b26e8a84-3788-40f8-baf0-23f0f96fe1f0',
		'N',
		'N-ENCADR',
		'draft',
		byVariation((_, index) => [
			'**Entier le plus proche.** On supprime la partie décimale : c’est l’entier inférieur ; on lui ajoute $1$ : c’est l’entier supérieur.',
			alignBlock([
				`${O('{{c}}')} - {{eval:b*0.1;d}} &= ${index === 0 ? B('{{a}}') : '{{solution}}'}`
			]),
			...(index === 0 ? [alignBlock([`${B('{{a}}')} + 1 &= {{solution}}`])] : []),
			`Donc $${index === 0 ? '{{a}} < {{c}} < {{solution}}' : '{{solution}} < {{c}} < {{eval:a+1}}'}$.`
		]),
		{ posed: { expression: '{{c}}', operand: true } }
	),
	// ------------------------------------------------ N-DIVEUCL, N-DIVISEUR
	entry(
		'14a51794-8825-4297-9858-083fad48ab8c',
		'N',
		'N-DIVEUCL',
		'published',
		one([
			'**Division euclidienne.** $a = b \\times q + r$ avec $0 \\leq r < b$ : $q$ est le quotient, $r$ le reste.',
			`Dans la table de $${O('{{a}}')}$, le plus grand multiple qui ne dépasse pas $\\;{{eval:a*b+c}}$ est ` +
				`$${O('{{a}}')} \\times ${B('{{b}}')}$ : le quotient est $q = ${B('{{b}}')}$.`,
			alignBlock([
				`{{eval:a*b+c}} - ${O('{{a}}')} \\times ${B('{{b}}')} &= {{eval:a*b+c}} - {{eval:a*b}}`,
				'&= {{c}}'
			]),
			`Le reste est $${G('{{c}}')}$ (il est bien plus petit que $\\;{{a}}$) : $$\\;{{eval:a*b+c}} = \\left( {{a}} \\times {{b}} \\right) + {{c}}$$`
		])
	),
	entry(
		'bd21a9d7-142a-47a0-be18-7719b58934ea',
		'N',
		'N-DIVISEUR',
		'published',
		one([
			'**Diviseur.** Si $n = a \\times b$, alors $a$ et $b$ sont des diviseurs de $n$.',
			alignBlock([`{{eval:a*b}} &= ${O('{{a}}')} \\times {{b}}`]),
			`Donc $${O('{{a}}')}$ est un diviseur de $\\;{{eval:a*b}}$ (et $\\;{{b}}$ aussi) : un diviseur est ${inline(G('{{solution}}'))}.`
		]),
		{ posed: { expression: '{{eval:a*b}}' }, end: 'factor' }
	),
	// ------------------------------------------------ N (vague 4, clos jusqu'ici)
	...[
		'aeb86af9-7bf1-440a-be17-735a41b5ce46',
		'843c3186-afc6-4ccd-83f7-beab64d3e420',
		'34e569e7-7834-456f-8e48-65b2a1183030'
	].map((id) =>
		entry(
			id,
			'N',
			'N-OPPOSE-EXPR',
			'draft',
			fromVague4(id, [
				'Contrôle déclaré `transform: opposite` : le calcul part de −(A), A = expression posée.'
			]),
			{
				transform: 'opposite'
			}
		)
	),
	entry(
		'294c4316-d2c9-4894-9c3c-c2b24fdffc99',
		'N',
		'N-FACT-COMMUN',
		'draft',
		fromVague4('294c4316-d2c9-4894-9c3c-c2b24fdffc99', [
			'Contrôle déclaré `end: factor` : le calcul part de la somme posée et finit sur un produit dont un facteur est la réponse.'
		]),
		{ end: 'factor' }
	),
	entry(
		'e66089e0-b7bd-49fe-a968-9a8df3d325fd',
		'N',
		'N-FACT-COMMUN',
		'draft',
		(template) => ({
			steps: { byVariation: template.variations.map((v) => factorSteps(String(v.statement))) },
			notes: ['Contrôle déclaré `end: factor` (facteur numérique ou lettre commune).']
		}),
		{ end: 'factor' }
	),
	entry(
		'2bdb3db6-8ef7-43af-aa7a-2332e34d2a01',
		'N',
		'N-RACINE-AFF',
		'draft',
		fromVague4('2bdb3db6-8ef7-43af-aa7a-2332e34d2a01', [
			'Contrôle déclaré `equations: affine-root` : chaque ligne est une équation affine vérifiée par la réponse.'
		]),
		{ equations: 'affine-root' }
	),
	...['5d515eb1-c8f8-4678-b4bd-f9ab3f34713f', '78feafed-650f-44e0-a2c3-1e677809722b'].map((id) =>
		entry(
			id,
			'N',
			'N-VOCAB-OP',
			'published',
			fromVague4(id, ['Contrôle déclaré `written` : la conclusion écrit la réponse telle quelle.']),
			{
				written: true
			}
		)
	),
	// ------------------------------------------------ N-FRAC-ADD, N-INVERSE
	fracHoleEntry('7d12a172-405d-4281-af44-f02c265ad174', {
		expressions: [
			'?/{{c}}+{{b}}/{{c}}={{eval:a+b}}/{{c}}',
			'{{a}}/?+{{b}}/{{c}}={{eval:a+b}}/{{c}}',
			'{{a}}/{{c}}+?/{{c}}={{eval:a+b}}/{{c}}',
			'{{a}}/{{c}}-{{b}}/?={{eval:a-b}}/{{c}}',
			'?/{{c}}-{{b}}/{{c}}={{eval:a-b}}/{{c}}',
			'{{a}}/{{c}}-?/{{c}}={{eval:a-b}}/{{c}}'
		]
	}),
	fracHoleEntry('86b80159-8395-4546-8d0e-2828693b6d97', {
		expressions: [
			'?/{{c}}+{{{b}}}/{{c}}={{eval:a+(b)}}/{{c}}',
			'{{{a}}}/?+{{{b}}}/{{c}}={{eval:a+(b)}}/{{c}}',
			'{{{a}}}/{{c}}+?/{{c}}={{eval:a+(b)}}/{{c}}',
			'{{{a}}}/{{c}}-{{{b}}}/?={{eval:a-(b)}}/{{c}}',
			'?/{{c}}-{{{b}}}/{{c}}={{eval:a-(b)}}/{{c}}',
			'{{{a}}}/{{c}}-?/{{c}}={{eval:a-(b)}}/{{c}}'
		]
	}),
	entry(
		'4115768c-ddd5-4ecd-9436-ae3228dd9eed',
		'N',
		'N-INVERSE',
		'draft',
		byVariation((_, index) => [
			'**Inverse.** L’inverse d’un nombre $a$ non nul est $\\dfrac{1}{a}$ ; l’inverse de $\\dfrac{a}{b}$ est $\\dfrac{b}{a}$.',
			alignBlock(
				index === 0
					? [`\\dfrac{1}{${O('{{a}}')}} &= {{solution}}`]
					: index === 1
						? [
								`\\dfrac{1}{${O('\\dfrac{1}{{{a}}}')}} &= 1 \\times \\dfrac{{{a}}}{1}`,
								'&= {{solution}}'
							]
						: [
								`\\dfrac{1}{${O('\\dfrac{{{a}}}{{{b}}}')}} &= 1 \\times \\dfrac{{{b}}}{{{a}}}`,
								'&= {{solution}}'
							]
			)
		]),
		{ transform: 'inverse' }
	),
	// ------------------------------------------------ N-UNITES
	entry('7a90fc45-a7e2-493b-96d5-d0963e51e136', 'N', 'N-UNITES', 'draft', conversions),
	entry('82748db8-01fe-4c2e-86b6-4ef8c1dde805', 'N', 'N-UNITES-AIRE', 'draft', conversions),
	entry('b79d4cb7-d138-4be0-86e5-57131c8e265d', 'N', 'N-UNITES-VOL', 'draft', conversions),
	entry('c31c9d95-aaab-4086-a1bd-ef94dd8d4c3d', 'N', 'N-UNITES', 'draft', conversions),
	entry('355bd41a-1589-4c25-be09-5f062bada81a', 'N', 'N-UNITES-VOL', 'draft', () => ({
		steps: { byVariation: LITRE_VARIATIONS.map(litreSteps) },
		notes: [
			'Égalité posée lue dans l’énoncé (`a~\\unit{U1} = ?~\\unit{U2}`), vérifiée par le convertisseur d’unités.'
		]
	})),
	entry('b6269f1e-8323-4cd4-a578-b669df1c31bb', 'N', 'N-UNITES', 'draft', () => ({
		steps: { byVariation: ['m', 'g', 'L'].map(UNIT_SUM) },
		notes: ['Égalité posée avec unités (`c + d = ?[m]`), vérifiée par le convertisseur d’unités.']
	}))
];

/** e66089e0 : `{{a}}*{{b}}+{{a}}{{c}}`… → facteur commun (nombre `a` ou lettre `c`) en tête */
function factorSteps(statement: string): string[] {
	const block = /\$\$([^$]+)\$\$/.exec(statement)?.[1] ?? '';
	const op = block.includes('-') ? '-' : '+';
	const [t1, t2] = block.split(op);
	const common = t1.includes('{{a}}') && t2.includes('{{a}}') ? 'a' : 'c';
	const rest = (term: string) => term.replace(`{{${common}}}`, '').replace(/^\*|\*$/g, '');
	const show = (term: string) =>
		term.replace(`{{${common}}}`, O(`{{${common}}}`)).replace('*', ' \\times ');
	return [
		'**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme (ou de la différence).',
		`Dans $${show(t1)}$ et dans $${show(t2)}$, le facteur $${O(`{{${common}}}`)}$ apparaît dans chaque terme.`,
		alignBlock([
			`${show(t1)} ${op} ${show(t2)} &= ${O(`{{${common}}}`)} \\times \\left( ${rest(t1)} ${op} ${rest(t2)} \\right)`
		]),
		`Un facteur commun est donc ${inline(G('{{solution}}'))}.`
	];
}

/**
 * Modèles écartés : rien ne permet de vérifier la correction (rapportés, jamais silencieux).
 */
export const LEFT_OUT: Record<string, string> = {
	'd6268317-c78c-4404-a474-634a0b89553a':
		'N-GRADUATION : la réponse n’existe que dans une image (droite graduée) ; 20 variations à réponse fixe, rien à calculer depuis l’énoncé.',
	'64e55fc7-c2f2-41d9-a0e5-01ca9fe6750b':
		'N-UNITES : réponse avec unité au choix de l’élève (« 12 dm » ou « 1,2 m ») : le calcul devrait porter des unités, or MathLive refuse `\\unit` dans une correction, et l’unité du 1er terme est tirée au hasard.'
};

// ============================================================================
// LOTS
// ============================================================================

export const CLOTURE_DRAFTS_LOT: Lot = {
	name: 'cloture-brouillons',
	description: 'Clôture : derniers modèles R / N sans correction, en brouillon',
	entries: CLOTURE_ENTRIES.filter((e) => e.status === 'draft')
};

export const CLOTURE_PUBLISHED_LOT: Lot = {
	name: 'cloture-publies',
	description: 'Clôture : derniers modèles R / N sans correction, publiés (visibles des élèves)',
	entries: CLOTURE_ENTRIES.filter((e) => e.status === 'published')
};
