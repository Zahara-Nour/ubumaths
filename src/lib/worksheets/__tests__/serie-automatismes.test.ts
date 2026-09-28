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

	it('QCM : choix listés a) b) à l’énoncé, bonne réponse au corrigé', () => {
		const serie = buildSerie(modeles, [{ templateId: 'parite', seed: 3 }]);
		expect(serie.statement).toContain('a) pair');
		expect(serie.statement).toContain('b) impair');
		expect(serie.solution).toContain('Réponse : a) pair');
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

	it('série vide', () => {
		expect(() => buildSerie(modeles, [])).toThrow(/vide/);
	});
});
