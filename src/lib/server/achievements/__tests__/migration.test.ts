/**
 * Achievement System - Migration Verification Tests
 * ===================================================
 *
 * Tests to verify the migration file exists and contains required components:
 * - Migration file exists with correct naming
 * - All tables are created
 * - All indexes are created
 * - All RLS policies are created
 * - All SQL functions are created
 * - Sample achievements are inserted
 *
 * @module server/achievements/__tests__/migration.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const MIGRATION_FILE = '20251121000000_create_universal_achievements_system.sql';
const MIGRATION_PATH = join(MIGRATIONS_DIR, MIGRATION_FILE);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMigrationContent(): string {
	if (!existsSync(MIGRATION_PATH)) {
		throw new Error(`Migration file not found: ${MIGRATION_PATH}`);
	}
	return readFileSync(MIGRATION_PATH, 'utf-8');
}

function assertContains(content: string, pattern: string | RegExp, message?: string) {
	const isRegex = pattern instanceof RegExp;
	const found = isRegex ? pattern.test(content) : content.includes(pattern);

	if (!found) {
		const patternStr = isRegex ? pattern.source : pattern;
		throw new Error(message || `Expected migration to contain: ${patternStr}`);
	}
}

// ============================================================================
// TESTS: Migration File Existence
// ============================================================================

describe('Migration File Existence', () => {
	it('should have migration file with correct timestamp and name', () => {
		expect(existsSync(MIGRATION_PATH)).toBe(true);
	});

	it('should have migration file in correct directory', () => {
		expect(existsSync(MIGRATIONS_DIR)).toBe(true);
	});

	it('should be a SQL file', () => {
		expect(MIGRATION_FILE.endsWith('.sql')).toBe(true);
	});

	it('should follow migration naming convention', () => {
		// Format: YYYYMMDDHHMMSS_description.sql
		const filenameRegex = /^\d{14}_[a-z_]+\.sql$/;
		expect(filenameRegex.test(MIGRATION_FILE)).toBe(true);
	});
});

// ============================================================================
// TESTS: Table Creation
// ============================================================================

describe('Table Creation', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should create achievements table', () => {
		assertContains(content, /CREATE TABLE.*public\.achievements/i);
	});

	it('should create student_achievements table', () => {
		assertContains(content, /CREATE TABLE.*public\.student_achievements/i);
	});

	it('should create achievement_progress table', () => {
		assertContains(content, /CREATE TABLE.*public\.achievement_progress/i);
	});

	it('should create achievement_events table', () => {
		assertContains(content, /CREATE TABLE.*public\.achievement_events/i);
	});

	it('should use IF NOT EXISTS for all tables', () => {
		const ifNotExistsCount = (content.match(/CREATE TABLE IF NOT EXISTS/gi) || []).length;
		expect(ifNotExistsCount).toBeGreaterThanOrEqual(4);
	});
});

// ============================================================================
// TESTS: Column Definitions
// ============================================================================

describe('Column Definitions', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	describe('achievements table columns', () => {
		it('should have id TEXT PRIMARY KEY', () => {
			assertContains(content, /id TEXT PRIMARY KEY/i);
		});

		it('should have context with CHECK constraint', () => {
			assertContains(content, /context TEXT NOT NULL CHECK/i);
			assertContains(content, /minesweeper.*questions.*assessments.*srs.*riddles.*social/i);
		});

		it('should have unlock_type with CHECK constraint', () => {
			assertContains(content, /unlock_type TEXT NOT NULL CHECK/i);
			assertContains(content, /automatic.*event_based.*progressive.*manual/i);
		});

		it('should have metadata JSONB with default', () => {
			assertContains(content, /metadata JSONB NOT NULL DEFAULT/i);
		});

		it('should have is_active boolean with default true', () => {
			assertContains(content, /is_active BOOLEAN NOT NULL DEFAULT true/i);
		});
	});

	describe('student_achievements table columns', () => {
		it('should have UUID primary key', () => {
			assertContains(content, /id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/i);
		});

		it('should have student_id foreign key to profiles', () => {
			assertContains(content, /student_id UUID NOT NULL REFERENCES public\.profiles/i);
		});

		it('should have achievement_id foreign key to achievements', () => {
			assertContains(content, /achievement_id TEXT NOT NULL REFERENCES public\.achievements/i);
		});

		it('should have context_data JSONB', () => {
			assertContains(content, /context_data JSONB DEFAULT/i);
		});

		it('should have unlocked_by nullable UUID', () => {
			assertContains(content, /unlocked_by UUID REFERENCES public\.profiles/i);
		});

		it('should have points_awarded and gidouilles_awarded integers', () => {
			assertContains(content, /points_awarded INTEGER NOT NULL DEFAULT 0/i);
			assertContains(content, /gidouilles_awarded INTEGER NOT NULL DEFAULT 0/i);
		});
	});

	describe('achievement_progress table columns', () => {
		it('should have current_value with CHECK >= 0', () => {
			assertContains(content, /current_value NUMERIC NOT NULL DEFAULT 0 CHECK.*>= 0/i);
		});

		it('should have target_value with CHECK > 0', () => {
			assertContains(content, /target_value NUMERIC NOT NULL CHECK.*> 0/i);
		});

		it('should have progress_percentage as GENERATED ALWAYS', () => {
			assertContains(content, /progress_percentage INTEGER GENERATED ALWAYS AS/i);
		});

		it('should have context_key TEXT (nullable)', () => {
			assertContains(content, /context_key TEXT/i);
		});

		it('should have completed_at nullable timestamp', () => {
			assertContains(content, /completed_at TIMESTAMPTZ/i);
		});
	});

	describe('achievement_events table columns', () => {
		it('should have event_type TEXT', () => {
			assertContains(content, /event_type TEXT NOT NULL/i);
		});

		it('should have event_data JSONB', () => {
			assertContains(content, /event_data JSONB NOT NULL DEFAULT/i);
		});

		it('should have processed boolean with default false', () => {
			assertContains(content, /processed BOOLEAN NOT NULL DEFAULT false/i);
		});

		it('should have processing_error TEXT (nullable)', () => {
			assertContains(content, /processing_error TEXT/i);
		});
	});
});

// ============================================================================
// TESTS: Constraints
// ============================================================================

describe('Constraints', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should have UNIQUE constraint on student_achievements with NULLS NOT DISTINCT', () => {
		assertContains(content, /CONSTRAINT unique_student_achievement UNIQUE NULLS NOT DISTINCT/i);
	});

	it('should have UNIQUE constraint on achievement_progress', () => {
		assertContains(
			content,
			/CONSTRAINT unique_achievement_progress UNIQUE.*student_id.*achievement_id.*context_key/i
		);
	});

	it('should have ON DELETE CASCADE for foreign keys', () => {
		const cascadeCount = (content.match(/ON DELETE CASCADE/gi) || []).length;
		expect(cascadeCount).toBeGreaterThanOrEqual(4); // Multiple foreign keys
	});
});

// ============================================================================
// TESTS: Indexes
// ============================================================================

describe('Indexes', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	describe('achievements table indexes', () => {
		it('should have index on context with WHERE is_active = true', () => {
			assertContains(content, /CREATE INDEX.*idx_achievements_context.*ON.*achievements.*context/i);
			assertContains(content, /WHERE is_active = true/i);
		});

		it('should have index on category', () => {
			assertContains(content, /CREATE INDEX.*idx_achievements_category/i);
		});

		it('should have index on display_order', () => {
			assertContains(content, /CREATE INDEX.*idx_achievements_display_order/i);
		});

		it('should have GIN index on metadata', () => {
			assertContains(content, /CREATE INDEX.*idx_achievements_metadata_gin.*USING GIN.*metadata/i);
		});
	});

	describe('student_achievements table indexes', () => {
		it('should have index on student_id', () => {
			assertContains(content, /CREATE INDEX.*idx_student_achievements_student.*student_id/i);
		});

		it('should have index on achievement_id', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_student_achievements_achievement.*achievement_id/i
			);
		});

		it('should have index on (student_id, unlocked_at DESC)', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_student_achievements_unlocked.*student_id.*unlocked_at DESC/i
			);
		});

		it('should have GIN index on context_data', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_student_achievements_context_gin.*USING GIN.*context_data/i
			);
		});
	});

	describe('achievement_progress table indexes', () => {
		it('should have index on student_id with WHERE is_active = true', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_progress_student.*student_id.*WHERE is_active = true/i
			);
		});

		it('should have index on achievement_id with WHERE is_active = true', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_progress_achievement.*achievement_id.*WHERE is_active = true/i
			);
		});

		it('should have index on incomplete progress', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_progress_incomplete.*WHERE.*progress_percentage < 100/i
			);
		});
	});

	describe('achievement_events table indexes', () => {
		it('should have index on unprocessed events', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_events_unprocessed.*WHERE processed = false/i
			);
		});

		it('should have index on (student_id, event_type)', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_events_student.*student_id.*event_type/i
			);
		});

		it('should have index on (event_type, created_at DESC)', () => {
			assertContains(
				content,
				/CREATE INDEX.*idx_achievement_events_type.*event_type.*created_at DESC/i
			);
		});
	});
});

// ============================================================================
// TESTS: RLS Policies
// ============================================================================

describe('RLS Policies', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should enable RLS on all tables', () => {
		assertContains(content, /ALTER TABLE public\.achievements ENABLE ROW LEVEL SECURITY/i);
		assertContains(content, /ALTER TABLE public\.student_achievements ENABLE ROW LEVEL SECURITY/i);
		assertContains(content, /ALTER TABLE public\.achievement_progress ENABLE ROW LEVEL SECURITY/i);
		assertContains(content, /ALTER TABLE public\.achievement_events ENABLE ROW LEVEL SECURITY/i);
	});

	describe('achievements table policies', () => {
		it('should allow anyone to view active achievements', () => {
			assertContains(content, /CREATE POLICY.*Anyone can view active achievements/i);
			assertContains(content, /ON public\.achievements FOR SELECT/i);
		});

		it('should allow admins to manage achievements', () => {
			assertContains(content, /CREATE POLICY.*Admins can manage achievements/i);
			assertContains(content, /role = 'admin'/i);
		});
	});

	describe('student_achievements table policies', () => {
		it('should allow students to view their own achievements', () => {
			assertContains(content, /CREATE POLICY.*Students can view their own achievements/i);
			assertContains(content, /student_id = auth\.uid\(\)/i);
		});

		it('should allow teachers to view their students achievements', () => {
			assertContains(content, /CREATE POLICY.*Teachers can view their students achievements/i);
			assertContains(content, /class_members.*classes/i);
		});

		it('should restrict insert to SECURITY DEFINER functions only', () => {
			assertContains(content, /CREATE POLICY.*System can insert student achievements/i);
			assertContains(content, /WITH CHECK \(false\)/i);
		});
	});

	describe('achievement_progress table policies', () => {
		it('should allow students to view their own progress', () => {
			assertContains(content, /CREATE POLICY.*Students can view their own progress/i);
		});

		it('should allow teachers to view their students progress', () => {
			assertContains(content, /CREATE POLICY.*Teachers can view their students progress/i);
		});

		it('should restrict insert/update to SECURITY DEFINER functions', () => {
			assertContains(content, /CREATE POLICY.*System can manage achievement progress/i);
			assertContains(content, /WITH CHECK \(false\)/i);
		});
	});

	describe('achievement_events table policies', () => {
		it('should restrict all operations to SECURITY DEFINER functions', () => {
			assertContains(content, /CREATE POLICY.*System can manage achievement events/i);
			assertContains(content, /WITH CHECK \(false\)/i);
		});
	});
});

// ============================================================================
// TESTS: SQL Functions
// ============================================================================

describe('SQL Functions', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should create update_updated_at_column trigger function', () => {
		assertContains(content, /CREATE OR REPLACE FUNCTION public\.update_updated_at_column\(\)/i);
		assertContains(content, /RETURNS TRIGGER/i);
	});

	it('should create check_achievement_prerequisites function', () => {
		assertContains(content, /CREATE OR REPLACE FUNCTION public\.check_achievement_prerequisites/i);
		assertContains(content, /p_student_id UUID/i);
		assertContains(content, /p_achievement_id TEXT/i);
		assertContains(content, /RETURNS BOOLEAN/i);
		assertContains(content, /SECURITY DEFINER/i);
	});

	it('should create update_achievement_progress function', () => {
		assertContains(content, /CREATE OR REPLACE FUNCTION public\.update_achievement_progress/i);
		assertContains(content, /p_student_id UUID/i);
		assertContains(content, /p_achievement_id TEXT/i);
		assertContains(content, /p_delta NUMERIC/i);
		assertContains(content, /p_context_key TEXT DEFAULT NULL/i);
		assertContains(content, /RETURNS JSONB/i);
		assertContains(content, /SECURITY DEFINER/i);
	});

	it('should create process_achievement_event function', () => {
		assertContains(content, /CREATE OR REPLACE FUNCTION public\.process_achievement_event/i);
		assertContains(content, /p_event_type TEXT/i);
		assertContains(content, /p_student_id UUID/i);
		assertContains(content, /p_event_data JSONB DEFAULT/i);
		assertContains(content, /RETURNS JSONB/i);
		assertContains(content, /SECURITY DEFINER/i);
	});

	it('should create award_achievement_manual function', () => {
		assertContains(content, /CREATE OR REPLACE FUNCTION public\.award_achievement_manual/i);
		assertContains(content, /p_teacher_id UUID/i);
		assertContains(content, /p_student_id UUID/i);
		assertContains(content, /p_achievement_id TEXT/i);
		assertContains(content, /p_reason TEXT DEFAULT NULL/i);
		assertContains(content, /RETURNS BOOLEAN/i);
		assertContains(content, /SECURITY DEFINER/i);
	});

	it('should set search_path = public for all SECURITY DEFINER functions', () => {
		const securityDefinerFunctions = content.match(
			/SECURITY DEFINER[\s\S]*?SET search_path = public/gi
		);
		expect(securityDefinerFunctions).toBeDefined();
		expect(securityDefinerFunctions!.length).toBeGreaterThanOrEqual(4);
	});
});

// ============================================================================
// TESTS: Triggers
// ============================================================================

describe('Triggers', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should create trigger on achievements table for updated_at', () => {
		assertContains(content, /CREATE TRIGGER update_achievements_updated_at/i);
		assertContains(content, /BEFORE UPDATE ON public\.achievements/i);
		assertContains(content, /EXECUTE FUNCTION update_updated_at_column\(\)/i);
	});

	it('should create trigger on achievement_progress table for updated_at', () => {
		assertContains(content, /CREATE TRIGGER update_achievement_progress_updated_at/i);
		assertContains(content, /BEFORE UPDATE ON public\.achievement_progress/i);
		assertContains(content, /EXECUTE FUNCTION update_updated_at_column\(\)/i);
	});
});

// ============================================================================
// TESTS: Sample Data
// ============================================================================

describe('Sample Achievement Definitions', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should insert sample achievements', () => {
		assertContains(content, /INSERT INTO public\.achievements/i);
		assertContains(content, /ON CONFLICT \(id\) DO NOTHING/i);
	});

	it('should insert minesweeper achievements', () => {
		assertContains(content, /minesweeper_first_win/i);
		assertContains(content, /minesweeper_speed_demon/i);
		assertContains(content, /minesweeper_perfect_beginner/i);
	});

	it('should insert questions achievements', () => {
		assertContains(content, /questions_first_answer/i);
		assertContains(content, /questions_streak_10/i);
		assertContains(content, /questions_master_calculus/i);
	});

	it('should insert social achievements', () => {
		assertContains(content, /social_first_friend/i);
		assertContains(content, /social_popular/i);
	});

	it('should insert meta achievement', () => {
		assertContains(content, /meta_achievement_hunter/i);
	});

	it('should have proper JSONB metadata for sample achievements', () => {
		assertContains(content, /"points":/i);
		assertContains(content, /"gidouilles_reward":/i);
		assertContains(content, /"rarity":/i);
		assertContains(content, /"unlock_conditions":/i);
	});
});

// ============================================================================
// TESTS: Grants and Permissions
// ============================================================================

describe('Grants and Permissions', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should grant usage on schema to authenticated', () => {
		assertContains(content, /GRANT USAGE ON SCHEMA public TO authenticated/i);
	});

	it('should grant SELECT on tables to authenticated', () => {
		assertContains(content, /GRANT SELECT ON public\.achievements TO authenticated/i);
		assertContains(content, /GRANT SELECT ON public\.student_achievements TO authenticated/i);
		assertContains(content, /GRANT SELECT ON public\.achievement_progress TO authenticated/i);
	});

	it('should grant EXECUTE on functions to authenticated', () => {
		assertContains(
			content,
			/GRANT EXECUTE ON FUNCTION public\.process_achievement_event TO authenticated/i
		);
		assertContains(
			content,
			/GRANT EXECUTE ON FUNCTION public\.update_achievement_progress TO authenticated/i
		);
		assertContains(
			content,
			/GRANT EXECUTE ON FUNCTION public\.check_achievement_prerequisites TO authenticated/i
		);
		assertContains(
			content,
			/GRANT EXECUTE ON FUNCTION public\.award_achievement_manual TO authenticated/i
		);
	});
});

// ============================================================================
// TESTS: Documentation and Comments
// ============================================================================

describe('Documentation and Comments', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should have comments on tables', () => {
		assertContains(content, /COMMENT ON TABLE public\.achievements IS/i);
		assertContains(content, /COMMENT ON TABLE public\.student_achievements IS/i);
		assertContains(content, /COMMENT ON TABLE public\.achievement_progress IS/i);
		assertContains(content, /COMMENT ON TABLE public\.achievement_events IS/i);
	});

	it('should have comments on key columns', () => {
		assertContains(content, /COMMENT ON COLUMN public\.achievements\.id IS/i);
		assertContains(content, /COMMENT ON COLUMN public\.achievements\.context IS/i);
		assertContains(content, /COMMENT ON COLUMN public\.achievements\.unlock_type IS/i);
		assertContains(content, /COMMENT ON COLUMN public\.achievements\.metadata IS/i);
	});

	it('should have comments on functions', () => {
		assertContains(content, /COMMENT ON FUNCTION public\.process_achievement_event IS/i);
		assertContains(content, /COMMENT ON FUNCTION public\.update_achievement_progress IS/i);
		assertContains(content, /COMMENT ON FUNCTION public\.check_achievement_prerequisites IS/i);
		assertContains(content, /COMMENT ON FUNCTION public\.award_achievement_manual IS/i);
	});

	it('should have section headers for organization', () => {
		assertContains(content, /HELPER FUNCTIONS/i);
		assertContains(content, /ACHIEVEMENTS TABLE/i);
		assertContains(content, /INDEXES FOR PERFORMANCE/i);
		assertContains(content, /ROW LEVEL SECURITY/i);
		assertContains(content, /SQL FUNCTIONS/i);
		assertContains(content, /TRIGGERS/i);
		assertContains(content, /SAMPLE ACHIEVEMENT DEFINITIONS/i);
		assertContains(content, /GRANTS/i);
	});
});

// ============================================================================
// TESTS: Migration Completeness
// ============================================================================

describe('Migration Completeness', () => {
	let content: string;

	beforeAll(() => {
		content = getMigrationContent();
	});

	it('should have reasonable file size (comprehensive but not bloated)', () => {
		const lines = content.split('\n').length;
		expect(lines).toBeGreaterThan(500); // Comprehensive
		expect(lines).toBeLessThan(1500); // Not bloated
	});

	it('should use consistent SQL style (uppercase keywords)', () => {
		const hasUppercaseKeywords = /CREATE TABLE|INSERT INTO|SELECT|WHERE|RETURNS/g.test(content);
		expect(hasUppercaseKeywords).toBe(true);
	});

	it('should have proper section ordering', () => {
		const helperFunctionsIndex = content.indexOf('HELPER FUNCTIONS');
		const tablesIndex = content.indexOf('ACHIEVEMENTS TABLE');
		const indexesIndex = content.indexOf('INDEXES FOR PERFORMANCE');
		const rlsIndex = content.indexOf('ROW LEVEL SECURITY');
		const functionsIndex = content.indexOf('SQL FUNCTIONS');
		const triggersIndex = content.indexOf('TRIGGERS');
		const grantsIndex = content.indexOf('GRANTS');

		expect(helperFunctionsIndex).toBeGreaterThan(0);
		expect(tablesIndex).toBeGreaterThan(helperFunctionsIndex);
		expect(indexesIndex).toBeGreaterThan(tablesIndex);
		expect(rlsIndex).toBeGreaterThan(indexesIndex);
		expect(functionsIndex).toBeGreaterThan(rlsIndex);
		expect(triggersIndex).toBeGreaterThan(functionsIndex);
		expect(grantsIndex).toBeGreaterThan(triggersIndex);
	});

	it('should not have any TODO or FIXME comments', () => {
		const hasTodo = /TODO|FIXME/i.test(content);
		expect(hasTodo).toBe(false);
	});

	it('should use parameterized names (p_ prefix) in functions', () => {
		assertContains(content, /p_student_id/i);
		assertContains(content, /p_achievement_id/i);
		assertContains(content, /p_event_type/i);
		assertContains(content, /p_delta/i);
	});

	it('should use variable names (v_ prefix) in functions', () => {
		assertContains(content, /v_achievement/i);
		assertContains(content, /v_progress_record/i);
		assertContains(content, /v_unlocked_achievements/i);
	});
});
