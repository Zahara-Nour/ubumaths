/**
 * Admin Exercise Backup/Restore Functions
 *
 * Handles exporting and importing complete exercise backups including:
 * - exercises
 * - exercise_templates
 * - exercise_favorites
 * - exercise_share_tokens
 *
 * @module server/admin/exercise-backup
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import {
	type ExerciseBackup,
	type ExerciseBackupRecord,
	type TemplateBackupRecord,
	type FavoriteBackupRecord,
	type TokenBackupRecord,
	type BackupStats,
	type RestoreOptions,
	type RestoreResult,
	BACKUP_VERSION,
	BACKUP_FORMAT,
	validateBackup,
	validateRestoreOptions
} from '$lib/server/validation/backup';

// ============================================================================
// TYPES
// ============================================================================

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Get backup statistics for all exercise tables
 *
 * @param supabase - Supabase client with admin privileges
 * @returns Record counts for all tables
 */
export async function getBackupStats(supabase: SupabaseClientType): Promise<BackupStats> {
	// Count exercises
	const { count: exercisesCount, error: exercisesError } = await supabase
		.from('exercises')
		.select('*', { count: 'exact', head: true });

	if (exercisesError) {
		throw new Error(`Failed to count exercises: ${exercisesError.message}`);
	}

	// Count templates
	const { count: templatesCount, error: templatesError } = await supabase
		.from('exercise_templates')
		.select('*', { count: 'exact', head: true });

	if (templatesError) {
		throw new Error(`Failed to count templates: ${templatesError.message}`);
	}

	// Count favorites
	const { count: favoritesCount, error: favoritesError } = await supabase
		.from('exercise_favorites')
		.select('*', { count: 'exact', head: true });

	if (favoritesError) {
		throw new Error(`Failed to count favorites: ${favoritesError.message}`);
	}

	// Count share tokens
	const { count: tokensCount, error: tokensError } = await supabase
		.from('exercise_share_tokens')
		.select('*', { count: 'exact', head: true });

	if (tokensError) {
		throw new Error(`Failed to count share tokens: ${tokensError.message}`);
	}

	const exercises = exercisesCount ?? 0;
	const exercise_templates = templatesCount ?? 0;
	const exercise_favorites = favoritesCount ?? 0;
	const exercise_share_tokens = tokensCount ?? 0;

	return {
		exercises,
		exercise_templates,
		exercise_favorites,
		exercise_share_tokens,
		total: exercises + exercise_templates + exercise_favorites + exercise_share_tokens
	};
}

/**
 * Export all exercise data to JSON backup format
 *
 * @param supabase - Supabase client with admin privileges
 * @param adminEmail - Email of admin performing the backup (for audit trail)
 * @returns Complete backup object
 */
