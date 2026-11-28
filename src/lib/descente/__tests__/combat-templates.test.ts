import { describe, expect, test } from 'vitest';
import { isCombatInstance, isCombatTemplate } from '../combat-templates';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { BRANCH_PROVINCES, provinceOfBranch } from '../provinces';

const oneBlank = [{ expectedAnswer: '{{eval:a*60+b}}' }];

describe('isCombatTemplate — une case ou un QCM, sans geste de réponse', () => {
	test('une seule case : jouable', () => {
		expect(
			isCombatTemplate({ id: 't', blanks: oneBlank, statement: 'Convertis. $? \\unit{min}$' })
		).toBe(true);
	});

	test('deux cases ou aucune (sans QCM) : non jouable', () => {
		expect(isCombatTemplate({ id: 't', blanks: [...oneBlank, ...oneBlank], statement: 'x' })).toBe(
			false
		);
		expect(isCombatTemplate({ id: 't', blanks: [], statement: 'x' })).toBe(false);
		expect(isCombatTemplate({ id: 't', blanks: null, statement: 'x' })).toBe(false);
	});

	test('QCM (bloc `choix`), avec ou sans case : jouable', () => {
		const statement = 'Quelle fraction ?\n\n```choix\n- [x] 1/2\n- [ ] 1/3\n```';
		expect(isCombatTemplate({ id: 't', blanks: [], statement })).toBe(true);
		expect(isCombatTemplate({ id: 't', blanks: oneBlank, statement })).toBe(true);
	});

	test('un affichage (figure, courbe) avec une case : jouable', () => {
		expect(
			isCombatTemplate({ id: 't', blanks: oneBlank, statement: '```figure\nA(0,0)\n```\n$?$' })
		).toBe(true);
	});

	test('un geste de réponse ou un bloc inconnu écarte le modèle', () => {
		for (const fence of ['ranger', 'figure-a-completer', 'partage', 'bloc-futur']) {
			expect(
				isCombatTemplate({ id: 't', blanks: oneBlank, statement: `\`\`\`${fence}\nx\n\`\`\`` })
			).toBe(false);
		}
	});

	test('sujet illisible : non jouable', () => {
		expect(isCombatTemplate({ id: 't', blanks: oneBlank, statement: null })).toBe(false);
	});
});

describe('provinceOfBranch — question A de la phase 0', () => {
	test('les 19 branches ont une Province ; exemples', () => {
		expect(Object.keys(BRANCH_PROVINCES)).toHaveLength(19);
		expect(provinceOfBranch('Grandeurs et mesures')).toBe('bedonstan');
		expect(provinceOfBranch('Matrices')).toBe('glitchistan');
		expect(provinceOfBranch('Suites')).toBe('yoyolande');
	});

	test('branche inconnue (ou clé héritée) : null', () => {
		expect(provinceOfBranch('Branche nouvelle')).toBeNull();
		expect(provinceOfBranch('toString')).toBeNull();
	});
});

describe('isCombatInstance — la question tirée est-elle courte ? (étape 3)', () => {
	function generate(statement: string, answers: string[]) {
		const result = generateInstance(
			{
				id: '00000000-0000-4000-8000-000000000001',
				title: 'Combat',
				status: 'published',
				grades: ['CE1'],
				level: 1,
				variations: [
					{
						statement: templateMarkdown(statement),
						blanks: answers.map((expectedAnswer) => ({ expectedAnswer }))
					}
				]
			},
			0
		);
		if (!result.success) throw new Error(result.errors.join(' ; '));
		return result.instance;
	}

	test('une seule case tapée : courte', () => {
		expect(isCombatInstance(generate('Calcule $2+3=?$.', ['5']))).toBe(true);
	});

	test('un QCM seul : court', () => {
		expect(isCombatInstance(generate('Choisis.\n\n```choix\n- A\n- B\n```', ['1']))).toBe(true);
	});

	test('deux cases (variation tirée plus longue que la première) : pas courte', () => {
		expect(isCombatInstance(generate('Calcule $2+3=?$ et $1+1=?$.', ['5', '2']))).toBe(false);
	});

	test('une case tapée et un QCM : pas courte', () => {
		const statement = 'Calcule $2+3=?$.\n\n```choix\nmelanger: non\n- pair\n- impair\n```';
		expect(isCombatInstance(generate(statement, ['5', '1']))).toBe(false);
	});

	test('carte de cours : jamais en combat', () => {
		// Une carte de cours n'a jamais de case ; marquée telle, elle est écartée quand même
		const instance = generate('Calcule $2+3=?$.', ['5']);
		expect(isCombatInstance({ ...instance, options: { courseCard: true } })).toBe(false);
	});

	test('case à geste (point à placer, étiquettes, cellule) : pas courte', () => {
		const instance = generate('Calcule $2+3=?$.', ['5']);
		const [blank] = instance.blanks ?? [];
		expect(isCombatInstance({ ...instance, blanks: [{ ...blank, construire: 'ranger' }] })).toBe(
			false
		);
		expect(isCombatInstance({ ...instance, blanks: [{ ...blank, cellule: 'signe' }] })).toBe(false);
		expect(isCombatInstance({ ...instance, blanks: [{ ...blank, type: 'graphical' }] })).toBe(
			false
		);
	});
});
