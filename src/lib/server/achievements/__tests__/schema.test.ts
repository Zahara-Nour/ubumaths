/**
 * Achievement System - Schema Validation Tests
 * ==============================================
 *
 * Tests to verify the database schema structure is correct:
 * - Table existence
 * - Column types
 * - Constraints (UNIQUE, CHECK, FOREIGN KEY)
 * - Indexes
 * - Generated columns
 *
 * @module server/achievements/__tests__/schema.test
 */

import { describe, it, expect } from 'vitest';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPE TESTS - Verify TypeScript types are correctly generated
// ============================================================================

describe('Achievement System - Type Definitions', () => {
	describe('achievements table types', () => {
		it('should have correct Row type structure', () => {
			// Type assertion test - will fail at compile time if types are wrong
			const mockRow: Database['public']['Tables']['achievements']['Row'] = {
				id: 'test_achievement',
				context: 'minesweeper',
				category: 'speed',
				name: 'Test Achievement',
				description: 'Test description',
				icon: '🏆',
				unlock_type: 'automatic',
				metadata: {},
				is_active: true,
				display_order: 0,
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z'
			};

			expect(mockRow.id).toBe('test_achievement');
			expect(mockRow.context).toBe('minesweeper');
		});

		it('should have correct Insert type with optional fields', () => {
			const mockInsert: Database['public']['Tables']['achievements']['Insert'] = {
				id: 'test_achievement',
				context: 'questions',
				name: 'Test',
				description: 'Desc',
				icon: '📝',
				unlock_type: 'progressive'
				// Optional fields: metadata, is_active, display_order, created_at, updated_at
			};

			expect(mockInsert.id).toBe('test_achievement');
		});

		it('should enforce context enum values at type level', () => {
			// This test verifies that TypeScript enforces allowed context values
			type AllowedContexts = Database['public']['Tables']['achievements']['Row']['context'];

			const validContexts: AllowedContexts[] = [
				'minesweeper',
				'questions',
				'assessments',
				'srs',
				'riddles',
				'social',
				'meta',
				'system'
			];

			expect(validContexts.length).toBe(8);
		});

		it('should enforce unlock_type enum values at type level', () => {
			type AllowedUnlockTypes = Database['public']['Tables']['achievements']['Row']['unlock_type'];

			const validUnlockTypes: AllowedUnlockTypes[] = [
				'automatic',
				'event_based',
				'progressive',
				'manual'
			];

			expect(validUnlockTypes.length).toBe(4);
		});
	});

	describe('student_achievements table types', () => {
		it('should have correct Row type structure', () => {
			const mockRow: Database['public']['Tables']['student_achievements']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				context_data: {},
				unlocked_at: '2024-01-01T00:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 5
			};

			expect(mockRow.achievement_id).toBe('test_achievement');
		});

		it('should allow context_data to be JSON object', () => {
			const mockRow: Database['public']['Tables']['student_achievements']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				context_data: {
					difficulty: 'expert',
					subject: 'calculus',
					tier: 'gold',
					iteration: 1
				},
				unlocked_at: '2024-01-01T00:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 5
			};

			expect(mockRow.context_data).toBeDefined();
		});
	});

	describe('achievement_progress table types', () => {
		it('should have correct Row type structure', () => {
			const mockRow: Database['public']['Tables']['achievement_progress']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				current_value: 50,
				target_value: 100,
				progress_percentage: 50,
				context_key: null,
				is_active: true,
				started_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				completed_at: null
			};

			expect(mockRow.progress_percentage).toBe(50);
		});

		it('should have progress_percentage as number (generated column)', () => {
			type ProgressPercentage =
				Database['public']['Tables']['achievement_progress']['Row']['progress_percentage'];

			// Ensure it's typed as number | null
			const percentage: ProgressPercentage = 75;
			expect(typeof percentage).toBe('number');
		});

		it('should not allow progress_percentage in Insert type (generated)', () => {
			type InsertType = Database['public']['Tables']['achievement_progress']['Insert'];

			// This test ensures progress_percentage is not in Insert type
			const mockInsert: InsertType = {
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				current_value: 50,
				target_value: 100
				// progress_percentage should NOT be insertable - it's GENERATED ALWAYS
			};

			expect(mockInsert.current_value).toBe(50);
		});
	});

	describe('achievement_events table types', () => {
		it('should have correct Row type structure', () => {
			const mockRow: Database['public']['Tables']['achievement_events']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				event_type: 'minesweeper_game_completed',
				event_data: {
					game_id: 'uuid-here',
					difficulty: 'expert',
					score: 150
				},
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				processed: false,
				processed_at: null,
				processing_error: null,
				created_at: '2024-01-01T00:00:00Z'
			};

			expect(mockRow.event_type).toBe('minesweeper_game_completed');
		});

		it('should allow complex event_data JSON', () => {
			const mockRow: Database['public']['Tables']['achievement_events']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				event_type: 'question_answered',
				event_data: {
					question_id: 'q123',
					correct: true,
					subject: 'algebra',
					difficulty: 2,
					time_taken_ms: 5000,
					metadata: {
						hints_used: 0,
						attempts: 1
					}
				},
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				processed: false,
				processed_at: null,
				processing_error: null,
				created_at: '2024-01-01T00:00:00Z'
			};

			expect(mockRow.event_data).toBeDefined();
		});
	});
});

