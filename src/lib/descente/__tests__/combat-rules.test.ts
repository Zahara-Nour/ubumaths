/**
 * Combat de la recrue — phase 0 de l'étape 3 (docs/wip/navadra-progress.md),
 * validée par David le 2026-11-18.
 */

import { describe, expect, test } from 'vitest';
import {
	afterAttack,
	afterDodge,
	hitDamage,
	hpAfterHit,
	isCombatOver,
	startCombat,
	type CombatState
} from '../combat-rules';
import { BIG_MAX_HP, ORDINARY_MAX_HP } from '../spawn-logic';

function ordinary(hp = 120): CombatState {
	return startCombat({ kind: 'ordinary', beastHp: hp, beastMaxHp: 120 });
}

/** Joue un tour complet : 3 coups (PV rendus par le serveur), puis l'esquive. */
function playRound(state: CombatState, hps: number[], dodged: boolean): CombatState {
	let next = state;
	for (const hp of hps) next = afterAttack(next, hp);
	return afterDodge(next, dodged);
}

describe('dégâts (question B)', () => {
	test('20 sur la Province sensible, 8 ailleurs', () => {
		expect(hitDamage('bedonstan', 'bedonstan')).toBe(20);
		expect(hitDamage('nombrilie', 'bedonstan')).toBe(8);
	});

	test('les PV ne passent jamais sous 0', () => {
		expect(hpAfterHit(12, 20)).toBe(0);
		expect(hpAfterHit(120, 20)).toBe(100);
	});

	test('Bête ordinaire 120 PV, grosse Bête 360 PV', () => {
		expect(ORDINARY_MAX_HP).toBe(120);
		expect(BIG_MAX_HP).toBe(360);
	});

	test('cible : la bonne Province, 7 réponses sur 10, la Bête tombe en 3 tours', () => {
		// 9 coups en 3 tours, dont 6 ou 7 réussis : 6 × 20 = 120
		expect(Math.ceil(ORDINARY_MAX_HP / hitDamage('nombrilie', 'nombrilie'))).toBe(6);
		// Une autre Province : 15 coups réussis, battable mais long
		expect(Math.ceil(ORDINARY_MAX_HP / hitDamage('bedonstan', 'nombrilie'))).toBe(15);
	});
});

describe('déroulé d’un tour', () => {
	test('3 coups, puis la riposte', () => {
		let state = ordinary();
		state = afterAttack(state, 100);
		state = afterAttack(state, 100);
		expect(state.phase).toBe('attack');
		expect(state.actionsThisRound).toBe(2);
		state = afterAttack(state, 80);
		expect(state.phase).toBe('dodge');
		expect(state.beastHp).toBe(80);
	});

	test('esquive réussie : aucun cœur perdu, tour suivant', () => {
		const state = playRound(ordinary(), [100, 100, 100], true);
		expect(state.hearts).toBe(3);
		expect(state.round).toBe(2);
		expect(state.actionsThisRound).toBe(0);
		expect(state.phase).toBe('attack');
	});

	test('esquive ratée : un cœur de moins (question A)', () => {
		const state = playRound(ordinary(), [120, 120, 120], false);
		expect(state.hearts).toBe(2);
		expect(state.phase).toBe('attack');
	});

	test('un coup ou une esquive hors de son moment ne change rien', () => {
		const attacking = ordinary();
		expect(afterDodge(attacking, false)).toBe(attacking);
		const dodging = afterAttack(afterAttack(afterAttack(attacking, 120), 120), 120);
		expect(afterAttack(dodging, 0)).toBe(dodging);
	});
});

describe('fin du combat', () => {
	test('Bête à 0 : victoire, même au milieu du tour', () => {
		const state = afterAttack(ordinary(20), 0);
		expect(state.phase).toBe('won');
		expect(isCombatOver(state)).toBe(true);
	});

	test('trois esquives ratées : la Bête gagne ce combat', () => {
		let state = ordinary();
		state = playRound(state, [120, 120, 120], false);
		state = playRound(state, [120, 120, 120], false);
		state = playRound(state, [120, 120, 120], false);
		expect(state.hearts).toBe(0);
		expect(state.phase).toBe('lost');
		expect(isCombatOver(state)).toBe(true);
	});

	test('Bête ordinaire : aucune limite de tours', () => {
		let state = ordinary();
		for (let i = 0; i < 8; i++) state = playRound(state, [120, 120, 120], true);
		expect(state.phase).toBe('attack');
		expect(state.round).toBe(9);
	});

	test('grosse Bête : repli après son 4e tour, blessures gardées (question C)', () => {
		let state = startCombat({ kind: 'big', beastHp: 300, beastMaxHp: 360 });
		state = playRound(state, [280, 260, 240], true);
		state = playRound(state, [220, 200, 180], true);
		state = playRound(state, [160, 140, 120], true);
		expect(state.phase).toBe('attack');
		state = playRound(state, [100, 80, 60], true);
		expect(state.phase).toBe('retreat');
		expect(state.beastHp).toBe(60);
		expect(isCombatOver(state)).toBe(true);
	});

	test('grosse Bête : la défaite l’emporte sur le repli', () => {
		let state = startCombat({ kind: 'big', beastHp: 360, beastMaxHp: 360 });
		state = { ...state, round: 4, hearts: 1 };
		state = playRound(state, [360, 360, 360], false);
		expect(state.phase).toBe('lost');
	});
});