export async function exportBackupJSON(
	supabase: SupabaseClientType,
	adminEmail: string
): Promise<ExerciseBackup> {
	// Fetch all exercises with creator emails
	const { data: exercises, error: exercisesError } = await supabase
		.from('exercises')
		.select(
			`
			*,
			profiles:created_by (email)
		`
		)
		.order('created_at', { ascending: true });

	if (exercisesError) {
		throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
	}

	// Fetch all templates with creator emails
	const { data: templates, error: templatesError } = await supabase
		.from('exercise_templates')
		.select(
			`
			*,
			profiles:created_by (email)
		`
		)
		.order('created_at', { ascending: true });

	if (templatesError) {
		throw new Error(`Failed to fetch templates: ${templatesError.message}`);
	}

	// Fetch all favorites with user emails
	const { data: favorites, error: favoritesError } = await supabase
		.from('exercise_favorites')
		.select(
			`
			*,
			profiles:user_id (email)
		`
		)
		.order('created_at', { ascending: true });

	if (favoritesError) {
		throw new Error(`Failed to fetch favorites: ${favoritesError.message}`);
	}

	// Fetch all share tokens with creator emails
	const { data: tokens, error: tokensError } = await supabase
		.from('exercise_share_tokens')
		.select(
			`
			*,
			profiles:created_by (email)
		`
		)
		.order('created_at', { ascending: true });

	if (tokensError) {
		throw new Error(`Failed to fetch share tokens: ${tokensError.message}`);
	}

	// Transform to backup format
	const exerciseRecords: ExerciseBackupRecord[] = (exercises ?? []).map((ex) => {
		const profile = ex.profiles as { email: string } | null;
		return {
			id: ex.id,
			slug: ex.slug,
			title: ex.title,
			source: ex.source,
			difficulty: ex.difficulty,
			tags: ex.tags,
			statement_md: ex.statement_md,
			solution_md: ex.solution_md,
			grade_levels: ex.grade_levels,
			topic: ex.topic,
			is_public: ex.is_public,
			distribution_mode: ex.distribution_mode,
			variables: ex.variables,
			variations: ex.variations,
			shared: ex.shared,
			resources: ex.resources,
			generic_functions: ex.generic_functions,
			created_at: ex.created_at,
			updated_at: ex.updated_at,
			created_by: ex.created_by,
			_created_by_email: profile?.email
		};
	});

	const templateRecords: TemplateBackupRecord[] = (templates ?? []).map((t) => {
		const profile = t.profiles as { email: string } | null;
		return {
			id: t.id,
			title: t.title,
			description: t.description,
			template_data: t.template_data,
			is_system: t.is_system,
			created_at: t.created_at,
			updated_at: t.updated_at,
			created_by: t.created_by,
			_created_by_email: profile?.email
		};
	});

	const favoriteRecords: FavoriteBackupRecord[] = (favorites ?? []).map((f) => {
		const profile = f.profiles as { email: string } | null;
		return {
			user_id: f.user_id,
			exercise_id: f.exercise_id,
			created_at: f.created_at,
			_user_email: profile?.email
		};
	});

	const tokenRecords: TokenBackupRecord[] = (tokens ?? []).map((t) => {
		const profile = t.profiles as { email: string } | null;
		return {
			id: t.id,
			exercise_id: t.exercise_id,
			token: t.token,
			created_by: t.created_by,
			expires_at: t.expires_at,
			is_active: t.is_active,
			access_count: t.access_count,
			last_accessed_at: t.last_accessed_at,
			created_at: t.created_at,
			_created_by_email: profile?.email
		};
	});

	const backup: ExerciseBackup = {
		version: BACKUP_VERSION,
		format: BACKUP_FORMAT,
		created_at: new Date().toISOString(),
		created_by: adminEmail,
		metadata: {
			tables_included: [
				'exercises',
				'exercise_templates',
				'exercise_favorites',
				'exercise_share_tokens'
			],
			record_counts: {
				exercises: exerciseRecords.length,
				exercise_templates: templateRecords.length,
				exercise_favorites: favoriteRecords.length,
				exercise_share_tokens: tokenRecords.length
			}
		},
		data: {
			exercises: exerciseRecords,
			exercise_templates: templateRecords,
			exercise_favorites: favoriteRecords,
			exercise_share_tokens: tokenRecords
		}
	};

	return backup;
}

/**
 * Export all exercise data to SQL dump format
 *
 * @param supabase - Supabase client with admin privileges
 * @param adminEmail - Email of admin performing the backup (for audit trail)
 * @returns SQL dump string
 */
