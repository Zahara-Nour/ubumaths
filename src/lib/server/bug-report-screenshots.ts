/**
 * Bug Report Screenshots - Signed URL helper
 * ===========================================
 *
 * The `bug-report-screenshots` bucket is PRIVATE (no public URL, no anonymous
 * listing). Screenshots are read via short-lived signed URLs generated on the
 * server for the report owner (own folder) or admins (RLS-enforced).
 *
 * `bug_reports.screenshot_url` is no longer a durable public URL: it is
 * repopulated at load time with a fresh signed URL derived from
 * `screenshot_path`. Components keep reading `screenshot_url` unchanged.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const BUCKET_NAME = 'bug-report-screenshots';

/** Signed URL validity for in-app display (1 hour). */
export const DISPLAY_SIGNED_URL_TTL = 60 * 60;

/** Signed URL validity for the Claude Code markdown export (7 days). */
export const EXPORT_SIGNED_URL_TTL = 7 * 24 * 60 * 60;

/** Minimal shape needed to sign: a report carrying a storage path + url field. */
interface SignableReport {
	screenshot_path?: string | null;
	screenshot_url?: string | null;
}

/**
 * Replace `screenshot_url` with a fresh signed URL for each report that has a
 * `screenshot_path`. Reports without a path are left untouched. On signing
 * failure the url is set to null (never leaves a broken/stale URL in place).
 *
 * Mutates and returns the same array for ergonomic use in load functions.
 */
export async function signBugReportScreenshots<T extends SignableReport>(
	supabase: SupabaseClient<Database>,
	reports: T[],
	expiresIn: number = DISPLAY_SIGNED_URL_TTL
): Promise<T[]> {
	await Promise.all(
		reports.map(async (report) => {
			if (!report.screenshot_path) return;

			const { data, error } = await supabase.storage
				.from(BUCKET_NAME)
				.createSignedUrl(report.screenshot_path, expiresIn);

			if (error || !data?.signedUrl) {
				console.warn(
					`[bug-report-screenshots] Failed to sign ${report.screenshot_path}:`,
					error?.message ?? 'no signed URL returned'
				);
				report.screenshot_url = null;
				return;
			}

			report.screenshot_url = data.signedUrl;
		})
	);

	return reports;
}

/**
 * Sign a single report's screenshot in place. Convenience wrapper around
 * {@link signBugReportScreenshots} for single-record endpoints (e.g. export).
 */
export async function signBugReportScreenshot<T extends SignableReport>(
	supabase: SupabaseClient<Database>,
	report: T,
	expiresIn: number = DISPLAY_SIGNED_URL_TTL
): Promise<T> {
	await signBugReportScreenshots(supabase, [report], expiresIn);
	return report;
}
