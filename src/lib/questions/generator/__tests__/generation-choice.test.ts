/**
 * Case « choix » (bloc ```choix) : numérotation, génération, validation du modèle
 * ================================================================================
 *
 * Spécification : `docs/wip/figure-et-choix-progress.md` § 2.1 et § 2.6 (validée
 * par David le 2026-10-26). La case est positionnelle (`blanks[i]`), sa bonne
 * réponse = indice(s) d'ORIGINE en chaîne (`"1"`, `"0;2"`, `{{eval:…}}`).
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import { assignBlankIndices } from '../assign-blank-indices';
import type { QuestionInstance, QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateTemplate } from '$lib/questions/validators/template-validator';
import { choiceAnswerCountErrors } from '$lib/questions/validators/choice-answer-count';
import { findChoiceBlocks, parseChoiceBody } from '$lib/ubumark/parser/choix-parser';

// Fixtures
type LooseVariation = Omit<QuestionVariation, 'statement'> & { statement: string };

function template(
	variation: LooseVariation,
	extra: Partial<QuestionTemplate> = {}
): QuestionTemplate {
	return {
		id: 'test-choix',
		title: 'Choix',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ ...variation, statement: templateMarkdown(variation.statement) }],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...extra
	} as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed = 42): QuestionInstance {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function errorsOf(t: QuestionTemplate): string[] {
	const result = generateInstance(t, 42);
	return result.success ? [] : result.errors;
}

/** Choix affichés, lus dans le bloc de l'énoncé de l'instance */
function displayedChoices(instance: QuestionInstance): string[] {
	const lines = String(instance.statement).split('\n');
	const [range] = findChoiceBlocks(lines);
	return parseChoiceBody(lines.slice(range.startIndex + 1, range.endIndex)).choices;
}

const ALIGNES = template({
	statement: 'Les points sont-ils alignés ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```',
	blanks: [{ expectedAnswer: '0' }]
});

const CINQ = (expectedAnswer: string, settings = '') =>
	template({
		statement: `Choisis.\n\n\`\`\`choix\n${settings}- A\n- B\n- C\n- D\n- E\n\`\`\``,
		blanks: [{ expectedAnswer }]
	});

// Tests
describe('numérotation : le bloc ```choix porte UNE case', () => {
	it('case posée dans le bloc, type « choice », à son rang parmi les autres cases', () => {
		const result = assignBlankIndices(
			'Calcule $2+2=?$.\n\n```choix\n- Oui\n- Non\n```\n\nPuis [_].'
		);
		expect(result.totalBlanks).toBe(3);
		expect(result.blankTypes).toEqual(['math', 'choice', 'text']);
		expect(result.statement).toContain('```choix\ncase: 1\n- Oui\n- Non\n```');
		expect(result.statement).toContain('{{blank:2}}');
		expect(result.choiceBlanks).toEqual({ 1: '- Oui\n- Non' });
	});

	it('ni ? ni [_] dans un choix ne crée de case : refus situé', () => {
		const result = assignBlankIndices('```choix\n- $x=?$\n- [_]\n```');
		expect(result.totalBlanks).toBe(1);
		expect(result.choiceErrors).toEqual([
			'Case 1 (bloc choix) : le choix 1 contient une case (? ou [_]) ; une case ne peut pas être dans un choix',
			'Case 1 (bloc choix) : le choix 2 contient une case (? ou [_]) ; une case ne peut pas être dans un choix'
		]);
	});

	it('un ? dans le TEXTE d’un choix n’est pas une case', () => {
		expect(
			assignBlankIndices('```choix\n- Pourquoi pas ?\n- Non\n```').choiceErrors
		).toBeUndefined();
	});

	it('bloc en retrait ou cité : refusé', () => {
		expect(assignBlankIndices('> ```choix\n> - a\n> - b\n> ```').choiceErrors).toEqual([
			'Un bloc choix doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)'
		]);
	});

	it('bloc non fermé : refusé', () => {
		expect(assignBlankIndices('```choix\n- a\n- b').choiceErrors).toEqual([
			'Case 1 (bloc choix) : bloc non fermé (ajouter ``` à la fin)'
		]);
	});
});

