#!/usr/bin/env tsx
/**
 * Migration Script: Sanitize Existing Notifications
 *
 * This script sanitizes the HTML content of all existing notifications
 * that were created before server-side sanitization was implemented.
 *
 * Usage:
 *   pnpm migrate:sanitize
 *
 * Safety:
 * - Only updates notifications where content actually changes
 * - Logs all modifications
 * - Processes in batches to prevent memory issues
 * - Continues processing even if individual notifications fail
 *
 * @author Claude Code
 * @date 2025-11-10
 */

import { createClient } from '@supabase/supabase-js';
import { sanitizeNotificationHtml } from '../src/lib/server/sanitization';
import type { Database } from '../src/lib/types/database';
import { config } from 'dotenv';

// Load environment variables
config();

// Constants
const BATCH_SIZE = 100;
const PROGRESS_LOG_INTERVAL = 50;

// Types
type NotificationPartial = Pick<
	Database['public']['Tables']['notifications']['Row'],
	'id' | 'message'
>;

/**
 * Initialize Supabase client with service role key
 * Required to bypass RLS policies for bulk updates
 */
function initSupabaseClient() {
	const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
	const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		throw new Error(
			'Missing required environment variables:\n' +
				'- PUBLIC_SUPABASE_URL\n' +
				'- SUPABASE_SERVICE_ROLE_KEY\n\n' +
				'Please ensure these are set in your .env file.'
		);
	}

	return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);
}

/**
 * Get total count of active notifications
 * (excludes soft-deleted notifications)
 */
async function getTotalNotificationCount(supabase: ReturnType<typeof initSupabaseClient>) {
	const { count, error } = await supabase
		.from('notifications')
		.select('*', { count: 'exact', head: true })
		.is('deleted_at', null);

	if (error) {
		throw new Error(`Failed to count notifications: ${error.message}`);
	}

	return count ?? 0;
}

/**
 * Fetch notifications in batches
 */
async function fetchNotificationBatch(
	supabase: ReturnType<typeof initSupabaseClient>,
	offset: number,
	limit: number
): Promise<NotificationPartial[]> {
	const { data, error } = await supabase
		.from('notifications')
		.select('id, message')
		.is('deleted_at', null)
		.range(offset, offset + limit - 1);

	if (error) {
		throw new Error(`Failed to fetch notifications batch: ${error.message}`);
	}

	return data ?? [];
}

/**
 * Update notification with sanitized message
 */
async function updateNotification(
	supabase: ReturnType<typeof initSupabaseClient>,
	notificationId: string,
	sanitizedMessage: string
): Promise<void> {
	const { error } = await supabase
		.from('notifications')
		.update({ message: sanitizedMessage })
		.eq('id', notificationId);

	if (error) {
		throw new Error(`Failed to update notification ${notificationId}: ${error.message}`);
	}
}

/**
 * Main migration function
 */
async function sanitizeExistingNotifications() {
	const startTime = Date.now();

	console.log('\n' + '='.repeat(70));
	console.log('Starting Notification Sanitization Migration');
	console.log('='.repeat(70));
	console.log(`\nTimestamp: ${new Date().toISOString()}`);
	console.log(`Batch size: ${BATCH_SIZE}`);
	console.log(`Progress logging interval: every ${PROGRESS_LOG_INTERVAL} notifications\n`);

	// Initialize Supabase client
	console.log('Initializing Supabase client...');
	const supabase = initSupabaseClient();
	console.log('✓ Supabase client initialized\n');

	// Get total count
	console.log('Counting active notifications...');
	const totalCount = await getTotalNotificationCount(supabase);
	console.log(`✓ Found ${totalCount} active notifications to process\n`);

	if (totalCount === 0) {
		console.log('No notifications to process. Exiting.\n');
		return;
	}

	// Statistics
	let processed = 0;
	let modified = 0;
	let unchanged = 0;
	let errors = 0;

	// Calculate number of batches
	const totalBatches = Math.ceil(totalCount / BATCH_SIZE);

	console.log('Starting sanitization...\n');

	// Process in batches
	for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
		const offset = batchIndex * BATCH_SIZE;
		const batchNumber = batchIndex + 1;

		console.log(
			`Processing batch ${batchNumber}/${totalBatches} (notifications ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalCount)})...`
		);

		try {
			// Fetch batch
			const notifications = await fetchNotificationBatch(supabase, offset, BATCH_SIZE);

			// Process each notification in the batch
			for (const notification of notifications) {
				try {
					// Sanitize the message
					const sanitized = sanitizeNotificationHtml(notification.message);

					// Check if content changed
					if (sanitized !== notification.message) {
						// Update database
						await updateNotification(supabase, notification.id, sanitized);
						modified++;

						// Log modification
						const originalLength = notification.message.length;
						const sanitizedLength = sanitized.length;
						const removed = originalLength - sanitizedLength;

						console.log(
							`  ✓ Sanitized notification ${notification.id} ` +
								`(removed ${removed} bytes, ${Math.round((removed / originalLength) * 100)}%)`
						);
					} else {
						unchanged++;
					}

					processed++;

					// Log progress at intervals
					if (processed % PROGRESS_LOG_INTERVAL === 0) {
						const percentComplete = Math.round((processed / totalCount) * 100);
						console.log(`\nProgress: ${processed}/${totalCount} (${percentComplete}%)`);
						console.log(`  Modified: ${modified}, Unchanged: ${unchanged}, Errors: ${errors}\n`);
					}
				} catch (error) {
					// Log error but continue processing
					errors++;
					console.error(`  ✗ Failed to sanitize notification ${notification.id}:`, error);
					processed++;
				}
			}
		} catch (error) {
			// Log batch error
			console.error(`\n✗ Failed to process batch ${batchNumber}:`, error);
			console.log('Continuing with next batch...\n');
		}
	}

	// Calculate duration
	const endTime = Date.now();
	const duration = endTime - startTime;
	const durationSeconds = (duration / 1000).toFixed(2);

	// Final statistics
	console.log('\n' + '='.repeat(70));
	console.log('Migration Complete');
	console.log('='.repeat(70));
	console.log(`\nTotal processed: ${processed}`);
	console.log(`Modified: ${modified}`);
	console.log(`Unchanged: ${unchanged}`);
	console.log(`Errors: ${errors}`);
	console.log(`\nDuration: ${durationSeconds}s (${duration}ms)`);

	// Success metrics
	const successRate = processed > 0 ? Math.round(((processed - errors) / processed) * 100) : 100;
	const modificationRate = processed > 0 ? Math.round((modified / processed) * 100) : 0;

	console.log(`\nSuccess rate: ${successRate}%`);
	console.log(`Modification rate: ${modificationRate}%`);

	if (errors > 0) {
		console.log(`\n⚠️  Warning: ${errors} notification(s) failed to process.`);
		console.log('Review the error logs above for details.');
	}

	console.log('\nNext steps:');
	if (modified > 0) {
		console.log('1. Review modified notifications in the database');
		console.log('2. Verify that sanitization preserved intended content');
		console.log('3. If satisfied, this migration is complete');
	} else {
		console.log('✓ No notifications required sanitization');
		console.log('✓ All existing notifications were already safe');
	}
	console.log('\n' + '='.repeat(70) + '\n');
}

// Run migration
sanitizeExistingNotifications()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n' + '='.repeat(70));
		console.error('Migration Failed');
		console.error('='.repeat(70));
		console.error('\nError:', error);
		console.error('\n' + '='.repeat(70) + '\n');
		process.exit(1);
	});
