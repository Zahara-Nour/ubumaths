/**
 * Série d'automatismes : instances FIGÉES de modèles de questions → un exercice (ADR 0011)
 *
 * Spécification validée par David (2026-09-28) :
 *  - une série = liste de (modèle, graine) → un exercice ; énoncé = instances numérotées,
 *    chaque case devient « …… » ; corrigé = même liste, réponses à la place des cases,
 *    puis la correction du modèle ;
 *  - même graine → même texte ;
 *  - QCM → liste des choix, bonne réponse au corrigé ; carte de cours → recto / verso ;
 *  - erreur (modèle absent, génération en échec, marqueur non résolu) → exception, rien d'écrit.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie, BLANK_TEXT } from '../serie-automatismes';
import { parseMarkdown, type ListNode } from '$lib/ubumark';

const base = {
	title: 't',
	grades: ['2'],
	theme: 'T',
	domain: 'D',
	level: 1,
	status: 'draft'
} as const;

const coefficient = {
	...base,
	id: 'coef',
	variations: [
		{
			statement:
				'Donne le coefficient multiplicateur associé à une augmentation de ${{a}}\\,\\%$.\n\nLe coefficient multiplicateur est $?$.',
			variables: [{ name: 'a', expression: '1..30' }],
			blanks: [{ expectedAnswer: '{{eval:1+a/100;d}}' }],
			correction: {
				steps: ['Le coefficient multiplicateur est $1+\\dfrac{ {{a}} }{100}={{eval:1+a/100;d}}$.']
			}
		}
	]
} as unknown as QuestionTemplate;

const parite = {
	...base,
	id: 'parite',
	variations: [
		{
			statement: 'Quelle est la parité de ce nombre ?\n$${{n}}$$',
			variables: [
				{ name: 'k', expression: '1..9' },
				{ name: 'n', expression: 'eval:2k' }
			],
			choices: [
				{ content: 'pair', isCorrect: true },
				{ content: 'impair', isCorrect: false }
			],
			correctChoiceIndex: '0'
		}
	]
} as unknown as QuestionTemplate;

const deuxCases = {
	...base,
	id: 'deux',
	variations: [
		{
			statement: "Le résultat d'un produit s'appelle un [_].\n\nComplète :\n$$3+?=5$$",
			variables: [],
			blanks: [{ expectedAnswer: 'produit' }, { expectedAnswer: '2' }]
		}
	]
} as unknown as QuestionTemplate;

const carte = {
	...base,
	id: 'carte',
	options: { courseCard: true },
	variations: [
		{
			statement: 'Que cherche-t-on quand on étudie une fonction ?',
			correction: { steps: ['On cherche :\n\n- ses **variations** ;\n- son **signe**.'] }
		}
	]
} as unknown as QuestionTemplate;

const modeles = new Map([coefficient, parite, deuxCases, carte].map((t) => [t.id, t]));

describe('buildSerie — cas nominaux', () => {
	it('une question à case : énoncé à trous numéroté, corrigé avec la réponse et la correction', () => {
		const serie = buildSerie(modeles, [{ templateId: 'coef', seed: 7 }]);
		expect(serie.statement).toMatch(/^1\. Donne le coefficient multiplicateur/);
		expect(serie.statement).toContain(`\\text{${BLANK_TEXT}}`);
		expect(serie.statement).not.toContain('placeholder');
		expect(serie.solution).toMatch(/^1\. Donne le coefficient multiplicateur/);
		expect(serie.solution).not.toContain('placeholder');
		expect(serie.solution).not.toContain(BLANK_TEXT);
		expect(serie.solution).toContain('Le coefficient multiplicateur est $1 + \\dfrac');
		// Réponse en gras à la place de la case
		expect(serie.solution).toMatch(/multiplicateur est \$\\mathbf\{1\.\d+\}\$/);
	});

	it('les lignes suivantes d’un item sont en retrait (une seule entrée de liste)', () => {
		const serie = buildSerie(modeles, [
			{ templateId: 'coef', seed: 7 },
			{ templateId: 'coef', seed: 8 }
		]);
		const lignes = serie.statement.split('\n').filter((l) => l.trim() !== '');
		expect(lignes.filter((l) => /^\d+\. /.test(l))).toHaveLength(2);
		expect(lignes.filter((l) => !/^\d+\. /.test(l)).every((l) => l.startsWith('   '))).toBe(true);
		expect(serie.statement).toMatch(/\n2\. Donne/);
	});

	it('même graine → même texte ; autre graine → valeurs différentes', () => {
		const a = buildSerie(modeles, [{ templateId: 'coef', seed: 7 }]);
		const b = buildSerie(modeles, [{ templateId: 'coef', seed: 7 }]);
		const c = buildSerie(modeles, [{ templateId: 'coef', seed: 11 }]);
		expect(b).toEqual(a);
		expect(c.statement).not.toBe(a.statement);
	});

	it('QCM : choix a) b) à l’énoncé, bonne réponse au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'parite', seed: 3 }]);
		expect(serie.statement).toContain('**a)** pair');
		expect(serie.statement).toContain('**b)** impair');
		expect(serie.solution).toContain('Réponse : **a)** pair');
	});

	it('QCM : les choix ne sont PAS une sous-liste (renumérotée « 1) 2) » dans le PDF)', () => {
		// La numérotation d'une liste dépend de sa profondeur (a, puis 1, puis i) : des choix
		// en sous-liste sortaient « 1) 2) » alors que le corrigé dit « Réponse : a) »
		const serie = buildSerie(modeles, [{ templateId: 'parite', seed: 3 }]);
		for (const texte of [serie.statement, serie.solution]) {
			const list = parseMarkdown(texte).children[0] as ListNode;
			const nested = list.items[0].children.filter((c) => c.type === 'list');
			expect(nested).toEqual([]);
		}
	});

	it('plusieurs cases (texte et formule) : toutes à trous, toutes remplies au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'deux', seed: 1 }]);
		expect(serie.statement).toContain(`s'appelle un ${BLANK_TEXT}.`);
		expect(serie.statement).toContain(`3 + \\text{${BLANK_TEXT}} = 5`);
		expect(serie.solution).toContain("s'appelle un **produit**.");
		expect(serie.solution).toContain('3 + \\mathbf{2} = 5');
	});

	it('carte de cours : recto à l’énoncé, verso au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'carte', seed: 1 }]);
		expect(serie.statement).toBe('1. Que cherche-t-on quand on étudie une fonction ?');
		expect(serie.solution).toContain('1. Que cherche-t-on quand on étudie une fonction ?');
		expect(serie.solution).toContain('   - ses **variations** ;');
	});
});

describe('buildSerie — consigne et longues séries', () => {
	it('la consigne du modèle précède l’énoncé', () => {
		const consigne = {
			...coefficient,
			id: 'consigne',
			exerciseInstruction: 'Sans calculatrice.'
		} as QuestionTemplate;
		const serie = buildSerie(new Map([['consigne', consigne]]), [
			{ templateId: 'consigne', seed: 7 }
		]);
		expect(serie.statement).toMatch(/^1\. Sans calculatrice\.\n\n {3}Donne le coefficient/);
	});

	it('à partir de l’item 10, le retrait suit la largeur du numéro', () => {
		// 10 graines qui donnent 10 questions différentes
		const graines: number[] = [];
		const vus = new Set<string>();
		for (let g = 1; graines.length < 10; g++) {
			const texte = buildSerie(modeles, [{ templateId: 'coef', seed: g }]).statement;
			if (!vus.has(texte)) {
				vus.add(texte);
				graines.push(g);
			}
		}
		const serie = buildSerie(
			modeles,
			graines.map((seed) => ({ templateId: 'coef', seed }))
		);
		const apres10 = serie.statement.split('\n10. ')[1];
		expect(apres10).toBeDefined();
		expect(
			apres10
				.split('\n')
				.filter((l) => l.trim() !== '')
				.slice(1)
				.every((l) => l.startsWith('    '))
		).toBe(true);
	});
});

describe('buildSerie — erreurs (rien ne doit être écrit)', () => {
	it('modèle introuvable', () => {
		expect(() => buildSerie(modeles, [{ templateId: 'absent', seed: 1 }])).toThrow(/absent/);
	});

	it('génération en échec', () => {
		const casse = {
			...base,
			id: 'casse',
			variations: [{ statement: 'x', variables: [{ name: 'a', expression: 'eval:1/0' }] }]
		} as unknown as QuestionTemplate;
		expect(() =>
			buildSerie(new Map([['casse', casse]]), [{ templateId: 'casse', seed: 1 }])
		).toThrow(/casse/);
	});

	it('deux questions identiques dans une série (graines qui tombent sur le même tirage)', () => {
		expect(() =>
			buildSerie(modeles, [
				{ templateId: 'carte', seed: 1 },
				{ templateId: 'carte', seed: 2 }
			])
		).toThrow(/identiques/);
	});

	it('réponse attendue sans case dans l’énoncé (marqueur d’une autre convention) : refusée', () => {
		const sansCase = {
			...base,
			id: 'sansCase',
			variations: [
				{ statement: 'Calcule $2+3$.', variables: [], blanks: [{ expectedAnswer: '5' }] }
			]
		} as unknown as QuestionTemplate;
		expect(() =>
			buildSerie(new Map([['sansCase', sansCase]]), [{ templateId: 'sansCase', seed: 1 }])
		).toThrow(/sansCase/);
	});

	it('correction générée (mode B) sans étapes rédigées : refusée plutôt qu’ignorée', () => {
		const modeB = {
			...coefficient,
			id: 'modeB',
			variations: [
				{
					...coefficient.variations[0],
					correction: { generatedSteps: { kind: 'arithmetic', expression: '1+{{a}}/100' } }
				}
			]
		} as unknown as QuestionTemplate;
		expect(() =>
			buildSerie(new Map([['modeB', modeB]]), [{ templateId: 'modeB', seed: 1 }])
		).toThrow(/générée|mode B/);
	});

	it('série vide', () => {
		expect(() => buildSerie(modeles, [])).toThrow(/vide/);
	});
});

/**
 * Correction concise / détaillée (ADR 0017) : avant le lot 3 (réglage du
 * corrigé), la fiche prend la version détaillée — jamais de `\detail{` brut,
 * qui ferait échouer Typst pour TOUTE la fiche.
 */