describe('numérotation : un bloc choix DANS un autre bloc délimité', () => {
	const MARK = '\u0000';

	it('dans un bloc de code ```` : du texte, ni case ni marque interne', () => {
		const statement = '````text\n```choix\n- a\n- b\n```\n````';
		const result = assignBlankIndices(statement);
		expect(result.totalBlanks).toBe(0);
		expect(result.choiceErrors).toBeUndefined();
		expect(result.statement).toBe(statement);
	});

	it('dans un bloc ```figure-a-completer : refus situé, aucune marque interne', () => {
		const result = assignBlankIndices(
			'Trace.\n\n```figure-a-completer\nfenetre: 0 ; 10 ; 0 ; 6\n```choix\n- a\n- b\n```'
		);
		expect(result.choiceErrors).toEqual([
			'Ligne 5 : un bloc choix ne peut pas être dans un bloc figure-a-completer'
		]);
		expect(result.statement).not.toContain(MARK);
		expect(result.blankTypes).not.toContain('choice');
	});

	it('dans un bloc ```operation : refus situé, aucune marque interne', () => {
		const result = assignBlankIndices('```operation\n```choix\n- a\n- b\n```');
		expect(result.choiceErrors).toEqual([
			'Ligne 2 : un bloc choix ne peut pas être dans un bloc operation'
		]);
		expect(result.statement).not.toContain(MARK);
		expect(result.blankTypes).not.toContain('choice');
	});
});

describe('génération : choix résolus, ordre affiché, bonne réponse', () => {
	it('melanger: non → ordre de l’auteur ; case « choice » ; énoncé en ordre affiché', () => {
		const instance = generate(ALIGNES);
		expect(instance.blanks).toEqual([
			{
				type: 'choice',
				expectedAnswer: '0',
				choice: { choices: ['Oui', 'Non'], order: [0, 1], multiple: false }
			}
		]);
		expect(String(instance.statement)).toBe(
			'Les points sont-ils alignés ?\n\n```choix\ncase: 0\n- Oui\n- Non\n```'
		);
	});

	it('variables, formules et {{if}} résolus dans les choix', () => {
		const instance = generate(
			template({
				statement:
					'Combien ?\n\n```choix\nmelanger: non\n- ${{a}}+1$\n- {{if:a>5|grand|petit}}\n```',
				variables: [{ name: 'a', expression: '7' }],
				blanks: [{ expectedAnswer: '1' }]
			})
		);
		expect(instance.blanks?.[0].choice?.choices).toEqual(['$7 + 1$', 'grand']);
	});

	it('mélange par défaut, déterministe pour une graine, ordre affiché = order', () => {
		const a = generate(CINQ('2'), 7);
		const b = generate(CINQ('2'), 7);
		expect(a.blanks?.[0].choice?.order).toEqual(b.blanks?.[0].choice?.order);
		const order = a.blanks?.[0].choice?.order ?? [];
		expect([...order].sort()).toEqual([0, 1, 2, 3, 4]);
		expect(displayedChoices(a)).toEqual(order.map((i) => ['A', 'B', 'C', 'D', 'E'][i]));
		// Bonne réponse en indice d'ORIGINE, quel que soit le mélange
		expect(a.blanks?.[0].expectedAnswer).toBe('2');
		// Au moins une graine mélange vraiment
		const orders = [1, 2, 3, 4, 5].map((seed) =>
			JSON.stringify(generate(CINQ('2'), seed).blanks?.[0].choice?.order)
		);
		expect(orders.some((o) => o !== '[0,1,2,3,4]')).toBe(true);
	});

	it('plusieurs: oui → réponses triées « 0;2 », gardé dans l’énoncé', () => {
		const instance = generate(CINQ('3;0', 'plusieurs: oui\nmelanger: non\n'));
		expect(instance.blanks?.[0].expectedAnswer).toBe('0;3');
		expect(instance.blanks?.[0].choice?.multiple).toBe(true);
		expect(String(instance.statement)).toContain('```choix\ncase: 0\nplusieurs: oui\n- A');
	});

	it('bonne réponse dynamique {{eval:…}}', () => {
		const instance = generate(
			template({
				statement: '```choix\nmelanger: non\n- pair\n- impair\n```',
				variables: [{ name: 'n', expression: '7' }],
				blanks: [{ expectedAnswer: '{{eval:n-6}}' }]
			})
		);
		expect(instance.blanks?.[0].expectedAnswer).toBe('1');
	});

	it('question mixte : case math, case choix, chacune à sa place', () => {
		const instance = generate(
			template({
				statement:
					'Calcule $2+3=?$.\n\nEst-ce pair ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```',
				blanks: [{ expectedAnswer: '5' }, { expectedAnswer: '1' }]
			})
		);
		expect(instance.blanks?.map((b) => b.type)).toEqual(['math', 'choice']);
		expect(instance.blanks?.[1].expectedAnswer).toBe('1');
	});

	it('correction : {{solution}} d’une case choix = le texte du (des) bon(s) choix', () => {
		const instance = generate(
			template({
				statement: '```choix\nplusieurs: oui\nmelanger: non\n- 2\n- 3\n- 4\n```',
				blanks: [{ expectedAnswer: '0;2' }],
				correction: { steps: [templateMarkdown('Les nombres pairs : {{solution}}.')] }
			})
		);
		expect(instance.correction?.steps).toEqual(['Les nombres pairs : 2 ; 4.']);
	});

	it('deux cases choix : chacune son mélange', () => {
		const instance = generate(
			template({
				statement: '```choix\n- a\n- b\n- c\n```\n\n```choix\nmelanger: non\n- x\n- y\n```',
				blanks: [{ expectedAnswer: '0' }, { expectedAnswer: '1' }]
			})
		);
		expect(instance.blanks?.map((b) => b.type)).toEqual(['choice', 'choice']);
		expect(instance.blanks?.[1].choice?.order).toEqual([0, 1]);
	});
});

