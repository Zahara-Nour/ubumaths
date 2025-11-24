/**
 * Migration State Manager
 * Handles reading/writing migration state files and syncing with database
 * Provides progress tracking and resume capability
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	MigrationPhase,
	MigrationTracking,
	FailedQuestion,
	ValidationResult,
	ResumePoint,
	PhaseCompletionStats,
	ConversionError,
	MigrationStatus
} from '$lib/types/migration';
import type { Database } from '$lib/types/database';
import { lock } from 'proper-lockfile';
import {
	validateMigrationState,
	validateMigrationTrackingInsert,
	sanitizeString,
	sanitizeConversionErrors,
	type MigrationState
} from '../validation/migration';
import { generateStableQuestionHash, generateQuestionDescription } from './hash-utils';

/**
 * State manager for the question migration process
 */
export class MigrationStateManager {
	private readonly stateFilePath: string;
	private readonly progressFilePath: string;
	private supabase: SupabaseClient<Database> | null = null;

	constructor() {
		// Paths relative to project root
		this.stateFilePath = resolve(process.cwd(), '.claude/migration-state.json');
		this.progressFilePath = resolve(process.cwd(), '.claude/migration-progress.md');
	}

	/**
	 * Initialize the state manager with a Supabase client
	 */
	async init(supabase: SupabaseClient<Database>): Promise<void> {
		this.supabase = supabase;

		// Ensure state file exists
		await this.ensureStateFile();
	}

	/**
	 * Execute an operation with file locking
	 */
	private async withFileLock<T>(operation: () => Promise<T>): Promise<T> {
		let release: (() => Promise<void>) | null = null;
		try {
			// Ensure file exists before locking
			await this.ensureStateFile();

			release = await lock(this.stateFilePath, {
				retries: {
					retries: 5,
					minTimeout: 100,
					maxTimeout: 1000
				},
				stale: 10000 // 10 seconds
			});

			return await operation();
		} finally {
			if (release) {
				await release();
			}
		}
	}

	/**
	 * Get current migration state
	 */
	async getMigrationState(): Promise<MigrationState> {
		try {
			const content = await fs.readFile(this.stateFilePath, 'utf-8');
			const parsed = JSON.parse(content);

			// Validate the state with Zod
			const validation = validateMigrationState(parsed);
			if (!validation.success) {
				console.warn('Invalid migration state, returning initial state:', validation.error);
				return this.getInitialState();
			}

			return validation.data;
		} catch (_error) {
			// If file doesn't exist, return initial state
			return this.getInitialState();
		}
	}

	/**
	 * Update migration state
	 */
	async updateMigrationState(update: Partial<MigrationState>): Promise<void> {
		return this.withFileLock(async () => {
			const currentState = await this.getMigrationState();
			const updatedState: MigrationState = {
				...currentState,
				...update,
				lastUpdated: new Date().toISOString()
			};

			// Validate the updated state with Zod
			const validation = validateMigrationState(updatedState);
			if (!validation.success) {
				throw new Error(`Invalid migration state update: ${validation.error.message}`);
			}

			await fs.writeFile(this.stateFilePath, JSON.stringify(validation.data, null, 2), 'utf-8');
		});
	}