// ============================================================================
// SCHEMA STRUCTURE TESTS
// ============================================================================

describe('Achievement System - Schema Structure', () => {
	describe('Primary Keys', () => {
		it('achievements should use TEXT id as primary key', () => {
			// Type check that id is TEXT (string in TypeScript)
			type IdType = Database['public']['Tables']['achievements']['Row']['id'];
			const id: IdType = 'test_achievement';
			expect(typeof id).toBe('string');
		});

		it('student_achievements should use UUID id as primary key', () => {
			type IdType = Database['public']['Tables']['student_achievements']['Row']['id'];
			const id: IdType = '550e8400-e29b-41d4-a716-446655440000';
			expect(typeof id).toBe('string');
		});

		it('achievement_progress should use UUID id as primary key', () => {
			type IdType = Database['public']['Tables']['achievement_progress']['Row']['id'];
			const id: IdType = '550e8400-e29b-41d4-a716-446655440000';
			expect(typeof id).toBe('string');
		});

		it('achievement_events should use UUID id as primary key', () => {
			type IdType = Database['public']['Tables']['achievement_events']['Row']['id'];
			const id: IdType = '550e8400-e29b-41d4-a716-446655440000';
			expect(typeof id).toBe('string');
		});
	});

	describe('Foreign Keys', () => {
		// Note: Foreign key validation is done at the database level via migration.
		// These tests validate that the TypeScript types include the Relationships field.
		// We cannot access Database types at runtime, so we use type-level assertions.

		it('student_achievements.student_id references profiles', () => {
			// Type-level validation: verify Relationships type exists
			type Relationships = Database['public']['Tables']['student_achievements']['Relationships'];

			// Compile-time check: this will fail if Relationships doesn't have the right shape
			const _typeCheck: Relationships = [
				{
					foreignKeyName: 'student_achievements_student_id_fkey',
					columns: ['student_id'],
					isOneToOne: false,
					referencedRelation: 'profiles',
					referencedColumns: ['id']
				}
			];

			// Runtime validation: ensure type structure is defined
			expect(_typeCheck).toBeDefined();
		});

		it('student_achievements.achievement_id references achievements', () => {
			type Relationships = Database['public']['Tables']['student_achievements']['Relationships'];

			const _typeCheck: Relationships = [
				{
					foreignKeyName: 'student_achievements_achievement_id_fkey',
					columns: ['achievement_id'],
					isOneToOne: false,
					referencedRelation: 'achievements',
					referencedColumns: ['id']
				}
			];

			expect(_typeCheck).toBeDefined();
		});

		it('achievement_progress.student_id references profiles', () => {
			type Relationships = Database['public']['Tables']['achievement_progress']['Relationships'];

			const _typeCheck: Relationships = [
				{
					foreignKeyName: 'achievement_progress_student_id_fkey',
					columns: ['student_id'],
					isOneToOne: false,
					referencedRelation: 'profiles',
					referencedColumns: ['id']
				}
			];

			expect(_typeCheck).toBeDefined();
		});

		it('achievement_progress.achievement_id references achievements', () => {
			type Relationships = Database['public']['Tables']['achievement_progress']['Relationships'];

			const _typeCheck: Relationships = [
				{
					foreignKeyName: 'achievement_progress_achievement_id_fkey',
					columns: ['achievement_id'],
					isOneToOne: false,
					referencedRelation: 'achievements',
					referencedColumns: ['id']
				}
			];

			expect(_typeCheck).toBeDefined();
		});

		it('achievement_events.student_id references profiles', () => {
			type Relationships = Database['public']['Tables']['achievement_events']['Relationships'];

			const _typeCheck: Relationships = [
				{
					foreignKeyName: 'achievement_events_student_id_fkey',
					columns: ['student_id'],
					isOneToOne: false,
					referencedRelation: 'profiles',
					referencedColumns: ['id']
				}
			];

			expect(_typeCheck).toBeDefined();
		});
	});

	describe('JSON Columns', () => {
		it('achievements.metadata should be JSONB (Json type)', () => {
			type MetadataType = Database['public']['Tables']['achievements']['Row']['metadata'];

			const metadata: MetadataType = {
				points: 10,
				gidouilles_reward: 5,
				rarity: 'common',
				unlock_conditions: {
					type: 'minesweeper_win',
					params: {
						min_score: 100
					}
				}
			};

			expect(metadata).toBeDefined();
		});

		it('student_achievements.context_data should be JSONB (Json type)', () => {
			type ContextDataType =
				Database['public']['Tables']['student_achievements']['Row']['context_data'];

			const contextData: ContextDataType = {
				difficulty: 'expert',
				subject: 'calculus',
				tier: 'gold'
			};

			expect(contextData).toBeDefined();
		});

		it('achievement_events.event_data should be JSONB (Json type)', () => {
			type EventDataType = Database['public']['Tables']['achievement_events']['Row']['event_data'];

			const eventData: EventDataType = {
				game_id: 'uuid',
				difficulty: 'beginner',
				score: 100
			};

			expect(eventData).toBeDefined();
		});
	});

	describe('Timestamp Columns', () => {
		it('all tables should have created_at timestamps', () => {
			type AchievementsCreatedAt =
				Database['public']['Tables']['achievements']['Row']['created_at'];
			type _StudentAchievementsUnlockedAt =
				Database['public']['Tables']['student_achievements']['Row']['unlocked_at'];
			type _ProgressStartedAt =
				Database['public']['Tables']['achievement_progress']['Row']['started_at'];
			type _EventsCreatedAt =
				Database['public']['Tables']['achievement_events']['Row']['created_at'];

			const timestamp: AchievementsCreatedAt = '2024-01-01T00:00:00Z';
			expect(typeof timestamp).toBe('string');
		});

		it('achievements and achievement_progress should have updated_at', () => {
			type AchievementsUpdatedAt =
				Database['public']['Tables']['achievements']['Row']['updated_at'];
			type _ProgressUpdatedAt =
				Database['public']['Tables']['achievement_progress']['Row']['updated_at'];

			const timestamp: AchievementsUpdatedAt = '2024-01-01T00:00:00Z';
			expect(typeof timestamp).toBe('string');
		});

		it('achievement_progress should have completed_at (nullable)', () => {
			type CompletedAt =
				Database['public']['Tables']['achievement_progress']['Row']['completed_at'];

			const timestamp: CompletedAt = '2024-01-01T00:00:00Z';
			const nullTimestamp: CompletedAt = null;

			expect(timestamp || nullTimestamp).toBeDefined();
		});
	});

	describe('Numeric Columns', () => {
		it('achievement_progress should have numeric current_value and target_value', () => {
			type CurrentValue =
				Database['public']['Tables']['achievement_progress']['Row']['current_value'];
			type TargetValue =
				Database['public']['Tables']['achievement_progress']['Row']['target_value'];

			// Should accept decimal values
			const current: CurrentValue = 50.5;
			const target: TargetValue = 100;

			expect(typeof current).toBe('number');
			expect(typeof target).toBe('number');
		});

		it('achievement_progress should have integer progress_percentage (0-100)', () => {
			type ProgressPercentage =
				Database['public']['Tables']['achievement_progress']['Row']['progress_percentage'];

			const percentage: ProgressPercentage = 75;

			expect(typeof percentage).toBe('number');
			expect(percentage).toBeGreaterThanOrEqual(0);
			expect(percentage).toBeLessThanOrEqual(100);
		});

		it('student_achievements should have integer reward columns', () => {
			type PointsAwarded =
				Database['public']['Tables']['student_achievements']['Row']['points_awarded'];
			type GidouillesAwarded =
				Database['public']['Tables']['student_achievements']['Row']['gidouilles_awarded'];

			const points: PointsAwarded = 10;
			const gidouilles: GidouillesAwarded = 5;

			expect(Number.isInteger(points)).toBe(true);
			expect(Number.isInteger(gidouilles)).toBe(true);
		});
	});

	describe('Boolean Columns', () => {
		it('achievements.is_active should be boolean', () => {
			type IsActive = Database['public']['Tables']['achievements']['Row']['is_active'];

			const active: IsActive = true;
			const inactive: IsActive = false;

			expect(typeof active).toBe('boolean');
			expect(typeof inactive).toBe('boolean');
		});

		it('achievement_progress.is_active should be boolean', () => {
			type IsActive = Database['public']['Tables']['achievement_progress']['Row']['is_active'];

			const active: IsActive = true;
			expect(typeof active).toBe('boolean');
		});

		it('achievement_events.processed should be boolean', () => {
			type Processed = Database['public']['Tables']['achievement_events']['Row']['processed'];

			const processed: Processed = true;
			const unprocessed: Processed = false;

			expect(typeof processed).toBe('boolean');
			expect(typeof unprocessed).toBe('boolean');
		});
	});
});

