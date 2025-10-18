// Combat calculation helpers
// Author: Claude Code
// Date: 2025-10-15

import type {
	GameElement,
	GameSpell,
	GameMonster,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	GamePlayer // For future player calculations
} from '$lib/types/game';

/**
 * Calculate damage dealt by a spell
 * @param spell - The spell being cast
 * @param playerLevel - Player's current level
 * @param monsterElement - Monster's element
 * @param effectiveness - Challenge performance (0-1, where 1 = perfect)
 * @param comboMeter - Current combo meter value (0-1)
 * @returns Damage amount
 */
export function calculateDamage(
	spell: GameSpell,
	playerLevel: number,
	monsterElement: GameElement,
	effectiveness: number = 1.0,
	comboMeter: number = 0
): number {
	// Base damage from spell power
	const baseDamage = spell.power;

	// Player level bonus (+5% per level)
	const levelBonus = 1 + playerLevel * 0.05;

	// Effectiveness multiplier (0.5 for failed challenge, 1.0 for success)
	const effectivenessMultiplier = Math.max(0.5, effectiveness);

	// Element advantage bonus
	const elementBonus = getElementAdvantage(spell.element, monsterElement);

	// Calculate base damage
	let damage = baseDamage * levelBonus * effectivenessMultiplier * elementBonus;

	// Check for critical hit based on combo meter
	if (Math.random() < comboMeter) {
		damage *= 1.5; // 50% bonus damage on critical
	}

	return Math.floor(damage);
}

/**
 * Calculate healing amount
 * @param spell - The healing spell
 * @param playerLevel - Player's current level
 * @param effectiveness - Challenge performance (0-1)
 * @returns Healing amount
 */
export function calculateHealing(
	spell: GameSpell,
	playerLevel: number,
	effectiveness: number = 1.0
): number {
	const baseHealing = spell.power;
	const levelBonus = 1 + playerLevel * 0.05;
	const effectivenessMultiplier = Math.max(0.5, effectiveness);

	return Math.floor(baseHealing * levelBonus * effectivenessMultiplier);
}

/**
 * Calculate monster damage based on its stats
 * @param monster - The monster
 * @param playerLevel - Player's level
 * @returns Damage dealt by monster
 */
export function calculateMonsterDamage(monster: GameMonster, playerLevel: number): number {
	// Base damage scales with monster level and attack coefficient
	const baseDamage = monster.level * 10 * monster.attack_coefficient;

	// Reduce damage if player is higher level (max 50% reduction)
	const levelDifference = playerLevel - monster.level;
	const damageReduction = Math.min(0.5, Math.max(0, levelDifference * 0.05));

	return Math.floor(baseDamage * (1 - damageReduction));
}

/**
 * Get element advantage multiplier
 * Rock-paper-scissors system:
 * Fire > Earth > Wind > Water > Fire
 */
export function getElementAdvantage(
	spellElement: GameElement,
	monsterElement: GameElement
): number {
	const advantages: Record<GameElement, GameElement> = {
		fire: 'earth',
		earth: 'wind',
		wind: 'water',
		water: 'fire'
	};

	if (advantages[spellElement] === monsterElement) {
		return 1.5; // 50% bonus damage
	} else if (advantages[monsterElement] === spellElement) {
		return 0.75; // 25% penalty
	}

	return 1.0; // Neutral
}

/**
 * Calculate XP reward for defeating a monster
 * @param monster - The defeated monster
 * @param playerLevel - Player's level
 * @param perfectRounds - Number of rounds with all challenges succeeded
 * @returns XP amount
 */
export function calculateXPReward(
	monster: GameMonster,
	playerLevel: number,
	perfectRounds: number = 0
): number {
	// Base XP from monster level and category
	const categoryMultiplier = {
		common: 1.0,
		elite: 1.5,
		legendary: 3.0
	};

	const baseXP = monster.level * 50 * categoryMultiplier[monster.category];

	// Bonus for perfect rounds (10% per perfect round)
	const perfectBonus = 1 + perfectRounds * 0.1;

	// Scale down if player is much higher level
	const levelDifference = playerLevel - monster.level;
	const xpScale = levelDifference > 5 ? Math.max(0.5, 1 - (levelDifference - 5) * 0.05) : 1.0;

	return Math.floor(baseXP * perfectBonus * xpScale);
}