	/**
	 * Record question processing in both state file and database
	 */
	async recordQuestionProcessed(
		questionIndex: number,
		status: MigrationStatus,
		phase: MigrationPhase,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		oldQuestion: any, // Can be QuestionToMigrate or QuestionBase (old format)
		options?: {
			newTemplateId?: string;
			errors?: ConversionError[];
			notes?: string;
		}
	): Promise<void> {
		if (!this.supabase) {
			throw new Error('Supabase client not initialized. Call init() first.');
		}

		// Generate hash for the question using centralized function
		const hash = generateStableQuestionHash(oldQuestion);
		const description = generateQuestionDescription(oldQuestion);

		// LOGGING: Track hash generation for debugging
		console.log(
			`[Migration Tracking] Processing question ${questionIndex} (hash: ${hash.substring(0, 12)}...)`
		);

		// Check if an entry with this hash already exists (to detect potential conflicts)
		const { data: existing, error: checkError } = await this.supabase
			.from('migration_tracking')
			.select('old_question_index, migration_status, phase')
			.eq('old_question_hash', hash)
			.maybeSingle();

		if (checkError && checkError.code !== 'PGRST116') {
			// PGRST116 = not found, which is OK
			console.error('[Migration Tracking] Error checking existing entry:', checkError);
		}

		if (existing) {
			// Entry exists - this is expected (updating status)
			console.log(
				`[Migration Tracking] ✓ Found existing entry for index ${questionIndex} (current status: ${existing.migration_status}, phase: ${existing.phase})`
			);

			// Verify index matches
			if (existing.old_question_index !== questionIndex) {
				console.warn(
					`[Migration Tracking] ⚠️  HASH COLLISION DETECTED! Same hash for different indices: ${existing.old_question_index} vs ${questionIndex}`
				);
			}
		} else {
			// No entry found - this might indicate a hash mismatch problem
			console.warn(
				`[Migration Tracking] ⚠️  No existing entry found with hash ${hash.substring(0, 12)}... for index ${questionIndex}`
			);
			console.warn(
				'[Migration Tracking]    This might indicate a hash mismatch between initialization and processing.'
			);
			console.warn(`[Migration Tracking]    Proceeding with upsert (will create new entry)...`);
		}

		// Build and validate the tracking record
		const trackingData = {
			old_question_hash: hash,
			old_question_index: questionIndex,
			old_description: sanitizeString(description, 500),
			migration_status: status,
			phase,
			new_template_id: options?.newTemplateId || null,
			conversion_errors: sanitizeConversionErrors(options?.errors || []),
			conversion_notes: options?.notes ? sanitizeString(options.notes, 2000) : null,
			converted_at: status === 'converted' ? new Date().toISOString() : null,
			imported_at: status === 'imported' ? new Date().toISOString() : null,
			validated_at: status === 'validated' ? new Date().toISOString() : null,
			updated_at: new Date().toISOString()
		};

		// Validate with Zod before sending to database
		const validation = validateMigrationTrackingInsert(trackingData);
		if (!validation.success) {
			console.error('[Migration Tracking] ❌ Validation failed:', validation.error.message);
			throw new Error(`Invalid migration tracking data: ${validation.error.message}`);
		}

		// Update database tracking
		const { error: dbError } = await this.supabase
			.from('migration_tracking')
			.upsert(validation.data as Database['public']['Tables']['migration_tracking']['Insert'], {
				onConflict: 'old_question_hash'
			});

		if (dbError) {
			console.error(
				`[Migration Tracking] ❌ Database update failed for index ${questionIndex}:`,
				dbError
			);
			console.error(`[Migration Tracking]    Hash: ${hash.substring(0, 12)}...`);
			console.error(`[Migration Tracking]    Status: ${status}`);
			console.error(`[Migration Tracking]    Template ID: ${options?.newTemplateId || 'none'}`);
			throw new Error(`Database update failed: ${dbError.message}`);
		}

		// SUCCESS logging
		console.log(
			`[Migration Tracking] ✅ Successfully recorded index ${questionIndex} as '${status}'${options?.newTemplateId ? ` (template: ${options.newTemplateId.substring(0, 8)}...)` : ''}`
		);

		// Update state file
		const state = await this.getMigrationState();
		const phaseKey = phase.toString() as keyof typeof state.phases;

		state.phases[phaseKey].questionsProcessed++;
		state.phases[phaseKey].lastProcessedIndex = questionIndex;
		state.phases[phaseKey].lastCheckpoint = new Date().toISOString();

		if (status === 'failed') {
			state.failedQuestionIndices.push(questionIndex);
			if (state.phases[phaseKey].questionsFailed !== undefined) {
				state.phases[phaseKey].questionsFailed++;
			}
		} else if (status === 'validated') {
			if (state.phases[phaseKey].questionsSuccessful !== undefined) {
				state.phases[phaseKey].questionsSuccessful++;
			}
		}

		state.lastProcessedIndex = Math.max(state.lastProcessedIndex, questionIndex);

		await this.updateMigrationState(state);
	}

