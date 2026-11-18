import { describe, expect, test } from 'vitest';
import { isCombatTemplate } from '../combat-templates';
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
