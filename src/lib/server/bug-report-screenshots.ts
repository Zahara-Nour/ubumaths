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
import type { Database } from '#lib/types/database.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { toBrowserAddress } from '#lib/utils/supabase-address.ts';

const logger = createServerLogger('server/bug-report-screenshots');

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
				logger.warn(
					`[bug-report-screenshots] Failed to sign ${report.screenshot_path}:`,
					error?.message ?? 'no signed URL returned'
				);
				report.screenshot_url = null;
				return;
			}

			report.screenshot_url = toBrowserAddress(data.signedUrl);
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

/** Ce qu'est devenue la suppression d'un rapport de bug. */
export type BugReportDeletion = 'deleted' | 'not_found' | 'screenshot_failed' | 'delete_failed';

/**
 * La capture nommée par un rapport est-elle bien la sienne ?
 *
 * ⚠️ `screenshot_path` est une colonne que l'auteur peut écrire lui-même tant
 * que son rapport est en attente (policy « Users can update own pending bug
 * reports »). Sans ce contrôle, un élève y écrirait le chemin de la capture
 * d'un autre, et l'admin l'effacerait en supprimant le rapport. Même règle que
 * la suppression de compte (`20261016101200_suppression_chemins_conformes.sql`) :
 * `<id de l'auteur>/<id du rapport>/<fichier>`, sans segment `..`.
 */
export function isOwnScreenshotPath(
	path: string,
	report: { id: string; user_id: string | null }
): boolean {
	if (!report.user_id) return false;
	const segments = path.split('/');
	if (segments.length !== 3) return false;
	if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
		return false;
	}
	return (
		segments[0].toLowerCase() === report.user_id.toLowerCase() &&
		segments[1].toLowerCase() === report.id.toLowerCase()
	);
}

/**
 * Supprime un rapport de bug ET sa capture d'écran.
 *
 * La capture part du stockage AVANT la ligne : dans l'autre ordre, un échec du
 * stockage laisserait une capture d'élève sans plus aucune ligne qui la nomme.
 * Si la capture ne peut pas être effacée, la ligne est gardée et l'appelant le
 * dit (`screenshot_failed`). Prix de cet ordre, assumé : si la ligne résiste
 * ensuite (refus, course), elle reste avec un chemin qui ne mène plus à rien.
 *
 * Un chemin qui n'est pas celui du rapport (cf. `isOwnScreenshotPath`) n'est
 * jamais effacé : la ligne part seule, et le journal le dit.
 *
 * ⚠️ Le stockage refuse en silence, comme la RLS : `remove` rend alors
 * `{ data: [], error: null }`. Pour l'admin (policy « Admins can manage bug
 * report screenshots »), une liste vide veut dire « fichier déjà absent » : la
 * ligne part quand même, et un avertissement est journalisé.
 *
 * ⚠️ Une suppression refusée par la RLS touche zéro ligne sans erreur : la
 * ligne supprimée est relue (`.select('id')`) avant d'annoncer `deleted`
 * (cf. docs/pratiques/rls-echecs-silencieux.md).
 */
export async function deleteBugReportWithScreenshot(
	supabase: SupabaseClient<Database>,
	reportId: string
): Promise<BugReportDeletion> {
	const { data: report, error: readError } = await supabase
		.from('bug_reports')
		.select('id, user_id, screenshot_path')
		.eq('id', reportId)
		.maybeSingle();

	if (readError) {
		logger.error('[bug-report-screenshots] Lecture du rapport avant suppression :', readError);
		return 'delete_failed';
	}
	if (!report) return 'not_found';

	if (report.screenshot_path && !isOwnScreenshotPath(report.screenshot_path, report)) {
		logger.warn(
			`[bug-report-screenshots] Rapport ${reportId} : chemin de capture non conforme, rien n'est effacé du stockage`
		);
	} else if (report.screenshot_path) {
		const { data: removed, error: removeError } = await supabase.storage
			.from(BUCKET_NAME)
			.remove([report.screenshot_path]);

		if (removeError) {
			logger.error(
				`[bug-report-screenshots] Capture du rapport ${reportId} non effacée :`,
				removeError.message
			);
			return 'screenshot_failed';
		}
		if (!removed || removed.length === 0) {
			logger.warn(
				`[bug-report-screenshots] Rapport ${reportId} : aucune capture effacée (fichier absent, ou stockage qui refuse en silence)`
			);
		}
	}

	const { data: deletedRows, error: deleteError } = await supabase
		.from('bug_reports')
		.delete()
		.eq('id', reportId)
		.select('id');

	if (deleteError) {
		logger.error('[bug-report-screenshots] Suppression du rapport :', deleteError);
		return 'delete_failed';
	}
	if (!deletedRows || deletedRows.length === 0) return 'not_found';

	return 'deleted';
}