	/**
	 * Get questions needing processing for a specific phase
	 */
	async getQuestionsForPhase(phase: MigrationPhase): Promise<MigrationTracking[]> {
		if (!this.supabase) {
			throw new Error('Supabase client not initialized. Call init() first.');
		}

		const { data, error } = await this.supabase
			.from('migration_tracking')
			.select('*')
			.eq('phase', phase)
			.in('migration_status', ['pending', 'failed'])
			.order('old_question_index', { ascending: true });

		if (error) {
			throw new Error(`Failed to fetch questions for phase ${phase}: ${error.message}`);
		}

		return (data || []).map((row) => ({
			...row,
			phase: row.phase as MigrationPhase | null,
			migration_status: row.migration_status as MigrationStatus,
			conversion_errors: (row.conversion_errors as unknown as ConversionError[]) || [],
			created_at: row.created_at || '',
			updated_at: row.updated_at || ''
		})) as MigrationTracking[];
	}

	/**
	 * Get failed questions
	 */
	async getFailedQuestions(): Promise<FailedQuestion[]> {
		if (!this.supabase) {
			throw new Error('Supabase client not initialized. Call init() first.');
		}

		const { data, error } = await this.supabase
			.from('migration_tracking')
			.select('*')
			.eq('migration_status', 'failed')
			.order('phase', { ascending: true })
			.order('old_question_index', { ascending: true });

		if (error) {
			throw new Error(`Failed to fetch failed questions: ${error.message}`);
		}

		return (data || []).map((row) => ({
			id: row.old_question_index,
			phase: row.phase as MigrationPhase,
			reason:
				((row.conversion_errors as unknown as ConversionError[]) || [])[0]?.message ||
				'Unknown error',
			requiresManualReview: true
		}));
	}

	/**
	 * Validate state consistency between file and database
	 */
	async validateStateConsistency(): Promise<ValidationResult> {
		if (!this.supabase) {
			throw new Error('Supabase client not initialized. Call init() first.');
		}

		const errors: string[] = [];
		const warnings: string[] = [];
		const suggestions: string[] = [];

		try {
			// Get state from file
			const fileState = await this.getMigrationState();

			// Get counts from database (for future use)
			const { data: _statusCounts } = await this.supabase
				.from('migration_tracking')
				.select('migration_status')
				.then((result) => {
					const counts: Record<string, number> = {};
					result.data?.forEach((row) => {
						counts[row.migration_status] = (counts[row.migration_status] || 0) + 1;
					});
					return { data: counts };
				});

			// Validate phase consistency
			for (let phase = 1; phase <= 4; phase++) {
				const phaseKey = phase.toString() as keyof typeof fileState.phases;
				const phaseState = fileState.phases[phaseKey];

				const { count } = await this.supabase
					.from('migration_tracking')
					.select('*', { count: 'exact', head: true })
					.eq('phase', phase);

				if (count && count !== phaseState.questionsProcessed) {
					warnings.push(
						`Phase ${phase}: File shows ${phaseState.questionsProcessed} processed, database shows ${count}`
					);
				}
			}

			// Check for orphaned records
			const { count: totalInDb } = await this.supabase
				.from('migration_tracking')
				.select('*', { count: 'exact', head: true });

			if (totalInDb && totalInDb > fileState.totalQuestions) {
				warnings.push(
					`Database has ${totalInDb} records but state file expects ${fileState.totalQuestions} total questions`
				);
			}

			// Provide suggestions
			if (warnings.length > 0) {
				suggestions.push('Run reconciliation to sync state file with database');
			}

			return {
				valid: errors.length === 0,
				errors,
				warnings,
				suggestions
			};
		} catch (error) {
			return {
				valid: false,
				errors: [`State validation failed: ${error}`],
				warnings: [],
				suggestions: ['Check database connection and state file integrity']
			};
		}
	}

	/**
	 * Get resume point for a phase
	 */
	async getResumePoint(phase: MigrationPhase): Promise<ResumePoint> {
		const state = await this.getMigrationState();
		const phaseKey = phase.toString() as keyof typeof state.phases;
		const phaseState = state.phases[phaseKey];

		return {
			phase,
			lastProcessedIndex: phaseState.lastProcessedIndex || 0,
			questionsProcessed: phaseState.questionsProcessed || 0,
			lastCheckpoint: phaseState.lastCheckpoint || null
		};
	}

	/**
	 * Mark a phase as complete
	 */
	async markPhaseComplete(phase: MigrationPhase, stats: PhaseCompletionStats): Promise<void> {
		const state = await this.getMigrationState();
		const phaseKey = phase.toString() as keyof typeof state.phases;

		state.phases[phaseKey] = {
			...state.phases[phaseKey],
			status: 'completed',
			endDate: new Date().toISOString(),
			questionsSuccessful: stats.questionsSuccessful,
			questionsFailed: stats.questionsFailed,
			successRate: stats.successRate
		};

		// Update current phase if needed
		if (phase === state.currentPhase && phase < 4) {
			state.currentPhase = (phase + 1) as MigrationPhase;
		}

		await this.updateMigrationState(state);
		await this.updateProgressReport(state);
	}