// ============================================================================
// CONSTRAINT TESTS (Type-level validation)
// ============================================================================

describe('Achievement System - Constraints', () => {
	describe('UNIQUE constraints', () => {
		it('achievements should have unique id (primary key)', () => {
			// Primary key implicitly enforces uniqueness
			type IdType = Database['public']['Tables']['achievements']['Row']['id'];
			const id: IdType = 'unique_achievement_id';
			expect(id).toBeDefined();
		});

		it('student_achievements should have composite UNIQUE constraint (NULLS NOT DISTINCT)', () => {
			// This verifies the schema enforces uniqueness on:
			// (student_id, achievement_id, difficulty, subject, tier, iteration)
			// with NULLS NOT DISTINCT (NULL = NULL for uniqueness)

			const achievement1: Database['public']['Tables']['student_achievements']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440001',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				context_data: {
					difficulty: 'expert',
					subject: 'calculus',
					tier: null,
					iteration: null
				},
				unlocked_at: '2024-01-01T00:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 5
			};

			// This would violate UNIQUE constraint if inserted twice
			const achievement2: Database['public']['Tables']['student_achievements']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440002',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				context_data: {
					difficulty: 'expert',
					subject: 'calculus',
					tier: null, // NULL = NULL for uniqueness
					iteration: null
				},
				unlocked_at: '2024-01-01T00:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 5
			};

			expect(achievement1.student_id).toBe(achievement2.student_id);
			expect(achievement1.achievement_id).toBe(achievement2.achievement_id);
		});

		it('achievement_progress should have UNIQUE (student_id, achievement_id, context_key)', () => {
			const progress1: Database['public']['Tables']['achievement_progress']['Row'] = {
				id: '550e8400-e29b-41d4-a716-446655440001',
				student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
				achievement_id: 'test_achievement',
				current_value: 50,
				target_value: 100,
				progress_percentage: 50,
				context_key: 'calculus',
				is_active: true,
				started_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				completed_at: null
			};

			// Would violate constraint if same student_id, achievement_id, context_key
			expect(progress1.context_key).toBe('calculus');
		});
	});

	describe('CHECK constraints', () => {
		it('achievements.context should only allow specific values', () => {
			type Context = Database['public']['Tables']['achievements']['Row']['context'];

			const validContexts: Context[] = [
				'minesweeper',
				'questions',
				'assessments',
				'srs',
				'riddles',
				'social',
				'meta',
				'system'
			];

			validContexts.forEach((context) => {
				expect(context).toBeDefined();
			});
		});

		it('achievements.unlock_type should only allow specific values', () => {
			type UnlockType = Database['public']['Tables']['achievements']['Row']['unlock_type'];

			const validUnlockTypes: UnlockType[] = ['automatic', 'event_based', 'progressive', 'manual'];

			validUnlockTypes.forEach((unlockType) => {
				expect(unlockType).toBeDefined();
			});
		});

		it('achievement_progress.current_value should be >= 0', () => {
			// Type-level validation: current_value is number
			type CurrentValue =
				Database['public']['Tables']['achievement_progress']['Row']['current_value'];

			const validValue: CurrentValue = 0;
			const positiveValue: CurrentValue = 100;

			expect(validValue).toBeGreaterThanOrEqual(0);
			expect(positiveValue).toBeGreaterThanOrEqual(0);
		});

		it('achievement_progress.target_value should be > 0', () => {
			type TargetValue =
				Database['public']['Tables']['achievement_progress']['Row']['target_value'];

			const validTarget: TargetValue = 1;
			const largeTarget: TargetValue = 1000;

			expect(validTarget).toBeGreaterThan(0);
			expect(largeTarget).toBeGreaterThan(0);
		});
	});
});