export async function exportBackupSQL(
	supabase: SupabaseClientType,
	adminEmail: string
): Promise<string> {
	const backup = await exportBackupJSON(supabase, adminEmail);

	const lines: string[] = [];
	const timestamp = new Date().toISOString();

	lines.push('-- ============================================================================');
	lines.push('-- UbuMaths Exercise Backup - SQL Dump');
	lines.push(`-- Generated: ${timestamp}`);
	lines.push('-- Tables: exercises, exercise_templates, exercise_favorites, exercise_share_tokens');
	lines.push('-- ============================================================================');
	lines.push('');
	lines.push('BEGIN;');
	lines.push('');

	// Helper to escape SQL strings
	const escapeSQL = (value: unknown): string => {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
		if (typeof value === 'number') return String(value);
		if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
		return `'${String(value).replace(/'/g, "''")}'`;
	};

	// Exercises
	if (backup.data.exercises.length > 0) {
		lines.push('-- ============================================================================');
		lines.push('-- EXERCISES');
		lines.push('-- ============================================================================');
		lines.push('');

		for (const ex of backup.data.exercises) {
			lines.push(`INSERT INTO exercises (
  id, slug, title, source, difficulty, tags, statement_md, solution_md,
  grade_levels, topic, is_public, distribution_mode, variables, variations,
  shared, resources, generic_functions, created_at, updated_at, created_by
) VALUES (
  ${escapeSQL(ex.id)},
  ${escapeSQL(ex.slug)},
  ${escapeSQL(ex.title)},
  ${escapeSQL(ex.source)},
  ${ex.difficulty},
  ${escapeSQL(ex.tags)},
  ${escapeSQL(ex.statement_md)},
  ${escapeSQL(ex.solution_md)},
  ${escapeSQL(ex.grade_levels)},
  ${escapeSQL(ex.topic)},
  ${ex.is_public},
  ${escapeSQL(ex.distribution_mode)},
  ${escapeSQL(ex.variables)},
  ${escapeSQL(ex.variations)},
  ${escapeSQL(ex.shared)},
  ${escapeSQL(ex.resources)},
  ${escapeSQL(ex.generic_functions)},
  ${escapeSQL(ex.created_at)},
  ${escapeSQL(ex.updated_at)},
  ${escapeSQL(ex.created_by)}
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  source = EXCLUDED.source,
  difficulty = EXCLUDED.difficulty,
  tags = EXCLUDED.tags,
  statement_md = EXCLUDED.statement_md,
  solution_md = EXCLUDED.solution_md,
  grade_levels = EXCLUDED.grade_levels,
  topic = EXCLUDED.topic,
  is_public = EXCLUDED.is_public,
  distribution_mode = EXCLUDED.distribution_mode,
  variables = EXCLUDED.variables,
  variations = EXCLUDED.variations,
  shared = EXCLUDED.shared,
  resources = EXCLUDED.resources,
  generic_functions = EXCLUDED.generic_functions,
  updated_at = EXCLUDED.updated_at;`);
			lines.push('');
		}
	}

	// Templates
	if (backup.data.exercise_templates.length > 0) {
		lines.push('-- ============================================================================');
		lines.push('-- EXERCISE TEMPLATES');
		lines.push('-- ============================================================================');
		lines.push('');

		for (const t of backup.data.exercise_templates) {
			lines.push(`INSERT INTO exercise_templates (
  id, title, description, template_data, is_system, created_at, updated_at, created_by
) VALUES (
  ${escapeSQL(t.id)},
  ${escapeSQL(t.title)},
  ${escapeSQL(t.description)},
  ${escapeSQL(t.template_data)},
  ${t.is_system},
  ${escapeSQL(t.created_at)},
  ${escapeSQL(t.updated_at)},
  ${escapeSQL(t.created_by)}
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  template_data = EXCLUDED.template_data,
  is_system = EXCLUDED.is_system,
  updated_at = EXCLUDED.updated_at;`);
			lines.push('');
		}
	}

	// Favorites
	if (backup.data.exercise_favorites.length > 0) {
		lines.push('-- ============================================================================');
		lines.push('-- EXERCISE FAVORITES');
		lines.push('-- ============================================================================');
		lines.push('');

		for (const f of backup.data.exercise_favorites) {
			lines.push(`INSERT INTO exercise_favorites (user_id, exercise_id, created_at)
VALUES (${escapeSQL(f.user_id)}, ${escapeSQL(f.exercise_id)}, ${escapeSQL(f.created_at)})
ON CONFLICT (user_id, exercise_id) DO NOTHING;`);
			lines.push('');
		}
	}

	// Share Tokens
	if (backup.data.exercise_share_tokens.length > 0) {
		lines.push('-- ============================================================================');
		lines.push('-- EXERCISE SHARE TOKENS');
		lines.push('-- ============================================================================');
		lines.push('');

		for (const t of backup.data.exercise_share_tokens) {
			lines.push(`INSERT INTO exercise_share_tokens (
  id, exercise_id, token, created_by, expires_at, is_active, access_count, last_accessed_at, created_at
) VALUES (
  ${escapeSQL(t.id)},
  ${escapeSQL(t.exercise_id)},
  ${escapeSQL(t.token)},
  ${escapeSQL(t.created_by)},
  ${escapeSQL(t.expires_at)},
  ${t.is_active},
  ${t.access_count},
  ${escapeSQL(t.last_accessed_at)},
  ${escapeSQL(t.created_at)}
) ON CONFLICT (id) DO UPDATE SET
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active,
  access_count = EXCLUDED.access_count,
  last_accessed_at = EXCLUDED.last_accessed_at;`);
			lines.push('');
		}
	}

	lines.push('COMMIT;');
	lines.push('');
	lines.push('-- End of backup');

	return lines.join('\n');
}

// ============================================================================
// IMPORT/RESTORE FUNCTIONS
// ============================================================================

