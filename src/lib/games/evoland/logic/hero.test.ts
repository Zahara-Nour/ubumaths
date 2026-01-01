/**
 * Tests for Evoland Hero Entity
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Hero, createHero, createHeroAtGrid } from './hero';
import { World } from './world';
import { Direction, EKind, TILE_SIZE, Block, SWORD_DURATION } from './constants';

describe('Hero', () => {
	let hero: Hero;
	let world: World;

	beforeEach(() => {
		hero = new Hero(100, 100);
		world = new World();

		// Set up a walkable area
		for (let x = 0; x < 20; x++) {
			for (let y = 0; y < 20; y++) {
				world.setTile(x, y, Block.Field);
			}
		}
	});

	describe('initialization', () => {
		it('should have correct entity kind', () => {
			expect(hero.kind).toBe(EKind.Hero);
		});

		it('should have starting HP', () => {
			expect(hero.hp).toBe(3);
			expect(hero.maxHp).toBe(10);
		});

		it('should have empty inventory', () => {
			expect(hero.inventory.keys).toBe(0);
			expect(hero.inventory.gold).toBe(0);
			expect(hero.inventory.xp).toBe(0);
			expect(hero.inventory.level).toBe(1);
		});

		it('should have disabled flags by default', () => {
			expect(hero.flags.canMoveLeft).toBe(false);
			expect(hero.flags.freeMovement).toBe(false);
			expect(hero.flags.hasSword).toBe(false);
			expect(hero.flags.canPushBlock).toBe(false);
		});

		it('should not have active sword', () => {
			expect(hero.sword.active).toBe(false);
		});
	});

	describe('input handling', () => {
		it('should process input and update direction', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(true, false, false, false, false); // Up pressed
			hero.update(1, world);
			expect(hero.direction).toBe(Direction.Up);
		});

		it('should not move left without flag', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(false, false, true, false, false);
			hero.update(1, world);

			expect(hero.isMoving()).toBe(false);
		});

		it('should move left with flag', () => {
			hero.setGridPosition(5, 5);
			hero.unlockLeftMovement();
			hero.setInput(false, false, true, false, false);
			hero.update(1, world);

			expect(hero.direction).toBe(Direction.Left);
			expect(hero.isMoving()).toBe(true);
		});

		it('should move right without special flag', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			expect(hero.direction).toBe(Direction.Right);
			expect(hero.isMoving()).toBe(true);
		});

		it('should move up without special flag', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(true, false, false, false, false);
			hero.update(1, world);

			expect(hero.direction).toBe(Direction.Up);
			expect(hero.isMoving()).toBe(true);
		});

		it('should move down without special flag', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(false, true, false, false, false);
			hero.update(1, world);

			expect(hero.direction).toBe(Direction.Down);
			expect(hero.isMoving()).toBe(true);
		});
	});

	describe('grid movement', () => {
		it('should move tile by tile', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			// Hero should be moving towards tile 6, 5
			expect(hero.isMoving()).toBe(true);
		});

		it('should not move if already moving', () => {
			hero.setGridPosition(5, 5);
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			// Try to change direction while moving
			hero.setInput(true, false, false, false, false);
			hero.update(1, world);

			// Should still be moving right
			expect(hero.direction).toBe(Direction.Right);
		});

		it('should stop animation when not moving', () => {
			hero.setGridPosition(5, 5);
			hero.animation.playing = true;

			// No input
			hero.setInput(false, false, false, false, false);
			hero.update(1, world);

			expect(hero.animation.playing).toBe(false);
		});

		it('should be blocked by solid tiles', () => {
			hero.setGridPosition(5, 5);
			world.setTile(6, 5, Block.Tree);

			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			expect(hero.isMoving()).toBe(false);
			expect(hero.direction).toBe(Direction.Right);
		});
	});

	describe('free movement', () => {
		beforeEach(() => {
			hero.unlockFreeMovement();
			hero.setPosition(5 * TILE_SIZE, 5 * TILE_SIZE);
		});

		it('should move in small increments', () => {
			const startX = hero.x;
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			expect(hero.x).toBeGreaterThan(startX);
		});

		it('should allow diagonal movement', () => {
			const startX = hero.x;
			const startY = hero.y;

			hero.setInput(false, true, false, true, false); // Down + Right
			hero.update(1, world);

			expect(hero.x).toBeGreaterThan(startX);
			expect(hero.y).toBeGreaterThan(startY);
		});

		it('should normalize diagonal speed', () => {
			const startPos = { x: hero.x, y: hero.y };

			// Move right only
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);
			const rightDistance = hero.x - startPos.x;

			// Reset
			hero.setPosition(startPos.x, startPos.y);

			// Move diagonally
			hero.setInput(false, true, false, true, false);
			hero.update(1, world);
			const diagX = hero.x - startPos.x;
			const diagY = hero.y - startPos.y;
			const diagDistance = Math.sqrt(diagX * diagX + diagY * diagY);

			// Diagonal distance should be similar to straight distance
			expect(diagDistance).toBeCloseTo(rightDistance, 0);
		});

		it('should collide with walls', () => {
			hero.setPosition(5 * TILE_SIZE, 5 * TILE_SIZE);
			world.setTile(6, 5, Block.Tree);

			// Move right into tree
			for (let i = 0; i < 20; i++) {
				hero.setInput(false, false, false, true, false);
				hero.update(1, world);
			}

			// Should not have passed through tree
			expect(hero.x).toBeLessThan(6 * TILE_SIZE);
		});
	});

	describe('sword attack', () => {
		beforeEach(() => {
			hero.unlockSword();
		});

		it('should attack when sword unlocked', () => {
			hero.attack();
			expect(hero.sword.active).toBe(true);
			expect(hero.sword.timer).toBe(SWORD_DURATION);
		});

		it('should not attack without sword', () => {
			hero.flags.hasSword = false;
			hero.attack();
			expect(hero.sword.active).toBe(false);
		});

		it('should not attack while already attacking', () => {
			hero.attack();
			hero.sword.timer = 5;
			hero.attack();
			expect(hero.sword.timer).toBe(5); // Should not reset
		});

		it('should deactivate after duration', () => {
			hero.attack();
			hero.update(SWORD_DURATION + 1, world);
			expect(hero.sword.active).toBe(false);
		});

		it('should attack via input', () => {
			hero.setInput(false, false, false, false, true); // Attack pressed
			hero.update(1, world);
			expect(hero.sword.active).toBe(true);
		});

		it('should use current direction for sword', () => {
			hero.direction = Direction.Up;
			hero.attack();
			expect(hero.sword.direction).toBe(Direction.Up);
		});
	});

	describe('sword hitbox', () => {
		beforeEach(() => {
			hero.unlockSword();
			hero.setPosition(100, 100);
		});

		it('should return null when not attacking', () => {
			expect(hero.getSwordHitbox()).toBeNull();
		});

		it('should return hitbox when attacking down', () => {
			hero.direction = Direction.Down;
			hero.attack();

			const hitbox = hero.getSwordHitbox();
			expect(hitbox).not.toBeNull();
			expect(hitbox!.y).toBeGreaterThan(hero.y);
		});

		it('should return hitbox when attacking up', () => {
			hero.direction = Direction.Up;
			hero.attack();

			const hitbox = hero.getSwordHitbox();
			expect(hitbox).not.toBeNull();
			expect(hitbox!.y).toBeLessThan(hero.y);
		});

		it('should return hitbox when attacking right', () => {
			hero.direction = Direction.Right;
			hero.attack();

			const hitbox = hero.getSwordHitbox();
			expect(hitbox).not.toBeNull();
			expect(hitbox!.x).toBeGreaterThan(hero.x);
		});

		it('should return hitbox when attacking left', () => {
			hero.direction = Direction.Left;
			hero.attack();

			const hitbox = hero.getSwordHitbox();
			expect(hitbox).not.toBeNull();
			expect(hitbox!.x).toBeLessThan(hero.x);
		});
	});

	describe('inventory', () => {
		it('should add keys', () => {
			hero.addKey();
			expect(hero.inventory.keys).toBe(1);
			hero.addKey();
			expect(hero.inventory.keys).toBe(2);
		});

		it('should use keys', () => {
			hero.addKey();
			const used = hero.useKey();
			expect(used).toBe(true);
			expect(hero.inventory.keys).toBe(0);
		});

		it('should not use key when empty', () => {
			const used = hero.useKey();
			expect(used).toBe(false);
		});

		it('should add gold', () => {
			hero.addGold(10);
			expect(hero.inventory.gold).toBe(10);
			hero.addGold(25);
			expect(hero.inventory.gold).toBe(35);
		});

		it('should add XP', () => {
			hero.addXP(50);
			expect(hero.inventory.xp).toBe(50);
		});

		it('should level up at 100 XP', () => {
			const leveledUp = hero.addXP(100);
			expect(leveledUp).toBe(true);
			expect(hero.inventory.level).toBe(2);
			expect(hero.inventory.xp).toBe(0);
		});

		it('should carry over excess XP', () => {
			hero.addXP(150);
			expect(hero.inventory.level).toBe(2);
			expect(hero.inventory.xp).toBe(50);
		});
	});

	describe('interactions', () => {
		it('should get tile in front', () => {
			hero.setGridPosition(5, 5);
			hero.direction = Direction.Right;

			const front = hero.getTileInFront();
			expect(front).toEqual({ x: 6, y: 5 });
		});

		it('should detect facing lock', () => {
			hero.setGridPosition(5, 5);
			hero.direction = Direction.Right;
			world.setTile(6, 5, Block.Lock);

			expect(hero.isFacingLock(world)).toBe(true);
		});

		it('should unlock door with key', () => {
			hero.setGridPosition(5, 5);
			hero.direction = Direction.Right;
			world.setTile(6, 5, Block.Lock);
			hero.addKey();

			const unlocked = hero.tryUnlock(world);
			expect(unlocked).toBe(true);
			expect(hero.inventory.keys).toBe(0);
			expect(world.getTile(6, 5)).toBe(Block.DungeonSoil);
		});

		it('should not unlock without key', () => {
			hero.setGridPosition(5, 5);
			hero.direction = Direction.Right;
			world.setTile(6, 5, Block.Lock);

			const unlocked = hero.tryUnlock(world);
			expect(unlocked).toBe(false);
			expect(world.getTile(6, 5)).toBe(Block.Lock);
		});
	});

	describe('push block', () => {
		beforeEach(() => {
			hero.unlockPushBlock();
			hero.setGridPosition(5, 5);
			hero.direction = Direction.Right;
			world.setTile(6, 5, Block.DungeonPuzzle);
			world.setTile(7, 5, Block.DungeonSoil);
		});

		it('should increment push counter when pushing', () => {
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			expect(hero.pushCounter).toBeGreaterThan(0);
		});

		it('should push block after threshold', () => {
			hero.setInput(false, false, false, true, false);

			for (let i = 0; i < Hero.PUSH_THRESHOLD + 1; i++) {
				hero.update(1, world);
			}

			expect(world.getTile(6, 5)).toBe(Block.DungeonSoil);
			expect(world.getTile(7, 5)).toBe(Block.DungeonPuzzle);
		});

		it('should not push if blocked behind', () => {
			world.setTile(7, 5, Block.DungeonWall);

			hero.setInput(false, false, false, true, false);

			for (let i = 0; i < Hero.PUSH_THRESHOLD + 5; i++) {
				hero.update(1, world);
			}

			expect(world.getTile(6, 5)).toBe(Block.DungeonPuzzle);
		});

		it('should reset counter when not pushing', () => {
			hero.setInput(false, false, false, true, false);
			hero.update(1, world);

			hero.setInput(false, false, false, false, false);
			hero.update(1, world);

			expect(hero.pushCounter).toBe(0);
		});
	});

	describe('progression unlocks', () => {
		it('should unlock left movement', () => {
			hero.unlockLeftMovement();
			expect(hero.flags.canMoveLeft).toBe(true);
		});

		it('should unlock all directions', () => {
			hero.unlockAllDirections();
			expect(hero.flags.canMoveAll).toBe(true);
			expect(hero.flags.canMoveLeft).toBe(true);
		});

		it('should unlock free movement', () => {
			hero.unlockFreeMovement();
			expect(hero.flags.freeMovement).toBe(true);
			expect(hero.flags.canMoveLeft).toBe(true);
		});

		it('should unlock sword', () => {
			hero.unlockSword();
			expect(hero.flags.hasSword).toBe(true);
		});

		it('should unlock push block', () => {
			hero.unlockPushBlock();
			expect(hero.flags.canPushBlock).toBe(true);
		});
	});

	describe('render kind', () => {
		it('should return Hero for down/left/right', () => {
			hero.direction = Direction.Down;
			expect(hero.getRenderKind()).toBe(EKind.Hero);

			hero.direction = Direction.Left;
			expect(hero.getRenderKind()).toBe(EKind.Hero);

			hero.direction = Direction.Right;
			expect(hero.getRenderKind()).toBe(EKind.Hero);
		});

		it('should return HeroUp for up', () => {
			hero.direction = Direction.Up;
			expect(hero.getRenderKind()).toBe(EKind.HeroUp);
		});
	});

	describe('serialization', () => {
		it('should save state', () => {
			hero.setPosition(150, 200);
			hero.direction = Direction.Left;
			hero.hp = 7;
			hero.inventory.gold = 50;
			hero.flags.hasSword = true;

			const save = hero.toSaveData();

			expect(save.x).toBe(150);
			expect(save.y).toBe(200);
			expect(save.direction).toBe(Direction.Left);
			expect(save.hp).toBe(7);
			expect(save.inventory.gold).toBe(50);
			expect(save.flags.hasSword).toBe(true);
		});

		it('should restore state', () => {
			hero.fromSaveData({
				x: 200,
				y: 300,
				ix: 12,
				iy: 18,
				direction: Direction.Up,
				hp: 5,
				inventory: { keys: 2, gold: 100, xp: 50, level: 3 },
				flags: {
					canMoveLeft: true,
					canMoveAll: true,
					freeMovement: true,
					hasSword: true,
					canPushBlock: true
				}
			});

			expect(hero.x).toBe(200);
			expect(hero.y).toBe(300);
			expect(hero.direction).toBe(Direction.Up);
			expect(hero.hp).toBe(5);
			expect(hero.inventory.keys).toBe(2);
			expect(hero.inventory.gold).toBe(100);
			expect(hero.inventory.level).toBe(3);
			expect(hero.flags.freeMovement).toBe(true);
			expect(hero.flags.hasSword).toBe(true);
		});
	});
});

describe('createHero', () => {
	it('should create hero at position', () => {
		const hero = createHero(100, 200);
		expect(hero.x).toBe(100);
		expect(hero.y).toBe(200);
	});
});

describe('createHeroAtGrid', () => {
	it('should create hero at grid position', () => {
		const hero = createHeroAtGrid(5, 10);
		expect(hero.ix).toBe(5);
		expect(hero.iy).toBe(10);
		expect(hero.x).toBe(5 * TILE_SIZE);
		expect(hero.y).toBe(10 * TILE_SIZE);
	});
});