describe('génération : erreurs situées', () => {
	// Erreurs lisibles sans tirer : vues par la validation du modèle, faite avant
	// chaque tirage (« Variation 1, case 1 ») ; une bonne réponse dynamique n'est
	// connue qu'au tirage (« Case 1 »)
	it('bonne réponse dynamique hors des choix : vue au tirage', () => {
		expect(errorsOf(CINQ('{{eval:2+3}}'))).toEqual([
			'Case 1 (bloc choix) : bonne réponse « 5 » hors des choix (0 à 4)'
		]);
	});

	it('bonne réponse hors des choix', () => {
		expect(errorsOf(CINQ('5'))).toEqual([
			'Variation 1, case 1 (bloc choix) : bonne réponse « 5 » hors des choix (0 à 4)'
		]);
	});

	it('bonne réponse illisible ou répétée (écrite en dur)', () => {
		expect(errorsOf(CINQ('B'))).toEqual([
			'Variation 1, case 1 (bloc choix) : bonne réponse « B » illisible (indices des bons choix, 0 pour le premier, séparés par ;)'
		]);
		expect(errorsOf(CINQ('1;1', 'plusieurs: oui\n'))).toEqual([
			'Variation 1, case 1 (bloc choix) : bonne réponse « 1;1 » illisible (indices des bons choix, 0 pour le premier, séparés par ;)'
		]);
	});

	it('bonne réponse CALCULÉE qui répète un indice : il compte une fois (QCM migrés, lot 4)', () => {
		expect(errorsOf(CINQ('1;{{eval:1}};3', 'plusieurs: oui\n'))).toEqual([]);
	});

	it('aucune bonne réponse', () => {
		expect(errorsOf(CINQ(''))).toEqual(['Variation 1, case 1 (bloc choix) : aucune bonne réponse']);
	});

	it('plusieurs bonnes sans plusieurs: oui', () => {
		expect(errorsOf(CINQ('0;2'))).toEqual([
			'Variation 1, case 1 (bloc choix) : 2 bonnes réponses, mais « plusieurs: oui » n’est pas écrit : il en faut exactement une'
		]);
	});

	it('moins de 2 choix, réglage inconnu', () => {
		expect(
			errorsOf(template({ statement: '```choix\n- Oui\n```', blanks: [{ expectedAnswer: '0' }] }))
		).toEqual([
			'Variation 1, case 1 (bloc choix) : au moins 2 choix (une ligne « - … » par choix)'
		]);
	});

	it('case: écrite par l’auteur', () => {
		expect(
			errorsOf(
				template({
					statement: '```choix\ncase: 0\n- a\n- b\n```',
					blanks: [{ expectedAnswer: '0' }]
				})
			)
		).toEqual([
			'Variation 1, case 1 (bloc choix) : case: est posée automatiquement, retirer cette ligne du bloc'
		]);
	});

	it('une case dans un choix', () => {
		expect(
			errorsOf(
				template({ statement: '```choix\n- $?$\n- b\n```', blanks: [{ expectedAnswer: '1' }] })
			)
		).toEqual([
			'Variation 1, case 1 (bloc choix) : le choix 1 contient une case (? ou [_]) ; une case ne peut pas être dans un choix'
		]);
	});

	it('ordre indifférent : refusé', () => {
		expect(
			errorsOf(
				template(ALIGNES.variations[0] as LooseVariation, {
					options: { orderIndependent: true }
				})
			)
		).toEqual([
			// Vu dès la validation du modèle, faite avant chaque tirage
			'Variation 1, case 1 (bloc choix) : une case choix ne se combine pas avec « ordre indifférent »'
		]);
	});
});

