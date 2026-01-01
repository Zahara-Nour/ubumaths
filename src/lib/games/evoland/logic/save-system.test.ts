/**
 * Tests for Evoland Save System
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	SaveSystem,
	createSaveSystem,
	createEmptySaveData,
	validateSaveData,
	formatSaveTimestamp,
	SAVE_VERSION,
	MAX_SAVE_SLOTS,
	type SaveData
} from './save-system';
import { Direction } from './constants';

// Helper type to make all properties mutable (for testing)
type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
type MutableSaveData = Mutable<SaveData>;

// Mock localStorage
const mockStorage: Record<string, string> = {};

const mockLocalStorage = {
	getItem: (key: string) => mockStorage[key] ?? null,
	setItem: (key: string, value: string) => {
		mockStorage[key] = value;
	},
	removeItem: (key: string) => {
		delete mockStorage[key];
	},
	clear: () => {
		Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
	},
	key: (index: number) => Object.keys(mockStorage)[index] ?? null,
	get length() {
		return Object.keys(mockStorage).length;
	}
};

beforeEach(() => {
	// Clear mock storage
	Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

	// Mock global localStorage
	vi.stubGlobal('localStorage', mockLocalStorage);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('SaveSystem', () => {
	let saveSystem: SaveSystem;
	let validSaveData: MutableSaveData;

	beforeEach(() => {
		saveSystem = new SaveSystem();
		validSaveData = createEmptySaveData() as MutableSaveData;
	});

	describe('save', () => {
		it('should save valid data', () => {
			const result = saveSystem.save(0, validSaveData);
			expect(result.success).toBe(true);
		});

		it('should reject invalid slot', () => {
			const result = saveSystem.save(-1, validSaveData);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid save slot');
		});

		it('should reject slot >= MAX_SAVE_SLOTS', () => {
			const result = saveSystem.save(MAX_SAVE_SLOTS, validSaveData);
			expect(result.success).toBe(false);
		});

		it('should add timestamp on save', () => {
			const beforeSave = Date.now();
			saveSystem.save(0, validSaveData);
			const loaded = saveSystem.load(0);
			expect(loaded.success).toBe(true);
			expect(loaded.data?.timestamp).toBeGreaterThanOrEqual(beforeSave);
		});

		it('should set version on save', () => {
			saveSystem.save(0, validSaveData);
			const loaded = saveSystem.load(0);
			expect(loaded.data?.version).toBe(SAVE_VERSION);
		});
	});

	describe('load', () => {
		it('should load saved data', () => {
			validSaveData.progression.gold = 500;
			saveSystem.save(0, validSaveData);

			const result = saveSystem.load(0);
			expect(result.success).toBe(true);
			expect(result.data?.progression.gold).toBe(500);
		});

		it('should fail for empty slot', () => {
			const result = saveSystem.load(0);
			expect(result.success).toBe(false);
			expect(result.error).toContain('No save data found');
		});

		it('should reject invalid slot', () => {
			const result = saveSystem.load(-1);
			expect(result.success).toBe(false);
		});

		it('should reject corrupted data', () => {
			mockStorage['evoland_save_0'] = '{ invalid json }';
			const result = saveSystem.load(0);
			expect(result.success).toBe(false);
		});

		it('should reject invalid data structure', () => {
			mockStorage['evoland_save_0'] = JSON.stringify({ foo: 'bar' });
			const result = saveSystem.load(0);
			expect(result.success).toBe(false);
			expect(result.error).toContain('Corrupted save data');
		});
	});

	describe('delete', () => {
		it('should delete save data', () => {
			saveSystem.save(0, validSaveData);
			expect(saveSystem.hasData(0)).toBe(true);

			const result = saveSystem.delete(0);
			expect(result.success).toBe(true);
			expect(saveSystem.hasData(0)).toBe(false);
		});

		it('should reject invalid slot', () => {
			const result = saveSystem.delete(-1);
			expect(result.success).toBe(false);
		});
	});

	describe('getSlots', () => {
		it('should return empty slots when no saves', () => {
			const slots = saveSystem.getSlots();
			expect(slots).toHaveLength(MAX_SAVE_SLOTS);
			expect(slots.every((s) => !s.exists)).toBe(true);
		});

		it('should return populated slots', () => {
			validSaveData.progression.level = 5;
			saveSystem.save(1, validSaveData);

			const slots = saveSystem.getSlots();
			expect(slots[0].exists).toBe(false);
			expect(slots[1].exists).toBe(true);
			expect(slots[1].level).toBe(5);
		});
	});

	describe('hasData', () => {
		it('should return false for empty slot', () => {
			expect(saveSystem.hasData(0)).toBe(false);
		});

		it('should return true after save', () => {
			saveSystem.save(0, validSaveData);
			expect(saveSystem.hasData(0)).toBe(true);
		});

		it('should return false for invalid slot', () => {
			expect(saveSystem.hasData(-1)).toBe(false);
			expect(saveSystem.hasData(MAX_SAVE_SLOTS)).toBe(false);
		});
	});

	describe('getNewestSlot', () => {
		it('should return null when no saves', () => {
			expect(saveSystem.getNewestSlot()).toBeNull();
		});

		it('should return newest save slot', () => {
			// Use fake timers to control time
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-01T10:00:00'));

			saveSystem.save(0, validSaveData);

			// Advance time and save to another slot
			vi.setSystemTime(new Date('2024-01-01T10:01:00'));
			const newerData = createEmptySaveData();
			saveSystem.save(2, newerData);

			expect(saveSystem.getNewestSlot()).toBe(2);

			vi.useRealTimers();
		});
	});

	describe('clearAll', () => {
		it('should clear all saves', () => {
			saveSystem.save(0, validSaveData);
			saveSystem.save(1, validSaveData);
			saveSystem.save(2, validSaveData);

			saveSystem.clearAll();

			expect(saveSystem.hasData(0)).toBe(false);
			expect(saveSystem.hasData(1)).toBe(false);
			expect(saveSystem.hasData(2)).toBe(false);
		});
	});

	describe('data validation', () => {
		it('should validate progression bounds', () => {
			const invalidData = createEmptySaveData() as MutableSaveData;
			invalidData.progression.level = 1000; // Max is 99

			const result = saveSystem.save(0, invalidData);
			expect(result.success).toBe(false);
		});

		it('should validate hero position bounds', () => {
			const invalidData = createEmptySaveData() as MutableSaveData;
			invalidData.hero.x = -100; // Min is 0

			const result = saveSystem.save(0, invalidData);
			expect(result.success).toBe(false);
		});

		it('should validate color level bounds', () => {
			const invalidData = createEmptySaveData() as MutableSaveData;
			invalidData.progression.flags.colorLevel = 10; // Max is 4

			const result = saveSystem.save(0, invalidData);
			expect(result.success).toBe(false);
		});
	});
});

describe('createSaveSystem', () => {
	it('should create a save system instance', () => {
		const system = createSaveSystem();
		expect(system).toBeInstanceOf(SaveSystem);
	});
});

describe('createEmptySaveData', () => {
	it('should create valid empty save data', () => {
		const data = createEmptySaveData();
		expect(data.version).toBe(SAVE_VERSION);
		expect(data.progression.level).toBe(1);
		expect(data.progression.gold).toBe(0);
		expect(data.hero.direction).toBe(Direction.Down);
	});

	it('should have current timestamp', () => {
		const before = Date.now();
		const data = createEmptySaveData();
		const after = Date.now();
		expect(data.timestamp).toBeGreaterThanOrEqual(before);
		expect(data.timestamp).toBeLessThanOrEqual(after);
	});
});

describe('validateSaveData', () => {
	it('should validate correct data', () => {
		const data = createEmptySaveData();
		expect(validateSaveData(data)).toBe(true);
	});

	it('should reject invalid data', () => {
		expect(validateSaveData({})).toBe(false);
		expect(validateSaveData(null)).toBe(false);
		expect(validateSaveData({ version: 'invalid' })).toBe(false);
	});

	it('should reject data with missing fields', () => {
		const incomplete = {
			version: 1,
			timestamp: Date.now()
			// Missing other fields
		};
		expect(validateSaveData(incomplete)).toBe(false);
	});
});

describe('formatSaveTimestamp', () => {
	it('should format timestamp', () => {
		const timestamp = new Date('2024-01-15T10:30:00').getTime();
		const formatted = formatSaveTimestamp(timestamp);
		expect(formatted).toContain('2024');
	});
});