/**
 * Restore exercise data from a backup
 *
 * @param supabase - Supabase client with admin privileges
 * @param backupData - Backup data (will be validated)
 * @param options - Restore options
 * @returns Restore result with statistics
 */
export async function restoreFromBackup(
	supabase: SupabaseClientType,
	backupData: unknown,
	options: unknown
): Promise<RestoreResult> {
	// Validate backup
	const backupValidation = validateBackup(backupData);
	if (!backupValidation.success || !backupValidation.data) {
		return {
			success: false,
			stats: {
				exercises: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_templates: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_favorites: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_share_tokens: { imported: 0, skipped: 0, replaced: 0, failed: 0 }
			},
			errors: [{ table: 'backup', record_id: '', error: backupValidation.error ?? 'Unknown error' }]
		};
	}

	// Validate options
	const optionsValidation = validateRestoreOptions(options);
	if (!optionsValidation.success || !optionsValidation.data) {
		return {
			success: false,
			stats: {
				exercises: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_templates: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_favorites: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
				exercise_share_tokens: { imported: 0, skipped: 0, replaced: 0, failed: 0 }
			},
			errors: [
				{ table: 'options', record_id: '', error: optionsValidation.error ?? 'Unknown error' }
			]
		};
	}

	const backup = backupValidation.data;
	const opts = optionsValidation.data;

	const result: RestoreResult = {
		success: true,
		stats: {
			exercises: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
			exercise_templates: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
			exercise_favorites: { imported: 0, skipped: 0, replaced: 0, failed: 0 },
			exercise_share_tokens: { imported: 0, skipped: 0, replaced: 0, failed: 0 }
		},
		errors: []
	};

	// Get existing user IDs for FK validation
	const { data: existingUsers } = await supabase.from('profiles').select('id');
	const validUserIds = new Set((existingUsers ?? []).map((u) => u.id));

	// 1. Restore exercises (no FK dependencies in backup scope)
	await restoreExercises(supabase, backup.data.exercises, opts, validUserIds, result);

	// Get existing exercise IDs after restore
	const { data: existingExercises } = await supabase.from('exercises').select('id');
	const validExerciseIds = new Set((existingExercises ?? []).map((e) => e.id));

	// 2. Restore templates
	await restoreTemplates(supabase, backup.data.exercise_templates, opts, validUserIds, result);

	// 3. Restore favorites (depends on exercises and users)
	await restoreFavorites(
		supabase,
		backup.data.exercise_favorites,
		opts,
		validUserIds,
		validExerciseIds,
		result
	);

	// 4. Restore share tokens (depends on exercises and users)
	await restoreTokens(
		supabase,
		backup.data.exercise_share_tokens,
		opts,
		validUserIds,
		validExerciseIds,
		result
	);

	// Set overall success
	result.success = result.errors.length === 0;

	return result;
}

/**
 * Restore exercises table
 */