describe('validation du modèle (enregistrement)', () => {
	it('modèle juste : aucune erreur', () => {
		expect(validateTemplate(ALIGNES)).toEqual([]);
	});

	it('mêmes règles que le QCM, situées (variation, case)', () => {
		expect(choiceAnswerCountErrors(CINQ('0;2'))).toEqual([
			'Variation 1, case 1 (bloc choix) : 2 bonnes réponses, mais « plusieurs: oui » n’est pas écrit : il en faut exactement une'
		]);
		expect(choiceAnswerCountErrors(CINQ('7'))).toEqual([
			'Variation 1, case 1 (bloc choix) : bonne réponse « 7 » hors des choix (0 à 4)'
		]);
		expect(
			choiceAnswerCountErrors(
				template({ statement: '```choix\n- Oui\n```', blanks: [{ expectedAnswer: '0' }] })
			)
		).toEqual([
			'Variation 1, case 1 (bloc choix) : au moins 2 choix (une ligne « - … » par choix)'
		]);
	});

	it('ordre indifférent : refusé dès l’enregistrement, situé', () => {
		expect(choiceAnswerCountErrors({ ...CINQ('1'), options: { orderIndependent: true } })).toEqual([
			'Variation 1, case 1 (bloc choix) : une case choix ne se combine pas avec « ordre indifférent »'
		]);
	});

	it('aucune bonne réponse : permis en brouillon, refusé sinon', () => {
		expect(choiceAnswerCountErrors(CINQ(''), { draft: true })).toEqual([]);
		expect(choiceAnswerCountErrors(CINQ(''))).toEqual([
			'Variation 1, case 1 (bloc choix) : aucune bonne réponse'
		]);
	});

	it('bonne réponse dynamique : vérifiée au tirage seulement', () => {
		expect(choiceAnswerCountErrors(CINQ('{{eval:1+1}}'))).toEqual([]);
	});

	it('un bloc choix dans un QCM (choices) : refusé', () => {
		const qcm = template({
			statement: '```choix\n- a\n- b\n```',
			choices: [
				{ content: templateMarkdown('x'), isCorrect: true },
				{ content: templateMarkdown('y'), isCorrect: false }
			]
		});
		expect(choiceAnswerCountErrors(qcm)).toEqual([
			'Variation 1 : un bloc choix ne se combine pas avec les choix d’un QCM'
		]);
	});
});

describe('invariants : les questions existantes ne bougent pas', () => {
	const base = {
		id: 'b',
		title: 't',
		status: 'draft',
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1
	};
	const qcm = {
		...base,
		type: 'multiple_choice',
		variations: [
			{
				statement: 'Combien font {{a}}+{{b}} ?',
				variables: [
					{ name: 'a', expression: '1..9' },
					{ name: 'b', expression: '1..9' }
				],
				correctChoiceIndex: '0',
				choices: ['$x$', 'A', 'B', 'C', 'D'].map((content, i) => ({ content, isCorrect: i === 0 }))
			}
		]
	} as unknown as QuestionTemplate;
	const fib = {
		...base,
		type: 'fill_in_blanks',
		variations: [
			{
				statement: 'Calcule $${{a}}+{{b}}=?$$ puis [_].',
				variables: [
					{ name: 'a', expression: '1..50' },
					{ name: 'b', expression: '1..50' }
				],
				blanks: [{ expectedAnswer: '{{eval:a+b}}' }, { expectedAnswer: '{{random:1..100}}' }]
			}
		]
	} as unknown as QuestionTemplate;

	// Relevé avec le code d'avant la case choix (2026-10-26)
	const QCM_ORDERS: Record<number, number[]> = {
		1: [2, 1, 0, 3, 4],
		2: [4, 0, 1, 3, 2],
		3: [2, 4, 1, 3, 0],
		7: [4, 0, 1, 2, 3],
		42: [2, 4, 1, 0, 3]
	};
	const FIB_ANSWERS: Record<number, string[]> = {
		1: ['28', '99'],
		2: ['32', '54'],
		3: ['25', '8'],
		7: ['53', '70'],
		42: ['66', '67']
	};

	it('QCM : même mélange pour une même graine', () => {
		for (const [seed, order] of Object.entries(QCM_ORDERS)) {
			const instance = generate(qcm, Number(seed));
			expect(instance.shuffledChoices?.map((c) => c.originalIndex)).toEqual(order);
		}
	});

	it('question à cases sans bloc choix : mêmes tirages', () => {
		for (const [seed, answers] of Object.entries(FIB_ANSWERS)) {
			const instance = generate(fib, Number(seed));
			expect(instance.blanks?.map((b) => b.expectedAnswer)).toEqual(answers);
		}
	});
});
