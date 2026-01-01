/**
 * Tests for Evoland Progression System
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
	ProgressionManager,
	createDefaultFlags,
	createDefaultProgression,
	getChestData,
	isFeatureUnlock
} from './progression';
import { Hero } from './hero';
import { ChestKind } from './constants';

describe('ProgressionManager', () => {
	let progression: ProgressionManager;
	let hero: Hero;

	beforeEach(() => {
		progression = new ProgressionManager();
		hero = new Hero(100, 100);
	});

	describe('initialization', () => {
		it('should start with default flags', () => {
			const flags = progression.getFlags();
			expect(flags.canMoveLeft).toBe(false);
			expect(flags.canMoveRight).toBe(true);
			expect(flags.mode2D).toBe(false);
			expect(flags.colorLevel).toBe(0);
		});

		it('should start with zero stats', () => {
			expect(progression.getGold()).toBe(0);
			expect(progression.getKeys()).toBe(0);
			expect(progression.getXP()).toBe(0);
			expect(progression.getLevel()).toBe(1);
		});
	});

	describe('chest opening', () => {
		it('should open chest and return data', () => {
			const data = progression.openChest(ChestKind.CLeftCtrl);
			expect(data).not.toBeNull();
			expect(data?.name).toBe('Fleche Gauche');
		});

		it('should not open same chest twice', () => {
			progression.openChest(ChestKind.CLeftCtrl);
			const second = progression.openChest(ChestKind.CLeftCtrl);
			expect(second).toBeNull();
		});

		it('should track opened chests', () => {
			expect(progression.isChestOpened(ChestKind.CLeftCtrl)).toBe(false);
			progression.openChest(ChestKind.CLeftCtrl);
			expect(progression.isChestOpened(ChestKind.CLeftCtrl)).toBe(true);
		});

		it('should apply movement unlock to hero', () => {
			expect(hero.flags.canMoveLeft).toBe(false);
			progression.openChest(ChestKind.CLeftCtrl, hero);
			expect(hero.flags.canMoveLeft).toBe(true);
		});

		it('should apply weapon unlock to hero', () => {
			expect(hero.flags.hasSword).toBe(false);
			progression.openChest(ChestKind.CWeapon, hero);
			expect(hero.flags.hasSword).toBe(true);
		});

		it('should apply push block unlock to hero', () => {
			expect(hero.flags.canPushBlock).toBe(false);
			progression.openChest(ChestKind.CPushBlock, hero);
			expect(hero.flags.canPushBlock).toBe(true);
		});
	});

	describe('multi-level chests', () => {
		it('should allow opening scroll chest multiple times', () => {
			const first = progression.openChest(ChestKind.CScroll);
			expect(first).not.toBeNull();
			expect(progression.getScrollLevel(ChestKind.CScroll)).toBe(1);

			const second = progression.openChest(ChestKind.CScroll);
			expect(second).not.toBeNull();
			expect(progression.getScrollLevel(ChestKind.CScroll)).toBe(2);

			// Max level reached
			const third = progression.openChest(ChestKind.CScroll);
			expect(third).toBeNull();
		});

		it('should track color levels', () => {
			expect(progression.getFlags().colorLevel).toBe(0);

			progression.openChest(ChestKind.CColor);
			expect(progression.getFlags().colorLevel).toBe(1);

			progression.openChest(ChestKind.CColor);
			expect(progression.getFlags().colorLevel).toBe(2);
		});

		it('should track zoom levels', () => {
			expect(progression.getFlags().zoomLevel).toBe(1);

			progression.openChest(ChestKind.CZoom);
			expect(progression.getFlags().zoomLevel).toBe(2);

			progression.openChest(ChestKind.CZoom);
			expect(progression.getFlags().zoomLevel).toBe(3);
		});
	});

	describe('item pickups', () => {
		it('should add gold from chest', () => {
			progression.openChest(ChestKind.CGoldCoin, hero);
			expect(progression.getGold()).toBe(10);
			expect(hero.inventory.gold).toBe(10);
		});

		it('should add key from chest', () => {
			progression.openChest(ChestKind.CKey, hero);
			expect(progression.getKeys()).toBe(1);
			expect(hero.inventory.keys).toBe(1);
		});
	});

	describe('stats management', () => {
		it('should add and use gold', () => {
			progression.addGold(50);
			expect(progression.getGold()).toBe(50);
		});

		it('should add and use keys', () => {
			progression.addKey();
			expect(progression.getKeys()).toBe(1);
			expect(progression.useKey()).toBe(true);
			expect(progression.getKeys()).toBe(0);
			expect(progression.useKey()).toBe(false);
		});

		it('should add XP without level up when disabled', () => {
			const leveledUp = progression.addXP(100);
			expect(leveledUp).toBe(false);
			expect(progression.getLevel()).toBe(1);
		});

		it('should level up when XP enabled', () => {
			progression.openChest(ChestKind.CLevelUp);
			const leveledUp = progression.addXP(100);
			expect(leveledUp).toBe(true);
			expect(progression.getLevel()).toBe(2);
			expect(progression.getXP()).toBe(0);
		});

		it('should carry over excess XP on level up', () => {
			progression.openChest(ChestKind.CLevelUp);
			progression.addXP(150);
			expect(progression.getLevel()).toBe(2);
			expect(progression.getXP()).toBe(50);
		});

		it('should increase max HP on level up', () => {
			progression.openChest(ChestKind.CLevelUp);
			const initialMaxHP = progression.getMaxHP();
			progression.addXP(100);
			expect(progression.getMaxHP()).toBe(initialMaxHP + 1);
		});

		it('should full heal on level up', () => {
			progression.openChest(ChestKind.CLevelUp);
			progression.takeDamage(2);
			progression.addXP(100);
			expect(progression.getHP()).toBe(progression.getMaxHP());
		});
	});

	describe('damage and healing', () => {
		it('should take damage', () => {
			const initialHP = progression.getHP();
			const died = progression.takeDamage(1);
			expect(died).toBe(false);
			expect(progression.getHP()).toBe(initialHP - 1);
		});

		it('should die when HP reaches 0', () => {
			const died = progression.takeDamage(progression.getHP());
			expect(died).toBe(true);
			expect(progression.getHP()).toBe(0);
		});

		it('should heal', () => {
			progression.takeDamage(2);
			progression.heal(1);
			expect(progression.getHP()).toBe(2);
		});

		it('should not heal above max', () => {
			const maxHP = progression.getMaxHP();
			progression.heal(10);
			expect(progression.getHP()).toBe(maxHP);
		});
	});

	describe('kill count', () => {
		it('should track kills', () => {
			expect(progression.getKillCount()).toBe(0);
			progression.addKill();
			progression.addKill();
			expect(progression.getKillCount()).toBe(2);
		});
	});

	describe('flag checking', () => {
		it('should check boolean flags', () => {
			expect(progression.hasFlag('canMoveLeft')).toBe(false);
			progression.openChest(ChestKind.CLeftCtrl);
			expect(progression.hasFlag('canMoveLeft')).toBe(true);
		});

		it('should check numeric flags', () => {
			expect(progression.hasFlag('colorLevel')).toBe(false); // 0 is falsy
			progression.openChest(ChestKind.CColor);
			expect(progression.hasFlag('colorLevel')).toBe(true); // 1 is truthy
		});
	});

	describe('serialization', () => {
		it('should save and restore state', () => {
			progression.openChest(ChestKind.CLeftCtrl);
			progression.openChest(ChestKind.CWeapon);
			progression.addGold(100);
			progression.addKey();
			progression.addKill();
			progression.addKill();

			const state = progression.toState();

			const newProgression = new ProgressionManager();
			newProgression.fromState(state);

			expect(newProgression.isChestOpened(ChestKind.CLeftCtrl)).toBe(true);
			expect(newProgression.isChestOpened(ChestKind.CWeapon)).toBe(true);
			expect(newProgression.getGold()).toBe(100);
			expect(newProgression.getKeys()).toBe(1);
			expect(newProgression.getKillCount()).toBe(2);
		});

		it('should save scroll levels', () => {
			progression.openChest(ChestKind.CScroll);
			progression.openChest(ChestKind.CScroll);

			const state = progression.toState();

			const newProgression = new ProgressionManager();
			newProgression.fromState(state);

			expect(newProgression.getScrollLevel(ChestKind.CScroll)).toBe(2);
		});
	});

	describe('reset', () => {
		it('should reset to initial state', () => {
			progression.openChest(ChestKind.CLeftCtrl);
			progression.addGold(100);
			progression.addXP(50);

			progression.reset();

			expect(progression.isChestOpened(ChestKind.CLeftCtrl)).toBe(false);
			expect(progression.getGold()).toBe(0);
			expect(progression.getXP()).toBe(0);
			expect(progression.getFlags().canMoveLeft).toBe(false);
		});
	});

	describe('hero sync', () => {
		it('should sync stats to hero', () => {
			progression.addGold(50);
			progression.addKey();
			progression.openChest(ChestKind.CWeapon);

			progression.syncWithHero(hero);

			expect(hero.inventory.gold).toBe(50);
			expect(hero.inventory.keys).toBe(1);
			expect(hero.flags.hasSword).toBe(true);
		});

		it('should sync stats from hero', () => {
			hero.addGold(75);
			hero.addKey();
			hero.addKey();

			progression.syncFromHero(hero);

			expect(progression.getGold()).toBe(75);
			expect(progression.getKeys()).toBe(2);
		});
	});
});

describe('createDefaultFlags', () => {
	it('should create default progression flags', () => {
		const flags = createDefaultFlags();
		expect(flags.canMoveRight).toBe(true);
		expect(flags.canMoveLeft).toBe(false);
		expect(flags.mode2D).toBe(false);
	});
});

describe('createDefaultProgression', () => {
	it('should create default progression state', () => {
		const state = createDefaultProgression();
		expect(state.level).toBe(1);
		expect(state.gold).toBe(0);
		expect(state.openedChests).toHaveLength(0);
	});
});

describe('getChestData', () => {
	it('should return chest data by kind', () => {
		const data = getChestData(ChestKind.CWeapon);
		expect(data.name).toBe('Epee');
	});
});

describe('isFeatureUnlock', () => {
	it('should identify feature unlocks', () => {
		expect(isFeatureUnlock(ChestKind.CWeapon)).toBe(true);
		expect(isFeatureUnlock(ChestKind.CLeftCtrl)).toBe(true);
	});

	it('should identify item pickups', () => {
		expect(isFeatureUnlock(ChestKind.CGoldCoin)).toBe(false);
		expect(isFeatureUnlock(ChestKind.CKey)).toBe(false);
	});
});