async function restoreExercises(
	supabase: SupabaseClientType,
	records: ExerciseBackupRecord[],
	options: RestoreOptions,
	validUserIds: Set<string>,
	result: RestoreResult
): Promise<void> {
	for (const record of records) {
		try {
			// Check if created_by exists
			let createdBy = record.created_by;
			if (!validUserIds.has(createdBy)) {
				if (options.reassign_orphans_to_admin && options.admin_id) {
					createdBy = options.admin_id;
				} else {
					result.stats.exercises.skipped++;
					result.errors.push({
						table: 'exercises',
						record_id: record.id,
						error: `User ${createdBy} does not exist`
					});
					continue;
				}
			}

			// Check if exercise exists
			const { data: existing } = await supabase
				.from('exercises')
				.select('id')
				.eq('id', record.id)
				.single();

			if (existing) {
				if (options.conflict_strategy === 'skip') {
					result.stats.exercises.skipped++;
					continue;
				}

				// Replace
				const { error } = await supabase
					.from('exercises')
					.update({
						slug: record.slug,
						title: record.title,
						source: record.source,
						difficulty: record.difficulty,
						tags: record.tags,
						statement_md: record.statement_md,
						solution_md: record.solution_md,
						grade_levels: record.grade_levels,
						topic: record.topic,
						is_public: record.is_public,
						distribution_mode: record.distribution_mode,
						variables: record.variables as Json,
						variations: record.variations as Json | null,
						shared: record.shared as Json | null,
						resources: record.resources as Json | null,
						generic_functions: record.generic_functions,
						updated_at: new Date().toISOString()
					})
					.eq('id', record.id);

				if (error) {
					result.stats.exercises.failed++;
					result.errors.push({ table: 'exercises', record_id: record.id, error: error.message });
				} else {
					result.stats.exercises.replaced++;
				}
			} else {
				// Insert new - use type assertion for id since backup restore needs explicit id
				const insertData = {
					id: record.id,
					slug: record.slug,
					title: record.title,
					source: record.source,
					difficulty: record.difficulty,
					tags: record.tags,
					statement_md: record.statement_md,
					solution_md: record.solution_md,
					grade_levels: record.grade_levels,
					topic: record.topic,
					is_public: record.is_public,
					distribution_mode: record.distribution_mode,
					variables: record.variables as Json,
					variations: record.variations as Json | null,
					shared: record.shared as Json | null,
					resources: record.resources as Json | null,
					generic_functions: record.generic_functions,
					created_at: record.created_at,
					updated_at: record.updated_at,
					created_by: createdBy
				} as Database['public']['Tables']['exercises']['Insert'] & { id: string };
				const { error } = await supabase.from('exercises').insert(insertData);

				if (error) {
					result.stats.exercises.failed++;
					result.errors.push({ table: 'exercises', record_id: record.id, error: error.message });
				} else {
					result.stats.exercises.imported++;
				}
			}
		} catch (err) {
			result.stats.exercises.failed++;
			result.errors.push({ table: 'exercises', record_id: record.id, error: String(err) });
		}
	}
}

/**
 * Restore exercise_templates table
 */
async function restoreTemplates(
	supabase: SupabaseClientType,
	records: TemplateBackupRecord[],
	options: RestoreOptions,
	validUserIds: Set<string>,
	result: RestoreResult
): Promise<void> {
	for (const record of records) {
		try {
			// Check if created_by exists (can be null for system templates)
			let createdBy = record.created_by;
			if (createdBy && !validUserIds.has(createdBy)) {
				if (options.reassign_orphans_to_admin && options.admin_id) {
					createdBy = options.admin_id;
				} else {
					result.stats.exercise_templates.skipped++;
					result.errors.push({
						table: 'exercise_templates',
						record_id: record.id,
						error: `User ${createdBy} does not exist`
					});
					continue;
				}
			}

			// Check if template exists
			const { data: existing } = await supabase
				.from('exercise_templates')
				.select('id')
				.eq('id', record.id)
				.single();

			if (existing) {
				if (options.conflict_strategy === 'skip') {
					result.stats.exercise_templates.skipped++;
					continue;
				}

				// Replace
				const { error } = await supabase
					.from('exercise_templates')
					.update({
						title: record.title,
						description: record.description,
						template_data: record.template_data as Json,
						is_system: record.is_system,
						updated_at: new Date().toISOString()
					})
					.eq('id', record.id);

				if (error) {
					result.stats.exercise_templates.failed++;
					result.errors.push({
						table: 'exercise_templates',
						record_id: record.id,
						error: error.message
					});
				} else {
					result.stats.exercise_templates.replaced++;
				}
			} else {
				// Insert new - use type assertion for id since backup restore needs explicit id
				const insertData = {
					id: record.id,
					title: record.title,
					description: record.description,
					template_data: record.template_data as Json,
					is_system: record.is_system,
					created_at: record.created_at,
					updated_at: record.updated_at,
					created_by: createdBy
				} as Database['public']['Tables']['exercise_templates']['Insert'] & { id: string };
				const { error } = await supabase.from('exercise_templates').insert(insertData);

				if (error) {
					result.stats.exercise_templates.failed++;
					result.errors.push({
						table: 'exercise_templates',
						record_id: record.id,
						error: error.message
					});
				} else {
					result.stats.exercise_templates.imported++;
				}
			}
		} catch (err) {
			result.stats.exercise_templates.failed++;
			result.errors.push({ table: 'exercise_templates', record_id: record.id, error: String(err) });
		}
	}
}

/**
 * Restore exercise_favorites table
 */
