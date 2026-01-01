/**
 * Tests for Evoland Monster System
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Monster, Fireball, MonsterManager, createMonster, createMonsterManager } from './monster';
import { World } from './world';
import { Direction, EKind, TILE_SIZE, Block } from './constants';

describe('Monster', () => {
	let monster: Monster;
	let world: World;

	beforeEach(() => {
		monster = new Monster(EKind.Monster, 100, 100);
		world = new World();

		// Set up a walkable area
		for (let x = 0; x < 20; x++) {
			for (let y = 0; y < 20; y++) {
				world.setTile(x, y, Block.Field);
			}
		}
	});

	describe('initialization', () => {
		it('should have correct kind', () => {
			expect(monster.kind).toBe(EKind.Monster);
		});

		it('should have 1 HP by default', () => {
			expect(monster.hp).toBe(1);
			expect(monster.maxHp).toBe(1);
		});

		it('should store spawn position', () => {
			expect(monster.spawnX).toBe(100);
			expect(monster.spawnY).toBe(100);
		});

		it('should have random behavior by default', () => {
			expect(monster.behavior).toBe('random');
		});
	});

	describe('Bat', () => {
		let bat: Monster;

		beforeEach(() => {
			bat = new Monster(EKind.Bat, 100, 100);
		});

		it('should have bat behavior', () => {
			expect(bat.behavior).toBe('bat');
		});

		it('should have faster move delay', () => {
			expect(bat.moveDelay).toBeLessThan(monster.moveDelay);
		});
	});

	describe('Knight', () => {
		let knight: Monster;

		beforeEach(() => {
			knight = new Monster(EKind.Knight, 100, 100);
		});

		it('should have knight behavior', () => {
			expect(knight.behavior).toBe('knight');
		});

		it('should have more HP', () => {
			expect(knight.hp).toBe(3);
			expect(knight.maxHp).toBe(3);
		});
	});

	describe('random walk AI', () => {
		it('should move after delay', () => {
			monster.setGridPosition(5, 5);
			monster.moveTimer = 1;

			// Update enough to trigger move
			monster.update(2, world);

			// Should have started moving
			expect(monster.isMoving()).toBe(true);
		});

		it('should not move while already moving', () => {
			monster.setGridPosition(5, 5);
			monster.moveTimer = 1;
			monster.update(2, world);

			// Reset timer but already moving
			monster.moveTimer = 0;
			monster.update(1, world);

			// Should still be on same movement path
			expect(monster.isMoving()).toBe(true);
		});

		it('should not move into solid tiles', () => {
			monster.setGridPosition(5, 5);

			// Surround with walls
			world.setTile(4, 5, Block.Tree);
			world.setTile(6, 5, Block.Tree);
			world.setTile(5, 4, Block.Tree);
			world.setTile(5, 6, Block.Tree);

			monster.moveTimer = 1;
			monster.update(2, world);

			// Should not be moving (all directions blocked)
			expect(monster.isMoving()).toBe(false);
		});
	});

	describe('collision detection', () => {
		it('should detect hit with hero bounds', () => {
			monster.setPosition(100, 100);

			const hit = monster.hitsHero(95, 95, 16, 16);
			expect(hit).toBe(true);
		});

		it('should not hit when not overlapping', () => {
			monster.setPosition(100, 100);

			const hit = monster.hitsHero(0, 0, 16, 16);
			expect(hit).toBe(false);
		});

		it('should not hit when removed', () => {
			monster.setPosition(100, 100);
			monster.removed = true;

			const hit = monster.hitsHero(100, 100, 16, 16);
			expect(hit).toBe(false);
		});
	});

	describe('sword hit', () => {
		it('should die from sword hit', () => {
			monster.setPosition(100, 100);

			const died = monster.checkSwordHit({
				x: 95,
				y: 95,
				width: 20,
				height: 20
			});

			expect(died).toBe(true);
			expect(monster.removed).toBe(true);
		});

		it('should not die if sword misses', () => {
			monster.setPosition(100, 100);

			const died = monster.checkSwordHit({
				x: 0,
				y: 0,
				width: 10,
				height: 10
			});

			expect(died).toBe(false);
			expect(monster.removed).toBe(false);
		});

		it('should not die if already removed', () => {
			monster.setPosition(100, 100);
			monster.removed = true;

			const died = monster.checkSwordHit({
				x: 100,
				y: 100,
				width: 16,
				height: 16
			});

			expect(died).toBe(false);
		});
	});

	describe('gold drop', () => {
		it('should calculate gold drop', () => {
			const gold = monster.calculateGoldDrop();
			expect(gold).toBeGreaterThanOrEqual(0);
			expect(gold).toBeLessThanOrEqual(2);
		});
	});
});

describe('Fireball', () => {
	let fireball: Fireball;
	let world: World;

	beforeEach(() => {
		fireball = new Fireball(100, 100, Direction.Down);
		world = new World();

		// Set up a walkable area
		for (let x = 0; x < 20; x++) {
			for (let y = 0; y < 20; y++) {
				world.setTile(x, y, Block.Field);
			}
		}
	});

	describe('initialization', () => {
		it('should have fireball kind', () => {
			expect(fireball.kind).toBe(EKind.Fireball);
		});

		it('should set velocity from direction', () => {
			expect(fireball.vy).toBeGreaterThan(0); // Moving down
			expect(fireball.vx).toBe(0);
		});

		it('should set direction based on initial direction', () => {
			const right = new Fireball(0, 0, Direction.Right);
			expect(right.vx).toBeGreaterThan(0);
			expect(right.vy).toBe(0);
		});
	});

	describe('movement', () => {
		it('should move in direction', () => {
			const startY = fireball.y;
			fireball.update(1, world);
			expect(fireball.y).toBeGreaterThan(startY);
		});

		it('should be removed after lifetime', () => {
			fireball.lifetime = 1;
			fireball.update(2, world);
			expect(fireball.removed).toBe(true);
		});

		it('should be removed on wall collision', () => {
			fireball.setPosition(100, 100);
			world.setTile(6, 7, Block.Tree);

			// Move towards tree
			fireball.vy = TILE_SIZE;
			fireball.update(1, world);

			expect(fireball.removed).toBe(true);
		});
	});

	describe('hero hit', () => {
		it('should hit hero', () => {
			fireball.setPosition(100, 100);
			const hit = fireball.hitsHero(100, 100, 16, 16);
			expect(hit).toBe(true);
			expect(fireball.removed).toBe(true);
		});

		it('should not hit if removed', () => {
			fireball.setPosition(100, 100);
			fireball.removed = true;
			const hit = fireball.hitsHero(100, 100, 16, 16);
			expect(hit).toBe(false);
		});
	});
});

describe('MonsterManager', () => {
	let manager: MonsterManager;
	let world: World;

	beforeEach(() => {
		manager = new MonsterManager(10);
		world = new World();

		for (let x = 0; x < 20; x++) {
			for (let y = 0; y < 20; y++) {
				world.setTile(x, y, Block.Field);
			}
		}
	});

	describe('spawn', () => {
		it('should spawn monster', () => {
			const monster = manager.spawn(EKind.Monster, 100, 100);
			expect(monster).not.toBeNull();
			expect(manager.count()).toBe(1);
		});

		it('should respect max monsters', () => {
			for (let i = 0; i < 15; i++) {
				manager.spawn(EKind.Monster, i * 20, 100);
			}
			expect(manager.count()).toBe(10);
		});

		it('should spawn from world data', () => {
			manager.spawnFromWorld([
				{ x: 5, y: 5, kind: EKind.Monster },
				{ x: 6, y: 5, kind: EKind.Bat },
				{ x: 7, y: 5, kind: EKind.Knight }
			]);
			expect(manager.count()).toBe(3);
		});
	});

	describe('update', () => {
		it('should update all monsters', () => {
			manager.spawn(EKind.Monster, 80, 80);
			manager.spawn(EKind.Monster, 160, 160);

			// Update
			manager.update(1, world, 100, 100);

			// Both should still be alive
			expect(manager.count()).toBe(2);
		});

		it('should remove dead monsters', () => {
			const monster = manager.spawn(EKind.Monster, 100, 100);
			monster!.removed = true;

			manager.update(1, world, 0, 0);
			expect(manager.count()).toBe(0);
		});

		it('should update fireballs', () => {
			const fireball = new Fireball(100, 100, Direction.Down);
			manager.addFireball(fireball);

			const startY = fireball.y;
			manager.update(1, world, 0, 0);

			expect(fireball.y).toBeGreaterThan(startY);
		});
	});

	describe('sword hits', () => {
		it('should check sword hits on monsters', () => {
			manager.spawn(EKind.Monster, 100, 100);
			manager.spawn(EKind.Monster, 200, 200);

			const killed = manager.checkSwordHits({
				x: 95,
				y: 95,
				width: 20,
				height: 20
			});

			expect(killed).toHaveLength(1);
		});

		it('should return empty array if no hitbox', () => {
			manager.spawn(EKind.Monster, 100, 100);
			const killed = manager.checkSwordHits(null);
			expect(killed).toHaveLength(0);
		});
	});

	describe('hero collision', () => {
		it('should detect hero hit by monster', () => {
			manager.spawn(EKind.Monster, 100, 100);
			const hit = manager.checkHeroHit(95, 95, 16, 16);
			expect(hit).toBe(true);
		});

		it('should detect hero hit by fireball', () => {
			manager.addFireball(new Fireball(100, 100, Direction.Down));
			const hit = manager.checkFireballHit(100, 100, 16, 16);
			expect(hit).toBe(true);
		});
	});

	describe('getters', () => {
		it('should get monsters', () => {
			manager.spawn(EKind.Monster, 100, 100);
			manager.spawn(EKind.Bat, 200, 200);

			const monsters = manager.getMonsters();
			expect(monsters).toHaveLength(2);
		});

		it('should get fireballs', () => {
			manager.addFireball(new Fireball(100, 100, Direction.Down));
			const fireballs = manager.getFireballs();
			expect(fireballs).toHaveLength(1);
		});
	});

	describe('clear', () => {
		it('should clear all monsters and fireballs', () => {
			manager.spawn(EKind.Monster, 100, 100);
			manager.addFireball(new Fireball(100, 100, Direction.Down));

			manager.clear();

			expect(manager.count()).toBe(0);
			expect(manager.getFireballs()).toHaveLength(0);
		});
	});
});

describe('createMonster', () => {
	it('should create monster at grid position', () => {
		const monster = createMonster(EKind.Monster, 5, 10);
		expect(monster.ix).toBe(5);
		expect(monster.iy).toBe(10);
		expect(monster.x).toBe(5 * TILE_SIZE);
		expect(monster.y).toBe(10 * TILE_SIZE);
	});
});

describe('createMonsterManager', () => {
	it('should create manager', () => {
		const manager = createMonsterManager();
		expect(manager.count()).toBe(0);
	});

	it('should accept max monsters', () => {
		const manager = createMonsterManager(5);
		for (let i = 0; i < 10; i++) {
			manager.spawn(EKind.Monster, i * 20, 100);
		}
		expect(manager.count()).toBe(5);
	});
});