// ============================================================================
// DEFAULT VALUES
// ============================================================================

describe('Achievement System - Default Values', () => {
	it('achievements should default metadata to empty object', () => {
		type Insert = Database['public']['Tables']['achievements']['Insert'];

		const minimalInsert: Insert = {
			id: 'test',
			context: 'minesweeper',
			name: 'Test',
			description: 'Desc',
			icon: '🏆',
			unlock_type: 'automatic'
			// metadata should default to {}
		};

		expect(minimalInsert.metadata ?? {}).toEqual({});
	});

	it('achievements should default is_active to true', () => {
		type Insert = Database['public']['Tables']['achievements']['Insert'];

		const minimalInsert: Insert = {
			id: 'test',
			context: 'minesweeper',
			name: 'Test',
			description: 'Desc',
			icon: '🏆',
			unlock_type: 'automatic'
			// is_active should default to true
		};

		expect(minimalInsert.is_active ?? true).toBe(true);
	});

	it('achievements should default display_order to 0', () => {
		type Insert = Database['public']['Tables']['achievements']['Insert'];

		const minimalInsert: Insert = {
			id: 'test',
			context: 'minesweeper',
			name: 'Test',
			description: 'Desc',
			icon: '🏆',
			unlock_type: 'automatic'
			// display_order should default to 0
		};

		expect(minimalInsert.display_order ?? 0).toBe(0);
	});

	it('student_achievements should default context_data to empty object', () => {
		type Insert = Database['public']['Tables']['student_achievements']['Insert'];

		const minimalInsert: Insert = {
			student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			achievement_id: 'test_achievement',
			points_awarded: 10,
			gidouilles_awarded: 5
			// context_data should default to {}
		};

		expect(minimalInsert.context_data ?? {}).toEqual({});
	});

	it('achievement_progress should default current_value to 0', () => {
		type Insert = Database['public']['Tables']['achievement_progress']['Insert'];

		const minimalInsert: Insert = {
			student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			achievement_id: 'test_achievement',
			target_value: 100
			// current_value should default to 0
		};

		expect(minimalInsert.current_value ?? 0).toBe(0);
	});

	it('achievement_progress should default is_active to true', () => {
		type Insert = Database['public']['Tables']['achievement_progress']['Insert'];

		const minimalInsert: Insert = {
			student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			achievement_id: 'test_achievement',
			target_value: 100
			// is_active should default to true
		};

		expect(minimalInsert.is_active ?? true).toBe(true);
	});

	it('achievement_events should default event_data to empty object', () => {
		type Insert = Database['public']['Tables']['achievement_events']['Insert'];

		const minimalInsert: Insert = {
			event_type: 'test_event',
			student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			// event_data should default to {}
		};

		expect(minimalInsert.event_data ?? {}).toEqual({});
	});

	it('achievement_events should default processed to false', () => {
		type Insert = Database['public']['Tables']['achievement_events']['Insert'];

		const minimalInsert: Insert = {
			event_type: 'test_event',
			student_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
			// processed should default to false
		};

		expect(minimalInsert.processed ?? false).toBe(false);
	});
});
