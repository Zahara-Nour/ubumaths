// Game combat store with Svelte 5 runes
// Author: Claude Code
// Date: 2025-10-15

import type { GameCombat, CombatTurn, GameMonster } from '$lib/types/game';

class CombatStore {
	private _combat = $state<GameCombat | null>(null);
	private _monster = $state<GameMonster | null>(null);
	private _selectedSpell = $state<number | null>(null);
	private _combatLog = $state<CombatTurn[]>([]);

	get combat() {
		return this._combat;
	}

	set combat(value: GameCombat | null) {
		this._combat = value;
		if (value) {
			this._combatLog = value.combat_flow || [];
		}
	}

	get monster() {
		return this._monster;
	}

	set monster(value: GameMonster | null) {
		this._monster = value;
	}

	get selectedSpell() {
		return this._selectedSpell;
	}

	set selectedSpell(spellNum: number | null) {
		this._selectedSpell = spellNum;
	}

	get combatLog() {
		return this._combatLog;
	}

	get isActive() {
		return this._combat?.status === 'active';
	}

	get isPending() {
		return this._combat?.status === 'pending';
	}

	get isCompleted() {
		return this._combat?.status === 'completed';
	}

	get isVictory() {
		return this._combat?.outcome === 'victory';
	}

	get isDefeat() {
		return this._combat?.outcome === 'defeat';
	}

	get currentRound() {
		return this._combat?.current_round ?? 1;
	}

	get currentTurn() {
		return this._combat?.current_turn ?? 1;
	}

	get monsterHP() {
		return (
			this._combat?.monster_endurance_remaining ?? this._combat?.monster_snapshot.max_endurance ?? 0
		);
	}

	get monsterMaxHP() {
		return this._combat?.monster_snapshot.max_endurance ?? 0;
	}

	get monsterHPPercentage() {
		if (this.monsterMaxHP === 0) return 0;
		return (this.monsterHP / this.monsterMaxHP) * 100;
	}

	// Methods
	selectSpell(spellNum: number) {
		this._selectedSpell = spellNum;
	}

	clearSelectedSpell() {
		this._selectedSpell = null;
	}

	addTurnToLog(turn: CombatTurn) {
		this._combatLog.push(turn);
	}

	updateMonsterHP(newHP: number) {
		if (this._combat) {
			this._combat.monster_endurance_remaining = Math.max(0, newHP);
		}
	}

	setOutcome(outcome: 'victory' | 'defeat') {
		if (this._combat) {
			this._combat.outcome = outcome;
			this._combat.status = 'completed';
			this._combat.completed_at = new Date().toISOString();
		}
	}

	reset() {
		this._combat = null;
		this._monster = null;
		this._selectedSpell = null;
		this._combatLog = [];
	}
}

export const combatStore = new CombatStore();
