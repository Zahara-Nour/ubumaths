/**
 * Erreurs récentes d'un signalement, jointes au moment où l'admin le lit.
 * ======================================================================
 *
 * Les erreurs du journal (`error_logs`) ne sont lisibles que par l'admin
 * (décision du 2026-10-13). Elles ne sont donc pas copiées dans le signalement,
 * que son auteur peut relire : elles sont lues ici, avec le client de l'admin,
 * pour l'auteur du signalement et les 5 minutes qui précèdent sa création.
 *
 * Le journal est purgé après 30 jours : un signalement plus ancien n'a plus
 * d'erreurs à joindre.
 *
 * @module lib/server/bug-report-errors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import type { CapturedError, SlowRequest } from '$lib/types/bug-reports';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('lib/server/bug-report-errors');

/** Fenêtre lue avant la création du signalement. */
export const REPORT_ERRORS_WINDOW_MS = 5 * 60 * 1000;
const MAX_ERRORS_PER_REPORT = 10;
const MAX_SLOW_REQUESTS_PER_REPORT = 5;
// Borne de la lecture groupée : une liste de signalements ne doit pas tirer
// tout le journal.
const MAX_ROWS = 2000;

interface ReportLike {
	user_id: string;
	created_at: string;
	session_context: Json | null;
}

function contextOf(report: ReportLike): Record<string, unknown> {
	const ctx = report.session_context;
	return ctx && typeof ctx === 'object' && !Array.isArray(ctx) ? { ...ctx } : {};
}

/**
 * Joint à chaque signalement (`session_context.recentErrors` et `slowRequests`)
 * les erreurs de son auteur dans les 5 minutes qui précèdent sa création. Une
 * seule lecture pour toute la liste. Ce qui était déjà dans le contexte est
 * remplacé. Si la lecture échoue, les signalements restent sans erreurs.
 */
export async function attachReportErrors(
	supabase: SupabaseClient<Database>,
	reports: ReportLike[]
): Promise<void> {
	// Une copie ancienne ou fabriquée ne doit jamais s'afficher comme le journal.
	for (const report of reports) {
		const ctx = contextOf(report);
		delete ctx.recentErrors;
		delete ctx.slowRequests;
		report.session_context = ctx as Json;
	}
	if (reports.length === 0) return;

	const times = reports.map((r) => new Date(r.created_at).getTime());
	const from = new Date(Math.min(...times) - REPORT_ERRORS_WINDOW_MS).toISOString();
	const to = new Date(Math.max(...times)).toISOString();
	const userIds = [...new Set(reports.map((r) => r.user_id))];

	const { data: rows, error } = await supabase
		.from('error_logs')
		.select(
			'id, user_id, error_type, message, severity, created_at, url, file_path, line_number, stack_trace, response_time, status_code'
		)
		.in('user_id', userIds)
		.gte('created_at', from)
		.lte('created_at', to)
		.order('created_at', { ascending: false })
		.limit(MAX_ROWS);

	if (error) {
		logger.error('Erreurs des signalements illisibles :', error);
		return;
	}
	// Plafond atteint : les signalements les plus anciens de la liste peuvent
	// paraître sans erreurs. Le dire plutôt que le taire.
	if ((rows?.length ?? 0) >= MAX_ROWS) {
		logger.warn(`Erreurs des signalements tronquées à ${MAX_ROWS} lignes`);
	}

	for (const report of reports) {
		const end = new Date(report.created_at).getTime();
		const start = end - REPORT_ERRORS_WINDOW_MS;
		const mine = (rows ?? []).filter((row) => {
			const t = new Date(row.created_at).getTime();
			return row.user_id === report.user_id && t >= start && t <= end;
		});

		const recentErrors: CapturedError[] = mine
			.filter((row) => row.error_type !== 'performance')
			.slice(0, MAX_ERRORS_PER_REPORT)
			.map((row) => ({
				id: row.id,
				type: row.error_type,
				message: row.message?.substring(0, 500) || '',
				severity: row.severity || 'error',
				timestamp: row.created_at,
				url: row.url ?? undefined,
				file_path: row.file_path ?? undefined,
				line_number: row.line_number ?? undefined,
				stack_trace: row.stack_trace?.substring(0, 2000)
			}));

		const slowRequests: SlowRequest[] = mine
			.filter((row) => row.error_type === 'performance')
			.slice(0, MAX_SLOW_REQUESTS_PER_REPORT)
			.map((row) => ({
				url: row.url || '',
				duration: row.response_time || 0,
				status: row.status_code || 0
			}));

		report.session_context = {
			...contextOf(report),
			recentErrors,
			slowRequests
		} as unknown as Json;
	}
}
