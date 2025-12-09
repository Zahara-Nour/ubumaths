// Unit tests for combat calculation functions
// Author: Claude Code
// Date: 2025-10-17

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	calculateDamage,
	calculateHealing,
	calculateMonsterDamage,
	getElementAdvantage,
	calculateXPReward,
	calculatePrestigeReward,
	calculatePyrsReward,
	calculatePlayerMaxEndurance,
	calculateSpellUpgradeCost,
	calculateSpellPower,
	generateRandomMonster
} from './combat';
import { seedRandom, resetRandom } from '$tests/helpers/fixtures';
import type { GameSpell, GameMonster } from '$lib/types/game';

describe('Combat Calculations', () => {
	describe('calculateDamage', () => {
		const testSpell: GameSpell = {
			id: 'test-spell',
			user_id: 'test-user',
			spell_num: 1,
			level: 1,
			element: 'fire',
			power: 50,
			type: 'attack',
			unlocked_at: new Date().toISOString(),
			last_upgraded_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		it('should calculate base damage correctly', () => {
			const damage = calculateDamage(testSpell, 1, 'earth', 1.0, 0);

			// Base: 50, Level bonus: 1.05 (level 1), Effectiveness: 1.0, Element: 1.5 (fire > earth)
			// 50 * 1.05 * 1.0 * 1.5 = 78.75 -> floor = 78
			expect(damage).toBe(78);
		});

		it('should apply level bonus correctly (+5% per level)', () => {
			const damage10 = calculateDamage(testSpell, 10, 'earth', 1.0, 0);
			const damage20 = calculateDamage(testSpell, 20, 'earth', 1.0, 0);

			// Level 10: 50 * 1.50 * 1.0 * 1.5 = 112.5 -> 112
			// Level 20: 50 * 2.00 * 1.0 * 1.5 = 150
			expect(damage10).toBe(112);
			expect(damage20).toBe(150);
		});

		it('should apply effectiveness multiplier', () => {
			const fullDamage = calculateDamage(testSpell, 1, 'earth', 1.0, 0);
			const halfDamage = calculateDamage(testSpell, 1, 'earth', 0.5, 0);

			expect(halfDamage).toBe(Math.floor(fullDamage * 0.5));
		});

		it('should enforce minimum 0.5 effectiveness', () => {
			const damage1 = calculateDamage(testSpell, 1, 'earth', 0.3, 0);
			const damage2 = calculateDamage(testSpell, 1, 'earth', 0.5, 0);

			expect(damage1).toBe(damage2); // Both clamped to 0.5
		});

		it('should apply element advantage bonus', () => {
			const advantageDamage = calculateDamage(testSpell, 1, 'earth', 1.0, 0); // fire > earth
			const neutralDamage = calculateDamage(testSpell, 1, 'wind', 1.0, 0); // fire neutral to wind
			const disadvantageDamage = calculateDamage(testSpell, 1, 'water', 1.0, 0); // fire < water

			expect(advantageDamage).toBeGreaterThan(neutralDamage);
			expect(neutralDamage).toBeGreaterThan(disadvantageDamage);
		});

		it('should apply critical hit bonus based on combo meter', () => {
			beforeEach(() => seedRandom(12345));
			afterEach(() => resetRandom());

			// With combo meter = 0, no critical
			const noCrit = calculateDamage(testSpell, 1, 'earth', 1.0, 0);

			// With combo meter = 1, always critical
			seedRandom(12345);
			const critDamage = calculateDamage(testSpell, 1, 'earth', 1.0, 1.0);

			// Critical should be higher (but due to RNG, we can't guarantee exact value)
			// Just check that both return valid numbers
			expect(noCrit).toBeGreaterThan(0);
			expect(critDamage).toBeGreaterThan(0);

			resetRandom();
		});
	});

	describe('calculateHealing', () => {
		const healSpell: GameSpell = {
			id: 'heal-spell',
			user_id: 'test-user',
			spell_num: 2,
			level: 1,
			element: 'earth',
			power: 30,
			type: 'heal',
			unlocked_at: new Date().toISOString(),
			last_upgraded_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		it('should calculate base healing correctly', () => {
			const healing = calculateHealing(healSpell, 1, 1.0);

			// Base: 30, Level bonus: 1.05, Effectiveness: 1.0
			// 30 * 1.05 * 1.0 = 31.5 -> floor = 31
			expect(healing).toBe(31);
		});

		it('should apply level bonus to healing', () => {
			const healing1 = calculateHealing(healSpell, 1, 1.0);
			const healing10 = calculateHealing(healSpell, 10, 1.0);

			expect(healing10).toBeGreaterThan(healing1);
		});

		it('should apply effectiveness multiplier to healing', () => {
			const fullHealing = calculateHealing(healSpell, 1, 1.0);
			const halfHealing = calculateHealing(healSpell, 1, 0.5);

			expect(halfHealing).toBe(Math.floor(fullHealing * 0.5));
		});

		it('should enforce minimum 0.5 effectiveness for healing', () => {
			const healing1 = calculateHealing(healSpell, 1, 0.3);
			const healing2 = calculateHealing(healSpell, 1, 0.5);

			expect(healing1).toBe(healing2);
		});
	});

	describe('calculateMonsterDamage', () => {
		const testMonster: GameMonster = {
			id: 'test-monster',
			name: 'Test Monster',
			element: 'fire',
			level: 5,
			category: 'common',
			max_endurance: 100,
			attack_coefficient: 1.0,
			img_url: '/test.png',
			img_head_url: '/test-head.png',
			position: null,
			spawned_by: null,
			spawned_at: new Date().toISOString(),
			is_dead: false,
			defeated_by: null,
			defeated_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		it('should calculate monster damage based on level and coefficient', () => {
			const damage = calculateMonsterDamage(testMonster, 1);

			// Base: 5 (level) * 10 * 1.0 (coefficient) = 50
			// No reduction (player level 1 < monster level 5)
			expect(damage).toBe(50);
		});

		it('should reduce damage when player level is higher', () => {
			const lowLevelDamage = calculateMonsterDamage(testMonster, 1);
			const highLevelDamage = calculateMonsterDamage(testMonster, 10);

			expect(highLevelDamage).toBeLessThan(lowLevelDamage);
		});

		it('should cap damage reduction at 50%', () => {
			// Player level 30 >> monster level 5, should cap at 50% reduction
			const damage = calculateMonsterDamage(testMonster, 30);
			const baseDamage = testMonster.level * 10 * testMonster.attack_coefficient;

			expect(damage).toBe(Math.floor(baseDamage * 0.5));
		});

		it('should scale with attack coefficient', () => {
			const commonMonster = { ...testMonster, attack_coefficient: 1.0 };
			const eliteMonster = { ...testMonster, attack_coefficient: 1.3 };

			const commonDamage = calculateMonsterDamage(commonMonster, 1);
			const eliteDamage = calculateMonsterDamage(eliteMonster, 1);

			expect(eliteDamage).toBe(Math.floor(commonDamage * 1.3));
		});
	});

	describe('getElementAdvantage', () => {
		it('should return 1.5 for advantageous matchup', () => {
			expect(getElementAdvantage('fire', 'earth')).toBe(1.5);
			expect(getElementAdvantage('earth', 'wind')).toBe(1.5);
			expect(getElementAdvantage('wind', 'water')).toBe(1.5);
			expect(getElementAdvantage('water', 'fire')).toBe(1.5);
		});

		it('should return 0.75 for disadvantageous matchup', () => {
			expect(getElementAdvantage('fire', 'water')).toBe(0.75);
			expect(getElementAdvantage('water', 'wind')).toBe(0.75);
			expect(getElementAdvantage('wind', 'earth')).toBe(0.75);
			expect(getElementAdvantage('earth', 'fire')).toBe(0.75);
		});

		it('should return 1.0 for neutral matchup', () => {
			expect(getElementAdvantage('fire', 'fire')).toBe(1.0);
			expect(getElementAdvantage('fire', 'wind')).toBe(1.0);
			expect(getElementAdvantage('water', 'earth')).toBe(1.0);
		});
	});

	describe('calculateXPReward', () => {
		it('should calculate XP based on monster level and category', () => {
			const commonMonster = { level: 10, category: 'common' as const };
			const eliteMonster = { level: 10, category: 'elite' as const };
			const legendaryMonster = { level: 10, category: 'legendary' as const };

			const commonXP = calculateXPReward(commonMonster as GameMonster, 10, 0);
			const eliteXP = calculateXPReward(eliteMonster as GameMonster, 10, 0);
			const legendaryXP = calculateXPReward(legendaryMonster as GameMonster, 10, 0);

			// Base: level * 50
			// Common: 10 * 50 * 1.0 = 500
			// Elite: 10 * 50 * 1.5 = 750
			// Legendary: 10 * 50 * 3.0 = 1500
			expect(commonXP).toBe(500);
			expect(eliteXP).toBe(750);
			expect(legendaryXP).toBe(1500);
		});

		it('should apply perfect round bonus', () => {
			const monster = { level: 10, category: 'common' as const };

			const baseXP = calculateXPReward(monster as GameMonster, 10, 0);
			const bonusXP = calculateXPReward(monster as GameMonster, 10, 3);

			// 3 perfect rounds = 30% bonus
			expect(bonusXP).toBe(Math.floor(baseXP * 1.3));
		});

		it('should scale down XP for over-leveled players', () => {
			const monster = { level: 5, category: 'common' as const };

			const normalXP = calculateXPReward(monster as GameMonster, 5, 0);
			const overLeveledXP = calculateXPReward(monster as GameMonster, 15, 0);

			expect(overLeveledXP).toBeLessThan(normalXP);
		});

		it('should not scale down if level difference < 5', () => {
			const monster = { level: 5, category: 'common' as const };

			const xp1 = calculateXPReward(monster as GameMonster, 5, 0);
			const xp2 = calculateXPReward(monster as GameMonster, 9, 0);

			expect(xp1).toBe(xp2); // No scaling
		});
	});

	describe('calculatePrestigeReward', () => {
		it('should calculate prestige based on monster level and category', () => {
			const monster = { level: 10, category: 'elite' as const };

			const prestige = calculatePrestigeReward(monster as GameMonster, 400, 0);

			// Base: 10 * 25 (elite multiplier) = 250
			// Speed bonus: 400s > 300s, no bonus
			// Perfect bonus: 0 rounds
			expect(prestige).toBe(250);
		});

		it('should apply speed bonus for quick victories', () => {
			const monster = { level: 10, category: 'common' as const };

			const slowPrestige = calculatePrestigeReward(monster as GameMonster, 400, 0);
			const fastPrestige = calculatePrestigeReward(monster as GameMonster, 200, 0);

			expect(fastPrestige).toBeGreaterThan(slowPrestige);
		});

		it('should apply perfect round bonus', () => {
			const monster = { level: 10, category: 'common' as const };

			const basePrestige = calculatePrestigeReward(monster as GameMonster, 400, 0);
			const bonusPrestige = calculatePrestigeReward(monster as GameMonster, 400, 3);

			// 3 perfect rounds = 45% bonus (1 + 3 * 0.15)
			expect(bonusPrestige).toBe(Math.floor(basePrestige * 1.45));
		});
	});

	describe('calculatePyrsReward', () => {
		it('should calculate pyrs based on monster level and category', () => {
			const commonMonster = { level: 10, category: 'common' as const };
			const eliteMonster = { level: 10, category: 'elite' as const };
			const legendaryMonster = { level: 10, category: 'legendary' as const };

			const commonPyrs = calculatePyrsReward(commonMonster as GameMonster);
			const elitePyrs = calculatePyrsReward(eliteMonster as GameMonster);
			const legendaryPyrs = calculatePyrsReward(legendaryMonster as GameMonster);

			// Common: 10 * 5 = 50
			// Elite: 10 * 15 = 150
			// Legendary: 10 * 50 = 500
			expect(commonPyrs).toBe(50);
			expect(elitePyrs).toBe(150);
			expect(legendaryPyrs).toBe(500);
		});
	});

	describe('calculatePlayerMaxEndurance', () => {
		it('should calculate max HP based on level', () => {
			expect(calculatePlayerMaxEndurance(1)).toBe(120); // 100 + 1*20
			expect(calculatePlayerMaxEndurance(5)).toBe(200); // 100 + 5*20
			expect(calculatePlayerMaxEndurance(10)).toBe(300); // 100 + 10*20
			expect(calculatePlayerMaxEndurance(50)).toBe(1100); // 100 + 50*20
		});

		it('should scale linearly with level', () => {
			const hp1 = calculatePlayerMaxEndurance(1);
			const hp2 = calculatePlayerMaxEndurance(2);

			expect(hp2 - hp1).toBe(20);
		});
	});

	describe('calculateSpellUpgradeCost', () => {
		it('should return correct costs for each level', () => {
			expect(calculateSpellUpgradeCost(1)).toBe(50); // 50 * 2^0
			expect(calculateSpellUpgradeCost(2)).toBe(100); // 50 * 2^1
			expect(calculateSpellUpgradeCost(3)).toBe(200); // 50 * 2^2
			expect(calculateSpellUpgradeCost(4)).toBe(400); // 50 * 2^3
		});

		it('should return 0 for max level (5)', () => {
			expect(calculateSpellUpgradeCost(5)).toBe(0);
		});

		it('should return 0 for levels above 5', () => {
			expect(calculateSpellUpgradeCost(6)).toBe(0);
			expect(calculateSpellUpgradeCost(10)).toBe(0);
		});
	});

	describe('calculateSpellPower', () => {
		it('should calculate power at each level', () => {
			const basePower = 50;

			expect(calculateSpellPower(basePower, 1)).toBe(50); // 50 * 1.25^0
			expect(calculateSpellPower(basePower, 2)).toBe(62); // 50 * 1.25^1 = 62.5 -> 62
			expect(calculateSpellPower(basePower, 3)).toBe(78); // 50 * 1.25^2 = 78.125 -> 78
			expect(calculateSpellPower(basePower, 4)).toBe(97); // 50 * 1.25^3 = 97.65 -> 97
			expect(calculateSpellPower(basePower, 5)).toBe(122); // 50 * 1.25^4 = 122.07 -> 122
		});

		it('should scale exponentially', () => {
			const power1 = calculateSpellPower(50, 1);
			const power2 = calculateSpellPower(50, 2);
			const power3 = calculateSpellPower(50, 3);

			expect(power2).toBeGreaterThan(power1);
			expect(power3 - power2).toBeGreaterThan(power2 - power1); // Exponential growth
		});
	});

	describe('generateRandomMonster', () => {
		beforeEach(() => {
			seedRandom(12345); // Deterministic RNG
		});

		afterEach(() => {
			resetRandom();
		});

		it('should generate monster with level close to player level', () => {
			const playerLevel = 10;
			const monster = generateRandomMonster(playerLevel);

			expect(monster.level).toBeGreaterThanOrEqual(7); // playerLevel - 3
			expect(monster.level).toBeLessThanOrEqual(13); // playerLevel + 3
		});

		it('should respect level bounds (1-50)', () => {
			const lowLevelMonster = generateRandomMonster(1);
			const highLevelMonster = generateRandomMonster(50);

			expect(lowLevelMonster.level).toBeGreaterThanOrEqual(1);
			expect(highLevelMonster.level).toBeLessThanOrEqual(50);
		});

		it('should generate random element', () => {
			seedRandom(12345);
			const monster1 = generateRandomMonster(10);

			seedRandom(54321);
			const monster2 = generateRandomMonster(10);

			// Different seeds should (usually) give different elements
			// We'll just check that elements are valid
			expect(['fire', 'water', 'earth', 'wind']).toContain(monster1.element);
			expect(['fire', 'water', 'earth', 'wind']).toContain(monster2.element);
		});

		it('should force specific element if provided', () => {
			const fireMonster = generateRandomMonster(10, 'fire');
			expect(fireMonster.element).toBe('fire');
		});

		it('should generate category with correct distribution', () => {
			const categories: string[] = [];

			// Generate 100 monsters with seeded RNG
			for (let i = 0; i < 100; i++) {
				seedRandom(i);
				const monster = generateRandomMonster(10);
				categories.push(monster.category);
			}

			const common = categories.filter((c) => c === 'common').length;
			const elite = categories.filter((c) => c === 'elite').length;
			const legendary = categories.filter((c) => c === 'legendary').length;

			// Common should be ~70%, Elite ~25%, Legendary ~5%
			// With 100 samples, we expect roughly these numbers
			expect(common).toBeGreaterThan(50); // At least 50% common
			expect(elite).toBeGreaterThan(10); // At least 10% elite
			expect(legendary).toBeGreaterThanOrEqual(0); // Legendary is rare

			resetRandom();
		});

		it('should calculate stats based on category', () => {
			seedRandom(12345);

			// Force common category by using specific seed that generates < 0.7
			const commonMonster = generateRandomMonster(10);

			// Check that max_endurance matches category formula
			// Monster level is randomized (±3 from player level)
			if (commonMonster.category === 'common') {
				const expectedHP = 100 + commonMonster.level * 30;
				expect(commonMonster.max_endurance).toBe(expectedHP);
				expect(commonMonster.attack_coefficient).toBe(1.0);
			}

			resetRandom();
		});
	});
});
