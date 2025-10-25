// Game player store with Svelte 5 runes
// Author: Claude Code
// Date: 2025-10-15

import type { GamePlayer, ElementPyrs } from '$lib/types/game';

class PlayerStore {
	private _player = $state<GamePlayer | null>(null);

	get player() {
		return this._player;
	}

	set player(value: GamePlayer | null) {
		this._player = value;
		// Auto-save to localStorage for persistence
		if (value) {
			localStorage.setItem('game_player', JSON.stringify(value));
		}
	}

	// Derived values
	get level() {
		return this._player?.level ?? 1;
	}

	get xp() {
		return this._player?.xp ?? 0;
	}

	get xpForNextLevel() {
		// Formula: level * 1000 (simple progression)
		return this.level * 1000;
	}

	get xpProgress() {
		// Percentage of XP toward next level
		return (this.xp / this.xpForNextLevel) * 100;
	}

	get prestige() {
		return this._player?.prestige ?? 0;
	}

	get totalPyrs() {
		if (!this._player) return 0;
		return (
			this._player.pyrs_fire +
			this._player.pyrs_water +
			this._player.pyrs_earth +
			this._player.pyrs_wind
		);
	}

	get elementPyrs(): ElementPyrs {
		return {
			fire: this._player?.pyrs_fire ?? 0,
			water: this._player?.pyrs_water ?? 0,
			earth: this._player?.pyrs_earth ?? 0,
			wind: this._player?.pyrs_wind ?? 0
		};
	}

	get combatsWon() {
		return this._player?.combats_won ?? 0;
	}

	get combatsLost() {
		return this._player?.combats_lost ?? 0;
	}

	get totalCombats() {
		return this._player?.total_combats ?? 0;
	}

	get winRate() {
		if (this.totalCombats === 0) return 0;
		return (this.combatsWon / this.totalCombats) * 100;
	}

	get tutorialStage() {
		return this._player?.tutorial_stage ?? 'cinematic_0';
	}

	get tutorialCompleted() {
		return this._player?.tutorial_stage === 'fini';
	}

	// Methods
	gainXP(amount: number) {
		if (!this._player) return;

		this._player.xp += amount;

		// Check for level up
		while (this._player.xp >= this.xpForNextLevel) {
			this._player.xp -= this.xpForNextLevel;
			this._player.level += 1;
			// Trigger level up event (can be listened to in components)
			this.onLevelUp();
		}

		this.player = this._player; // Trigger save
	}

	gainPyrs(element: 'fire' | 'water' | 'earth' | 'wind', amount: number) {
		if (!this._player) return;

		switch (element) {
			case 'fire':
				this._player.pyrs_fire += amount;
				break;
			case 'water':
				this._player.pyrs_water += amount;
				break;
			case 'earth':
				this._player.pyrs_earth += amount;
				break;
			case 'wind':
				this._player.pyrs_wind += amount;
				break;
		}

		this.player = this._player; // Trigger save
	}

	spendPyrs(element: 'fire' | 'water' | 'earth' | 'wind', amount: number): boolean {
		if (!this._player) return false;

		// Check if player has enough pyrs
		const elementKey = `pyrs_${element}` as keyof GamePlayer;
		const currentPyrs = this._player[elementKey] as number;

		if (currentPyrs < amount) {
			return false; // Not enough pyrs
		}

		// Deduct pyrs
		switch (element) {
			case 'fire':
				this._player.pyrs_fire -= amount;
				this._player.pyrs_fire_spent += amount;
				break;
			case 'water':
				this._player.pyrs_water -= amount;
				this._player.pyrs_water_spent += amount;
				break;
			case 'earth':
				this._player.pyrs_earth -= amount;
				this._player.pyrs_earth_spent += amount;
				break;
			case 'wind':
				this._player.pyrs_wind -= amount;
				this._player.pyrs_wind_spent += amount;
				break;
		}

		this.player = this._player; // Trigger save
		return true;
	}

	advanceTutorial() {
		if (!this._player) return;

		// Tutorial progression logic (simplified)
		const stages = [
			'cinematic_0',
			'index_1',
			'combattre_2',
			'index_3',
			'accueil_defi_4',
			'fin_defi_5',
			'grimoire_6',
			'grimoire_7',
			'index_8',
			'prepa_combats_9',
			'combats_decks_10',
			'combattre_11',
			'index_12',
			'fini'
		];

		const currentIndex = stages.indexOf(this._player.tutorial_stage);
		if (currentIndex < stages.length - 1) {
			this._player.tutorial_stage = stages[currentIndex + 1] as never;
			this.player = this._player; // Trigger save
		}
	}

	private onLevelUp() {
		// This can be listened to by components
		// Show level up modal, unlock new spells, etc.
		console.log(`Level up! New level: ${this.level}`);
	}

	// Persistence
	loadFromLocalStorage() {
		const saved = localStorage.getItem('game_player');
		if (saved) {
			try {
				this._player = JSON.parse(saved);
			} catch (error) {
				console.error('Failed to load player from localStorage:', error);
			}
		}
	}

	async syncWithServer(serverPlayer: GamePlayer) {
		// Server data always wins (source of truth)
		this._player = serverPlayer;
		this.player = serverPlayer; // Trigger save
	}

	reset() {
		this._player = null;
		localStorage.removeItem('game_player');
	}
}

export const playerStore = new PlayerStore();