	/**
	 * Save checkpoint during migration
	 */
	async saveCheckpoint(
		phase: MigrationPhase,
		processedCount: number,
		lastIndex?: number
	): Promise<void> {
		// Validate inputs
		if (phase < 1 || phase > 4) {
			throw new Error(`Invalid phase: ${phase}. Must be between 1 and 4.`);
		}
		if (processedCount < 0 || processedCount > 999999) {
			throw new Error(`Invalid processedCount: ${processedCount}. Must be between 0 and 999999.`);
		}
		if (lastIndex !== undefined && (lastIndex < 0 || lastIndex > 999999)) {
			throw new Error(`Invalid lastIndex: ${lastIndex}. Must be between 0 and 999999.`);
		}

		const state = await this.getMigrationState();
		const phaseKey = phase.toString() as keyof typeof state.phases;

		state.phases[phaseKey] = {
			...state.phases[phaseKey],
			questionsProcessed: processedCount,
			lastProcessedIndex: lastIndex,
			lastCheckpoint: new Date().toISOString()
		};

		state.lastUpdated = new Date().toISOString();
		await this.updateMigrationState(state);
	}

	/**
	 * Private helper methods
	 */

	private getInitialState(): MigrationState {
		return {
			version: '1.0.0',
			currentPhase: 1,
			lastUpdated: null,
			phases: {
				'1': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'2': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'3': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null },
				'4': { status: 'pending', questionsProcessed: 0, startDate: null, endDate: null }
			},
			totalQuestions: 0,
			lastProcessedIndex: 0,
			failedQuestionIndices: []
		};
	}

	private async ensureStateFile(): Promise<void> {
		try {
			await fs.access(this.stateFilePath);
		} catch {
			// File doesn't exist, create it with initial state
			const initialState = this.getInitialState();
			await fs.mkdir(resolve(process.cwd(), '.claude'), { recursive: true });
			await fs.writeFile(this.stateFilePath, JSON.stringify(initialState, null, 2), 'utf-8');
		}
	}

	// Note: Hash and description generation functions have been moved to
	// src/lib/server/migration/hash-utils.ts for centralization and consistency.
	// This ensures the same hash is calculated during initialization and processing.

	private async updateProgressReport(state: MigrationState): Promise<void> {
		const report = this.generateProgressReport(state);
		await fs.writeFile(this.progressFilePath, report, 'utf-8');
	}

	private generateProgressReport(state: MigrationState): string {
		const totalProcessed = Object.values(state.phases).reduce(
			(sum, phase) => sum + phase.questionsProcessed,
			0
		);

		const percentage =
			state.totalQuestions > 0 ? ((totalProcessed / state.totalQuestions) * 100).toFixed(1) : '0.0';

		let report = `# Migration Progress Report

**Last Updated**: ${state.lastUpdated || 'Never'}
**Overall Progress**: ${totalProcessed}/${state.totalQuestions} questions (${percentage}%)

## Phase Status

`;

		for (let phase = 1; phase <= 4; phase++) {
			const phaseKey = phase.toString() as keyof typeof state.phases;
			const phaseState = state.phases[phaseKey];
			const emoji =
				phaseState.status === 'completed'
					? '✅'
					: phaseState.status === 'in_progress'
						? '🚧'
						: '⏳';

			report += `### Phase ${phase}: ${emoji} ${phaseState.status.toUpperCase()}

- Questions Processed: ${phaseState.questionsProcessed}
- Success Rate: ${phaseState.successRate?.toFixed(1) || 'N/A'}%
- Last Checkpoint: ${phaseState.lastCheckpoint || 'Never'}

`;
		}

		if (state.failedQuestionIndices.length > 0) {
			report += `## Failed Questions

Total: ${state.failedQuestionIndices.length}
Indices: ${state.failedQuestionIndices.slice(0, 10).join(', ')}${
				state.failedQuestionIndices.length > 10 ? '...' : ''
			}

`;
		}

		return report;
	}
}
