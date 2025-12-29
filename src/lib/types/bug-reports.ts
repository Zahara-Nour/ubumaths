/**
 * Bug Reports Type Definitions
 *
 * Dedicated types for the bug reporting system.
 * These complement the auto-generated database types.
 */

import type { Database } from './database';

// =============================================================================
// Database Types (from Supabase)
// =============================================================================

export type BugReport = Database['public']['Tables']['bug_reports']['Row'];
export type BugReportInsert = Database['public']['Tables']['bug_reports']['Insert'];
export type BugReportUpdate = Database['public']['Tables']['bug_reports']['Update'];

// =============================================================================
// Enum Types
// =============================================================================

export type BugReportCategory = 'bug' | 'content' | 'ux' | 'feature' | 'other';
export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugReportStatus =
	| 'pending'
	| 'acknowledged'
	| 'in_progress'
	| 'resolved'
	| 'wont_fix'
	| 'duplicate';

// =============================================================================
// Labels (French UI)
// =============================================================================

export const BUG_REPORT_CATEGORY_LABELS: Record<BugReportCategory, string> = {
	bug: 'Bug technique',
	content: 'Erreur de contenu',
	ux: "Problème d'ergonomie",
	feature: 'Suggestion',
	other: 'Autre'
};

export const BUG_REPORT_SEVERITY_LABELS: Record<BugReportSeverity, string> = {
	low: 'Faible',
	medium: 'Moyenne',
	high: 'Haute',
	critical: 'Critique'
};

export const BUG_REPORT_STATUS_LABELS: Record<BugReportStatus, string> = {
	pending: 'En attente',
	acknowledged: 'Pris en compte',
	in_progress: 'En cours',
	resolved: 'Résolu',
	wont_fix: 'Non corrigé',
	duplicate: 'Doublon'
};

// =============================================================================
// Icons/Colors for UI
// =============================================================================

export const BUG_REPORT_CATEGORY_ICONS: Record<BugReportCategory, string> = {
	bug: '🐛',
	content: '📝',
	ux: '🎨',
	feature: '💡',
	other: '❓'
};

export const BUG_REPORT_SEVERITY_COLORS: Record<BugReportSeverity, string> = {
	low: 'text-muted-foreground',
	medium: 'text-yellow-600 dark:text-yellow-400',
	high: 'text-orange-600 dark:text-orange-400',
	critical: 'text-red-600 dark:text-red-400'
};

export const BUG_REPORT_STATUS_COLORS: Record<BugReportStatus, string> = {
	pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
	acknowledged: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
	resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	wont_fix: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
	duplicate: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
};

// =============================================================================
// Session Context Types
// =============================================================================

/** Error captured from error_logs */
export interface CapturedError {
	id: string;
	type: string;
	message: string;
	severity: string;
	timestamp: string;
	url?: string;
	file_path?: string;
	line_number?: number;
	stack_trace?: string;
}

/** Freeze event from client-side detection */
export interface FreezeEvent {
	id: string;
	timestamp: string;
	duration: number;
	type: 'long_task' | 'unresponsive';
	context?: {
		url?: string;
		lastAction?: string;
	};
}

/** User action for activity tracking */
export interface UserAction {
	type: 'click' | 'input' | 'navigation' | 'scroll';
	target: string;
	timestamp: string;
}

/** Slow request from server monitoring */
export interface SlowRequest {
	url: string;
	duration: number;
	status: number;
}

/** Web Vitals metrics */
export interface WebVitalsMetrics {
	LCP?: number;
	FID?: number;
	CLS?: number;
	FCP?: number;
	TTFB?: number;
	INP?: number;
}

/** Complete session context attached to bug reports */
export interface BugReportSessionContext {
	// Captured at submission time
	capturedAt: string;

	// Recent errors from error_logs (server-side enrichment)
	recentErrors?: CapturedError[];

	// Slow requests (server-side enrichment)
	slowRequests?: SlowRequest[];

	// Freeze events (client-side)
	freezeEvents?: FreezeEvent[];

	// Recent user actions (client-side)
	recentActions?: UserAction[];

	// Web Vitals (client-side)
	webVitals?: WebVitalsMetrics;

	// Additional context
	exerciseId?: string;
	exerciseType?: string;
	classId?: string;
	assignmentId?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/** Create bug report request body */
export interface CreateBugReportRequest {
	category: BugReportCategory;
	severity: BugReportSeverity;
	title: string;
	description: string;
	pageUrl?: string;
	userAgent?: string;
	viewportSize?: string;
	sessionContext?: BugReportSessionContext;
	screenshotUrl?: string;
	screenshotPath?: string;
	autoGenerated?: boolean;
}

/** Update bug report request body (user) */
export interface UpdateBugReportUserRequest {
	title?: string;
	description?: string;
}

/** Update bug report request body (admin) */
export interface UpdateBugReportAdminRequest {
	status?: BugReportStatus;
	resolutionNotes?: string;
}

/** Bug report with author info */
export interface BugReportWithAuthor extends BugReport {
	author?: {
		id: string;
		full_name: string | null;
		email: string;
		role: string;
	};
	resolver?: {
		id: string;
		full_name: string | null;
	};
}

/** List bug reports query params */
export interface ListBugReportsQuery {
	status?: BugReportStatus;
	category?: BugReportCategory;
	severity?: BugReportSeverity;
	limit?: number;
	offset?: number;
}

/** List bug reports response */
export interface ListBugReportsResponse {
	reports: BugReportWithAuthor[];
	total: number;
	limit: number;
	offset: number;
}

// =============================================================================
// Export Types
// =============================================================================

/** Claude Code export format */
export interface ClaudeCodeExport {
	markdown: string;
	filename: string;
	generatedAt: string;
}

// =============================================================================
// Config Types
// =============================================================================

/** Bug reports feature configuration */
export interface BugReportsConfig {
	fabEnabled: boolean;
	freezeDetectionEnabled: boolean;
	freezePromptEnabled: boolean;
	autoReportEnabled: boolean;
	updatedAt: string;
}

/** Default configuration values */
export const DEFAULT_BUG_REPORTS_CONFIG: BugReportsConfig = {
	fabEnabled: true,
	freezeDetectionEnabled: true,
	freezePromptEnabled: true,
	autoReportEnabled: true,
	updatedAt: new Date().toISOString()
};

/** Config feature flag labels (French UI) */
export const BUG_REPORTS_CONFIG_LABELS: Record<keyof Omit<BugReportsConfig, 'updatedAt'>, string> =
	{
		fabEnabled: 'Bouton de signalement (FAB)',
		freezeDetectionEnabled: 'Détection des freezes',
		freezePromptEnabled: 'Alerte freeze (15s)',
		autoReportEnabled: 'Rapport automatique (30s)'
	};

/** Config feature flag descriptions (French UI) */
export const BUG_REPORTS_CONFIG_DESCRIPTIONS: Record<
	keyof Omit<BugReportsConfig, 'updatedAt'>,
	string
> = {
	fabEnabled: 'Affiche le bouton flottant pour signaler un bug',
	freezeDetectionEnabled: 'Active la détection automatique des ralentissements',
	freezePromptEnabled: 'Affiche une alerte après 15 secondes de freeze',
	autoReportEnabled: 'Envoie automatiquement un rapport après 30 secondes de freeze'
};