async function restoreFavorites(
	supabase: SupabaseClientType,
	records: FavoriteBackupRecord[],
	options: RestoreOptions,
	validUserIds: Set<string>,
	validExerciseIds: Set<string>,
	result: RestoreResult
): Promise<void> {
	for (const record of records) {
		const recordId = `${record.user_id}:${record.exercise_id}`;

		try {
			// Validate FK references
			if (!validUserIds.has(record.user_id)) {
				result.stats.exercise_favorites.skipped++;
				result.errors.push({
					table: 'exercise_favorites',
					record_id: recordId,
					error: `User ${record.user_id} does not exist`
				});
				continue;
			}

			if (!validExerciseIds.has(record.exercise_id)) {
				result.stats.exercise_favorites.skipped++;
				result.errors.push({
					table: 'exercise_favorites',
					record_id: recordId,
					error: `Exercise ${record.exercise_id} does not exist`
				});
				continue;
			}

			// Check if favorite exists
			const { data: existing } = await supabase
				.from('exercise_favorites')
				.select('user_id')
				.eq('user_id', record.user_id)
				.eq('exercise_id', record.exercise_id)
				.single();

			if (existing) {
				// Favorites can't be replaced - just skip
				result.stats.exercise_favorites.skipped++;
				continue;
			}

			// Insert new
			const { error } = await supabase.from('exercise_favorites').insert({
				user_id: record.user_id,
				exercise_id: record.exercise_id,
				created_at: record.created_at
			});

			if (error) {
				result.stats.exercise_favorites.failed++;
				result.errors.push({
					table: 'exercise_favorites',
					record_id: recordId,
					error: error.message
				});
			} else {
				result.stats.exercise_favorites.imported++;
			}
		} catch (err) {
			result.stats.exercise_favorites.failed++;
			result.errors.push({ table: 'exercise_favorites', record_id: recordId, error: String(err) });
		}
	}
}

/**
 * Restore exercise_share_tokens table
 */
async function restoreTokens(
	supabase: SupabaseClientType,
	records: TokenBackupRecord[],
	options: RestoreOptions,
	validUserIds: Set<string>,
	validExerciseIds: Set<string>,
	result: RestoreResult
): Promise<void> {
	for (const record of records) {
		try {
			// Validate FK references
			let createdBy = record.created_by;
			if (!validUserIds.has(createdBy)) {
				if (options.reassign_orphans_to_admin && options.admin_id) {
					createdBy = options.admin_id;
				} else {
					result.stats.exercise_share_tokens.skipped++;
					result.errors.push({
						table: 'exercise_share_tokens',
						record_id: record.id,
						error: `User ${createdBy} does not exist`
					});
					continue;
				}
			}

			if (!validExerciseIds.has(record.exercise_id)) {
				result.stats.exercise_share_tokens.skipped++;
				result.errors.push({
					table: 'exercise_share_tokens',
					record_id: record.id,
					error: `Exercise ${record.exercise_id} does not exist`
				});
				continue;
			}

			// Check if token exists
			const { data: existing } = await supabase
				.from('exercise_share_tokens')
				.select('id')
				.eq('id', record.id)
				.single();

			if (existing) {
				if (options.conflict_strategy === 'skip') {
					result.stats.exercise_share_tokens.skipped++;
					continue;
				}

				// Replace
				const { error } = await supabase
					.from('exercise_share_tokens')
					.update({
						expires_at: record.expires_at,
						is_active: record.is_active,
						access_count: record.access_count,
						last_accessed_at: record.last_accessed_at
					})
					.eq('id', record.id);

				if (error) {
					result.stats.exercise_share_tokens.failed++;
					result.errors.push({
						table: 'exercise_share_tokens',
						record_id: record.id,
						error: error.message
					});
				} else {
					result.stats.exercise_share_tokens.replaced++;
				}
			} else {
				// Insert new
				const { error } = await supabase.from('exercise_share_tokens').insert({
					id: record.id,
					exercise_id: record.exercise_id,
					token: record.token,
					created_by: createdBy,
					expires_at: record.expires_at,
					is_active: record.is_active,
					access_count: record.access_count,
					last_accessed_at: record.last_accessed_at,
					created_at: record.created_at
				});

				if (error) {
					result.stats.exercise_share_tokens.failed++;
					result.errors.push({
						table: 'exercise_share_tokens',
						record_id: record.id,
						error: error.message
					});
				} else {
					result.stats.exercise_share_tokens.imported++;
				}
			}
		} catch (err) {
			result.stats.exercise_share_tokens.failed++;
			result.errors.push({
				table: 'exercise_share_tokens',
				record_id: record.id,
				error: String(err)
			});
		}
	}
}
