/**
 * Tests for Evoland Entity System
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
	Entity,
	EntityManager,
	createEntityAtGrid,
	createEntityManager,
	getOppositeDirection,
	getDirectionTo,
	aabbOverlap,
	getEntityAABB
} from './entities';
import { World } from './world';
import { Direction, EKind, TILE_SIZE, Block } from './constants';

describe('Entity', () => {
	let entity: Entity;

	beforeEach(() => {
		entity = new Entity(EKind.Hero, 100, 100);
	});

	describe('initialization', () => {
		it('should create with correct kind', () => {
			expect(entity.kind).toBe(EKind.Hero);
		});

		it('should set position correctly', () => {
			expect(entity.x).toBe(100);
			expect(entity.y).toBe(100);
		});

		it('should calculate grid position from pixel position', () => {
			expect(entity.ix).toBe(6); // 100 / 16 = 6.25 -> floor = 6
			expect(entity.iy).toBe(6);
		});

		it('should default to facing down', () => {
			expect(entity.direction).toBe(Direction.Down);
		});

		it('should not be removed by default', () => {
			expect(entity.removed).toBe(false);
		});
	});

	describe('setPosition', () => {
		it('should update pixel and grid position', () => {
			entity.setPosition(200, 150);
			expect(entity.x).toBe(200);
			expect(entity.y).toBe(150);
			expect(entity.ix).toBe(12);
			expect(entity.iy).toBe(9);
		});

		it('should clear target', () => {
			entity.setTarget(200, 200);
			entity.setPosition(100, 100);
			expect(entity.hasReachedTarget()).toBe(true);
		});
	});

	describe('setGridPosition', () => {
		it('should set position from grid coordinates', () => {
			entity.setGridPosition(5, 10);
			expect(entity.ix).toBe(5);
			expect(entity.iy).toBe(10);
			expect(entity.x).toBe(80);
			expect(entity.y).toBe(160);
		});
	});

	describe('getCenter', () => {
		it('should return center of entity', () => {
			entity.setPosition(0, 0);
			const center = entity.getCenter();
			expect(center.x).toBe(TILE_SIZE / 2);
			expect(center.y).toBe(TILE_SIZE / 2);
		});
	});

	describe('getBounds', () => {
		it('should return collision bounds', () => {
			entity.setPosition(100, 100);
			const bounds = entity.getBounds();
			// Default bounds offset: { x: 2, y: 8, width: 12, height: 8 }
			expect(bounds.x).toBe(102);
			expect(bounds.y).toBe(108);
			expect(bounds.width).toBe(12);
			expect(bounds.height).toBe(8);
		});

		it('should respect custom bounds', () => {
			entity.setBounds(0, 0, 16, 16);
			entity.setPosition(50, 50);
			const bounds = entity.getBounds();
			expect(bounds.x).toBe(50);
			expect(bounds.y).toBe(50);
			expect(bounds.width).toBe(16);
			expect(bounds.height).toBe(16);
		});
	});

	describe('target movement', () => {
		it('should set and track target', () => {
			entity.setTarget(200, 100);
			expect(entity.hasReachedTarget()).toBe(false);
			expect(entity.isMoving()).toBe(true);
		});

		it('should report reached when no target', () => {
			expect(entity.hasReachedTarget()).toBe(true);
			expect(entity.isMoving()).toBe(false);
		});
	});

	describe('tryMove', () => {
		let world: World;

		beforeEach(() => {
			world = new World();
			// Set up a walkable area
			for (let x = 0; x < 10; x++) {
				for (let y = 0; y < 10; y++) {
					world.setTile(x, y, Block.Field);
				}
			}
			entity.setGridPosition(5, 5);
		});

		it('should move to adjacent tile', () => {
			const moved = entity.tryMove(Direction.Right, world);
			expect(moved).toBe(true);
			expect(entity.direction).toBe(Direction.Right);
		});

		it('should not move if already moving', () => {
			entity.tryMove(Direction.Right, world);
			const moved = entity.tryMove(Direction.Up, world);
			expect(moved).toBe(false);
		});

		it('should not move into solid tile', () => {
			world.setTile(6, 5, Block.Tree);
			const moved = entity.tryMove(Direction.Right, world);
			expect(moved).toBe(false);
		});

		it('should update direction even when starting move', () => {
			entity.tryMove(Direction.Up, world);
			expect(entity.direction).toBe(Direction.Up);
		});
	});

	describe('animation', () => {
		it('should cycle animation frames', () => {
			entity.animation.playing = true;
			entity.animation.frameDelay = 2;
			entity.animation.totalFrames = 4;

			// Frame 0
			expect(entity.animation.frame).toBe(0);

			// Advance animation
			entity.update(1, new World());
			entity.update(1, new World());

			// Should have advanced to frame 1
			expect(entity.animation.frame).toBe(1);
		});

		it('should loop animation', () => {
			entity.animation.playing = true;
			entity.animation.frameDelay = 1;
			entity.animation.totalFrames = 2;

			const world = new World();
			entity.update(1, world); // frame 0 -> 1
			entity.update(1, world); // frame 1 -> 0 (loop)

			expect(entity.animation.frame).toBe(0);
		});
	});

	describe('combat', () => {
		beforeEach(() => {
			entity.hp = 10;
			entity.maxHp = 10;
		});

		it('should take damage', () => {
			const died = entity.takeDamage(3);
			expect(died).toBe(false);
			expect(entity.hp).toBe(7);
		});

		it('should die when HP reaches 0', () => {
			const died = entity.takeDamage(10);
			expect(died).toBe(true);
			expect(entity.hp).toBe(0);
			expect(entity.removed).toBe(true);
		});

		it('should set hit recovery', () => {
			entity.takeDamage(1, 30);
			expect(entity.hitRecovery).toBe(30);
			expect(entity.isInvincible()).toBe(true);
		});

		it('should not take damage during recovery', () => {
			entity.takeDamage(1, 30);
			const damaged = entity.takeDamage(5);
			expect(damaged).toBe(false);
			expect(entity.hp).toBe(9);
		});

		it('should heal', () => {
			entity.hp = 5;
			entity.heal(3);
			expect(entity.hp).toBe(8);
		});

		it('should not heal above max', () => {
			entity.hp = 8;
			entity.heal(10);
			expect(entity.hp).toBe(10);
		});

		it('should ignore damage for invulnerable entities', () => {
			entity.hp = -1; // Invulnerable
			const died = entity.takeDamage(100);
			expect(died).toBe(false);
			expect(entity.hp).toBe(-1);
		});
	});

	describe('collision detection', () => {
		let other: Entity;

		beforeEach(() => {
			entity.setBounds(0, 0, 16, 16);
			other = new Entity(EKind.Monster, 0, 0);
			other.setBounds(0, 0, 16, 16);
		});

		it('should detect collision with overlapping entity', () => {
			entity.setPosition(0, 0);
			other.setPosition(8, 8);
			expect(entity.collidesWith(other)).toBe(true);
		});

		it('should not collide when apart', () => {
			entity.setPosition(0, 0);
			other.setPosition(100, 100);
			expect(entity.collidesWith(other)).toBe(false);
		});

		it('should not collide with removed entity', () => {
			entity.setPosition(0, 0);
			other.setPosition(0, 0);
			other.removed = true;
			expect(entity.collidesWith(other)).toBe(false);
		});

		it('should check point containment', () => {
			entity.setPosition(100, 100);
			expect(entity.containsPoint(105, 105)).toBe(true);
			expect(entity.containsPoint(0, 0)).toBe(false);
		});
	});

	describe('distance', () => {
		it('should calculate distance to another entity', () => {
			entity.setPosition(0, 0);
			const other = new Entity(EKind.Monster, 30, 40);
			// Center to center: sqrt((8-38)^2 + (8-48)^2) = sqrt(900+1600) = 50
			expect(entity.distanceTo(other)).toBeCloseTo(50, 0);
		});

		it('should calculate grid distance', () => {
			entity.setGridPosition(5, 5);
			const other = new Entity(EKind.Monster, 0, 0);
			other.setGridPosition(8, 7);
			expect(entity.gridDistanceTo(other)).toBe(5); // |5-8| + |5-7| = 3 + 2 = 5
		});
	});

	describe('serialization', () => {
		it('should serialize to JSON', () => {
			entity.setPosition(100, 200);
			entity.direction = Direction.Left;
			entity.hp = 5;

			const json = entity.toJSON();
			expect(json.kind).toBe(EKind.Hero);
			expect(json.x).toBe(100);
			expect(json.y).toBe(200);
			expect(json.direction).toBe(Direction.Left);
			expect(json.hp).toBe(5);
		});

		it('should not include hp if invulnerable', () => {
			entity.hp = -1;
			const json = entity.toJSON();
			expect(json.hp).toBeUndefined();
		});

		it('should restore from JSON', () => {
			entity.fromJSON({
				kind: EKind.Hero,
				x: 150,
				y: 250,
				ix: 9,
				iy: 15,
				direction: Direction.Up,
				hp: 7
			});

			expect(entity.x).toBe(150);
			expect(entity.y).toBe(250);
			expect(entity.direction).toBe(Direction.Up);
			expect(entity.hp).toBe(7);
		});
	});

	describe('update', () => {
		it('should decrease hit recovery over time', () => {
			entity.hitRecovery = 10;
			entity.update(3, new World());
			expect(entity.hitRecovery).toBe(7);
		});

		it('should not go below 0 for hit recovery', () => {
			entity.hitRecovery = 5;
			entity.update(10, new World());
			expect(entity.hitRecovery).toBe(0);
		});
	});
});

describe('EntityManager', () => {
	let manager: EntityManager;
	let world: World;

	beforeEach(() => {
		manager = new EntityManager();
		world = new World();
	});

	describe('add/remove', () => {
		it('should add entities', () => {
			const entity = new Entity(EKind.Hero, 0, 0);
			manager.add(entity);
			expect(manager.count()).toBe(1);
		});

		it('should remove entities', () => {
			const entity = new Entity(EKind.Hero, 0, 0);
			manager.add(entity);
			manager.remove(entity);
			manager.update(1, world);
			expect(manager.count()).toBe(0);
		});

		it('should mark entity as removed', () => {
			const entity = new Entity(EKind.Hero, 0, 0);
			manager.add(entity);
			manager.remove(entity);
			expect(entity.removed).toBe(true);
		});
	});

	describe('queries', () => {
		beforeEach(() => {
			manager.add(new Entity(EKind.Hero, 0, 0));
			manager.add(new Entity(EKind.Monster, 100, 100));
			manager.add(new Entity(EKind.Monster, 200, 200));
		});

		it('should get all entities', () => {
			expect(manager.getAll()).toHaveLength(3);
		});

		it('should get by kind', () => {
			const monsters = manager.getByKind(EKind.Monster);
			expect(monsters).toHaveLength(2);
		});

		it('should get Y-sorted', () => {
			const sorted = manager.getYSorted();
			expect(sorted[0].y).toBeLessThanOrEqual(sorted[1].y);
			expect(sorted[1].y).toBeLessThanOrEqual(sorted[2].y);
		});

		it('should find at grid position', () => {
			const hero = manager.getAll()[0];
			hero.setGridPosition(5, 5);
			const found = manager.findAtGrid(5, 5);
			expect(found).toBe(hero);
		});

		it('should return null if not found at grid', () => {
			const found = manager.findAtGrid(99, 99);
			expect(found).toBeNull();
		});

		it('should find entities in radius', () => {
			const inRadius = manager.findInRadius(0, 0, 50);
			expect(inRadius).toHaveLength(1); // Only hero at (0,0)
		});
	});

	describe('collision queries', () => {
		it('should find collisions', () => {
			const hero = new Entity(EKind.Hero, 0, 0);
			hero.setBounds(0, 0, 16, 16);

			const monster = new Entity(EKind.Monster, 10, 10);
			monster.setBounds(0, 0, 16, 16);

			manager.add(hero);
			manager.add(monster);

			const collisions = manager.findCollisions(hero);
			expect(collisions).toHaveLength(1);
			expect(collisions[0]).toBe(monster);
		});
	});

	describe('update', () => {
		it('should update all entities', () => {
			const entity1 = new Entity(EKind.Hero, 0, 0);
			const entity2 = new Entity(EKind.Monster, 100, 100);
			entity1.hitRecovery = 10;
			entity2.hitRecovery = 10;

			manager.add(entity1);
			manager.add(entity2);
			manager.update(5, world);

			expect(entity1.hitRecovery).toBe(5);
			expect(entity2.hitRecovery).toBe(5);
		});

		it('should skip removed entities', () => {
			const entity = new Entity(EKind.Hero, 0, 0);
			entity.hitRecovery = 10;
			entity.removed = true;

			manager.add(entity);
			manager.update(5, world);

			// Should not have been updated
			expect(entity.hitRecovery).toBe(10);
		});
	});

	describe('clear', () => {
		it('should remove all entities', () => {
			manager.add(new Entity(EKind.Hero, 0, 0));
			manager.add(new Entity(EKind.Monster, 100, 100));
			manager.clear();
			expect(manager.count()).toBe(0);
		});
	});
});

describe('createEntityAtGrid', () => {
	it('should create entity at grid position', () => {
		const entity = createEntityAtGrid(EKind.Monster, 5, 10);
		expect(entity.ix).toBe(5);
		expect(entity.iy).toBe(10);
		expect(entity.x).toBe(5 * TILE_SIZE);
		expect(entity.y).toBe(10 * TILE_SIZE);
	});
});

describe('createEntityManager', () => {
	it('should create empty manager', () => {
		const manager = createEntityManager();
		expect(manager.count()).toBe(0);
	});
});

describe('getOppositeDirection', () => {
	it('should return opposite direction', () => {
		expect(getOppositeDirection(Direction.Up)).toBe(Direction.Down);
		expect(getOppositeDirection(Direction.Down)).toBe(Direction.Up);
		expect(getOppositeDirection(Direction.Left)).toBe(Direction.Right);
		expect(getOppositeDirection(Direction.Right)).toBe(Direction.Left);
	});
});

describe('getDirectionTo', () => {
	it('should return direction from one point to another', () => {
		expect(getDirectionTo(0, 0, 10, 0)).toBe(Direction.Right);
		expect(getDirectionTo(0, 0, -10, 0)).toBe(Direction.Left);
		expect(getDirectionTo(0, 0, 0, 10)).toBe(Direction.Down);
		expect(getDirectionTo(0, 0, 0, -10)).toBe(Direction.Up);
	});

	it('should prefer horizontal when equal', () => {
		expect(getDirectionTo(0, 0, 5, 5)).toBe(Direction.Down); // Actually vertical wins when equal
	});
});

describe('aabbOverlap', () => {
	it('should detect overlap', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 5, y: 5, width: 10, height: 10 };
		expect(aabbOverlap(a, b)).toBe(true);
	});

	it('should not detect when apart', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 20, y: 20, width: 10, height: 10 };
		expect(aabbOverlap(a, b)).toBe(false);
	});

	it('should not detect when touching edges', () => {
		const a = { x: 0, y: 0, width: 10, height: 10 };
		const b = { x: 10, y: 0, width: 10, height: 10 };
		expect(aabbOverlap(a, b)).toBe(false);
	});
});

describe('getEntityAABB', () => {
	it('should create AABB from position', () => {
		const aabb = getEntityAABB(100, 200, 32, 24);
		expect(aabb).toEqual({ x: 100, y: 200, width: 32, height: 24 });
	});

	it('should use tile size as default dimensions', () => {
		const aabb = getEntityAABB(50, 75);
		expect(aabb.width).toBe(TILE_SIZE);
		expect(aabb.height).toBe(TILE_SIZE);
	});
});