describe('buildSerie — détails de correction', () => {
	const marquee = {
		...base,
		id: 'marquee',
		options: { courseCard: true },
		variations: [
			{
				statement: 'Combien font $1 + 1$ ?',
				correction: {
					steps: ['$x = 1 + 1 \\detail{= 2 \\times 1} = 2$ [car on ajoute]{.rappel}.']
				}
			}
		]
	} as unknown as QuestionTemplate;

	it('la version détaillée, sans marqueur \\detail brut', () => {
		const serie = buildSerie(new Map([[marquee.id, marquee]]), [
			{ templateId: 'marquee', seed: 1 }
		]);
		expect(serie.solution).not.toContain('\\detail');
		expect(serie.solution).toContain('2 \\times 1');
	});
});

// Fonctions déclarées par un modèle (`shared.genericFunctions`) : l'exercice figé
// les lit avec SA liste (`generic_functions`, qui REMPLACE les défauts) → la série
// rend défauts ∪ fonctions déclarées, ou rien si aucun modèle n'en déclare.
describe('buildSerie — fonctions déclarées par les modèles', () => {
	const derivee = {
		...base,
		id: 'derivee',
		shared: { genericFunctions: ['P'] },
		variations: [
			{ statement: 'Si $P(x)=x^2$, alors ~P(2)~ vaut $?$.', blanks: [{ expectedAnswer: '4' }] }
		]
	} as unknown as QuestionTemplate;

	it('liste pour l’exercice : défauts ∪ fonctions déclarées', () => {
		const modeles = new Map([
			['derivee', derivee],
			['coef', coefficient]
		]);
		const serie = buildSerie(modeles, [
			{ templateId: 'derivee', seed: 1 },
			{ templateId: 'coef', seed: 1 }
		]);
		expect(serie.genericFunctions).toEqual(['f', 'g', 'h', 'u', 'v', 'w', 'F', 'G', 'H', 'P']);
	});

	it('aucun modèle ne déclare : aucune clé', () => {
		const serie = buildSerie(new Map([['coef', coefficient]]), [{ templateId: 'coef', seed: 1 }]);
		expect(serie).not.toHaveProperty('genericFunctions');
	});
});