/**
 * Calculate prestige reward for defeating a monster
 * @param monster - The defeated monster
 * @param timeTaken - Total combat time in seconds
 * @param perfectRounds - Number of rounds with all challenges succeeded
 * @returns Prestige amount
 */
export function calculatePrestigeReward(
	monster: GameMonster,
	timeTaken: number,
	perfectRounds: number = 0
): number {
	const categoryMultiplier = {
		common: 10,
		elite: 25,
		legendary: 100
	};

	const basePrestige = monster.level * categoryMultiplier[monster.category];

	// Speed bonus (if defeated quickly)
	const speedBonus = timeTaken < 300 ? 1.2 : 1.0; // 20% bonus if under 5 minutes

	// Perfect rounds bonus
	const perfectBonus = 1 + perfectRounds * 0.15;

	return Math.floor(basePrestige * speedBonus * perfectBonus);
}

/**
 * Calculate pyrs reward for defeating a monster
 * @param monster - The defeated monster
 * @returns Pyrs gained for monster's element
 */
export function calculatePyrsReward(monster: GameMonster): number {
	const categoryMultiplier = {
		common: 5,
		elite: 15,
		legendary: 50
	};

	return monster.level * categoryMultiplier[monster.category];
}

/**
 * Calculate player max endurance (HP) based on level
 * @param level - Player level
 * @returns Max HP
 */
export function calculatePlayerMaxEndurance(level: number): number {
	// Formula: 100 base + (level * 20)
	return 100 + level * 20;
}

/**
 * Calculate spell upgrade cost in pyrs
 * @param currentLevel - Current spell level (1-5)
 * @returns Pyrs cost to upgrade
 */
export function calculateSpellUpgradeCost(currentLevel: number): number {
	if (currentLevel >= 5) return 0; // Max level

	// Cost increases exponentially: 50, 100, 200, 400
	return 50 * Math.pow(2, currentLevel - 1);
}

/**
 * Calculate spell power at a given level
 * @param basepower - Base power at level 1
 * @param level - Spell level (1-5)
 * @returns Power at given level
 */
export function calculateSpellPower(basePower: number, level: number): number {
	// Power increases by 25% per level
	return Math.floor(basePower * Math.pow(1.25, level - 1));
}

/**
 * Generate a random monster for the given player level
 * @param playerLevel - Player's current level
 * @param element - Force specific element (optional)
 * @returns Monster configuration
 */
export function generateRandomMonster(playerLevel: number, element?: GameElement) {
	// Monster level should be close to player level (±3)
	const minLevel = Math.max(1, playerLevel - 3);
	const maxLevel = Math.min(50, playerLevel + 3);
	const monsterLevel = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;

	// Random element if not specified
	const elements: GameElement[] = ['fire', 'water', 'earth', 'wind'];
	const monsterElement = element || elements[Math.floor(Math.random() * elements.length)];

	// Determine category based on random chance
	const rand = Math.random();
	let category: 'common' | 'elite' | 'legendary';
	if (rand < 0.7) {
		category = 'common'; // 70%
	} else if (rand < 0.95) {
		category = 'elite'; // 25%
	} else {
		category = 'legendary'; // 5%
	}

	// Calculate stats
	const maxEndurance = calculateMonsterMaxEndurance(monsterLevel, category);
	const attackCoefficient = calculateMonsterAttackCoefficient(category);

	return {
		level: monsterLevel,
		element: monsterElement,
		category,
		max_endurance: maxEndurance,
		attack_coefficient: attackCoefficient
	};
}

function calculateMonsterMaxEndurance(
	level: number,
	category: 'common' | 'elite' | 'legendary'
): number {
	const baseHP = {
		common: 100,
		elite: 200,
		legendary: 500
	};

	return baseHP[category] + level * 30;
}

function calculateMonsterAttackCoefficient(category: 'common' | 'elite' | 'legendary'): number {
	return {
		common: 1.0,
		elite: 1.3,
		legendary: 1.8
	}[category];
}