// Union des fonctions déclarées au-delà de 10 noms : chaque modèle en déclare au plus 10,
// mais la liste de l'exercice (`generic_functions`) n'a pas de plafond. Elle était coupée
// en silence au 10e nom : la 11e fonction redevenait un produit dans la série.
describe('buildSerie — union de plus de 10 fonctions déclarées', () => {
	const declare = (id: string, names: string[]) =>
		({
			...base,
			id,
			shared: { genericFunctions: names },
			variations: [{ statement: `${id} $?$`, blanks: [{ expectedAnswer: '4' }] }]
		}) as unknown as QuestionTemplate;

	it('toutes les fonctions déclarées sont gardées', () => {
		const modeles = new Map([
			['un', declare('un', ['A', 'B', 'C', 'D', 'E', 'I'])],
			['deux', declare('deux', ['J', 'K', 'L', 'M', 'N', 'O'])]
		]);
		const serie = buildSerie(modeles, [
			{ templateId: 'un', seed: 1 },
			{ templateId: 'deux', seed: 1 }
		]);
		const defaults = ['f', 'g', 'h', 'u', 'v', 'w', 'F', 'G', 'H'];
		const declared = ['A', 'B', 'C', 'D', 'E', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
		expect(serie.genericFunctions).toEqual([...defaults, ...declared]);
	});
});
