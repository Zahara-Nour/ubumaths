/**
 * Server-side Error Monitoring Utilities
 *
 * Provides functions for logging, retrieving, and managing application errors.
 * Integrates with Supabase for storage and existing notification system for alerts.
 *
 * Privacy & Security:
 * - Sanitizes sensitive data from contexts
 * - Admin-only access enforced via RLS
 * - Automatic notification for critical errors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createSystemNotification } from './notifications';
import { dev } from '$app/environment';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Create a service role client for error logging (bypasses RLS)
 * This is necessary because error logging should always work regardless of user permissions
 */
function getServiceRoleClient(): SupabaseClient<Database> {
	return createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// =====================================================
// TYPES
// =====================================================

export type ErrorType =
	| 'client_js'
	| 'server_api'
	| 'server_load'
	| 'server_action'
	| 'validation'
	| 'performance'
	| 'database';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface LogErrorData {
	// Required
	error_type: ErrorType;
	message: string;
	url: string;

	// Optional - Error details
	severity?: ErrorSeverity;
	stack_trace?: string;
	error_name?: string;
	file_path?: string;
	line_number?: number;
	column_number?: number;

	// Optional - User context
	user_id?: string;
	user_role?: 'student' | 'teacher' | 'admin';
	session_id?: string;

	// Optional - Request context (server errors)
	request_method?: string;
	status_code?: number;
	request_headers?: Record<string, string>;
	request_body?: Record<string, any>;
	response_time?: number;

	// Optional - Browser context (client errors)
	user_agent?: string;
	browser_name?: string;
	browser_version?: string;
	os_name?: string;
	device_type?: 'mobile' | 'tablet' | 'desktop';
	viewport_width?: number;
	viewport_height?: number;

	// Optional - Additional context
	context?: Record<string, any>;
	tags?: string[];
}

export interface ErrorLog extends LogErrorData {
	id: string;
	error_signature: string | null;
	resolved: boolean;
	resolved_by: string | null;
	resolved_at: string | null;
	resolution_notes: string | null;
	created_at: string;
}

export interface ErrorOccurrence {
	id: string;
	error_signature: string;
	error_type: ErrorType;
	severity: ErrorSeverity;
	message: string;
	url: string | null;
	file_path: string | null;
	line_number: number | null;
	first_seen: string;
	last_seen: string;
	occurrence_count: number;
	last_error_log_id: string | null;
	is_resolved: boolean;
	created_at: string;
	updated_at: string;
}

export interface ErrorStats {
	total_errors: number;
	unresolved_errors: number;
	critical_errors: number;
	errors_last_hour: number;
	unique_errors: number;
	most_common_error_type: ErrorType | null;
}

export interface ErrorFilters {
	error_type?: ErrorType | ErrorType[];
	severity?: ErrorSeverity | ErrorSeverity[];
	resolved?: boolean;
	user_id?: string;
	date_from?: string;
	date_to?: string;
	search?: string; // Search in message
	limit?: number;
	offset?: number;
}

// =====================================================
// PRIVACY & SANITIZATION
// =====================================================

/**
 * Sensitive field patterns to redact from contexts
 */
const SENSITIVE_PATTERNS = [
	/password/i,
	/token/i,
	/secret/i,
	/api[_-]?key/i,
	/auth/i,
	/credential/i,
	/session/i
];

/**
 * Sanitize an object by removing sensitive fields
 */
function sanitizeObject(obj: Record<string, any> | null | undefined): Record<string, any> | null {
	if (!obj || typeof obj !== 'object') return null;

	const sanitized: Record<string, any> = {};

	for (const [key, value] of Object.entries(obj)) {
		// Check if key matches sensitive pattern
		const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

		if (isSensitive) {
			sanitized[key] = '[REDACTED]';
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			// Recursively sanitize nested objects
			sanitized[key] = sanitizeObject(value);
		} else if (Array.isArray(value)) {
			// Sanitize arrays of objects
			sanitized[key] = value.map((item) =>
				typeof item === 'object' ? sanitizeObject(item) : item
			);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Sanitize error data before logging
 */
function sanitizeErrorData(data: LogErrorData): LogErrorData {
	const sanitized = { ...data };

	// Sanitize request headers
	if (sanitized.request_headers) {
		sanitized.request_headers = sanitizeObject(sanitized.request_headers) as Record<
			string,
			string
		>;
	}

	// Sanitize request body
	if (sanitized.request_body) {
		sanitized.request_body = sanitizeObject(sanitized.request_body);
	}

	// Sanitize context
	if (sanitized.context) {
		sanitized.context = sanitizeObject(sanitized.context);
	}

	// Redact email addresses from stack traces
	if (sanitized.stack_trace) {
		sanitized.stack_trace = sanitized.stack_trace.replace(
			/[\w\.-]+@[\w\.-]+\.\w+/g,
			'[email]@[domain]'
		);
	}

	// Redact email addresses from messages
	if (sanitized.message) {
		sanitized.message = sanitized.message.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[email]@[domain]');
	}

	return sanitized;
}

/**
 * Truncate long strings to prevent database bloat
 */
function truncateString(str: string | null | undefined, maxLength: number): string | null {
	if (!str) return null;
	return str.length > maxLength ? str.substring(0, maxLength) + '...[truncated]' : str;
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Log an error to the database
 *
 * @param supabase - Supabase client (not used, kept for compatibility)
 * @param data - Error data to log
 * @returns Success status and error log ID
 */
export async function logError(
	supabase: SupabaseClientType,
	data: LogErrorData
): Promise<{ success: boolean; id?: string; error?: string }> {
	try {
		// In development, also log to console
		if (dev) {
			console.error('[ERROR MONITORING]', {
				type: data.error_type,
				severity: data.severity || 'error',
				message: data.message,
				url: data.url
			});
		}

		// Sanitize sensitive data
		const sanitized = sanitizeErrorData(data);

		// Truncate long fields
		const truncated = {
			...sanitized,
			message: truncateString(sanitized.message, 1000),
			stack_trace: truncateString(sanitized.stack_trace, 5000),
			url: truncateString(sanitized.url, 500)
		};

		// Use service role client to bypass RLS
		const serviceClient = getServiceRoleClient();

		// Insert error log
		const { data: errorLog, error: insertError } = await serviceClient
			.from('error_logs')
			.insert({
				error_type: truncated.error_type,
				severity: truncated.severity || 'error',
				message: truncated.message || 'Unknown error',
				stack_trace: truncated.stack_trace,
				error_name: truncated.error_name,
				file_path: truncated.file_path,
				line_number: truncated.line_number,
				column_number: truncated.column_number,
				url: truncated.url || 'unknown',
				user_id: truncated.user_id,
				user_role: truncated.user_role,
				session_id: truncated.session_id,
				request_method: truncated.request_method,
				status_code: truncated.status_code,
				request_headers: truncated.request_headers,
				request_body: truncated.request_body,
				response_time: truncated.response_time,
				user_agent: truncated.user_agent,
				browser_name: truncated.browser_name,
				browser_version: truncated.browser_version,
				os_name: truncated.os_name,
				device_type: truncated.device_type,
				viewport_width: truncated.viewport_width,
				viewport_height: truncated.viewport_height,
				context: truncated.context,
				tags: truncated.tags
			})
			.select('id, severity, error_signature')
			.single();

		if (insertError) {
			console.error('Failed to insert error log:', insertError);
			return { success: false, error: 'Failed to log error' };
		}

		// Check if we should send notification for critical errors
		if (errorLog.severity === 'critical') {
			await notifyCriticalError(supabase, errorLog.id, truncated);
		}

		return { success: true, id: errorLog.id };
	} catch (error) {
		console.error('Error in logError:', error);
		return { success: false, error: 'Unexpected error while logging' };
	}
}

/**
 * Send notification for critical errors
 */
async function notifyCriticalError(
	supabase: SupabaseClientType,
	errorId: string,
	errorData: LogErrorData
): Promise<void> {
	try {
		// Use service role client for system notifications
		const serviceClient = getServiceRoleClient();

		// Create system notification for admins
		await createSystemNotification(serviceClient, {
			title: '🚨 Erreur Critique Détectée',
			message: `<p><strong>Type:</strong> ${errorData.error_type}</p>
				<p><strong>Message:</strong> ${errorData.message}</p>
				<p><strong>URL:</strong> ${errorData.url}</p>
				${errorData.user_role ? `<p><strong>Rôle utilisateur:</strong> ${errorData.user_role}</p>` : ''}`,
			type: 'alert',
			priority: 'urgent',
			action_label: 'Voir les détails',
			action_url: `/dashboard/admin/errors/${errorId}`,
			target_type: 'role',
			target_roles: ['admin'],
			system_event_type: 'error_critical'
		});
	} catch (error) {
		console.error('Failed to send critical error notification:', error);
		// Don't throw - notification failure shouldn't prevent error logging
	}
}

/**
 * Get error statistics for dashboard
 */
export async function getErrorStats(
	supabase: SupabaseClientType,
	hours: number = 24
): Promise<{ success: boolean; data?: ErrorStats; error?: string }> {
	try {
		const { data, error } = await supabase.rpc('get_error_stats', { p_hours: hours }).single();

		if (error) {
			console.error('Failed to get error stats:', error);
			return { success: false, error: 'Failed to retrieve statistics' };
		}

		return {
			success: true,
			data: {
				total_errors: Number(data.total_errors),
				unresolved_errors: Number(data.unresolved_errors),
				critical_errors: Number(data.critical_errors),
				errors_last_hour: Number(data.errors_last_hour),
				unique_errors: Number(data.unique_errors),
				most_common_error_type: data.most_common_error_type
			}
		};
	} catch (error) {
		console.error('Error in getErrorStats:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Get error logs with optional filters
 */
export async function getErrorLogs(
	supabase: SupabaseClientType,
	filters: ErrorFilters = {}
): Promise<{ success: boolean; data?: ErrorLog[]; count?: number; error?: string }> {
	try {
		let query = supabase.from('error_logs').select('*', { count: 'exact' });

		// Apply filters
		if (filters.error_type) {
			if (Array.isArray(filters.error_type)) {
				query = query.in('error_type', filters.error_type);
			} else {
				query = query.eq('error_type', filters.error_type);
			}
		}

		if (filters.severity) {
			if (Array.isArray(filters.severity)) {
				query = query.in('severity', filters.severity);
			} else {
				query = query.eq('severity', filters.severity);
			}
		}

		if (filters.resolved !== undefined) {
			query = query.eq('resolved', filters.resolved);
		}

		if (filters.user_id) {
			query = query.eq('user_id', filters.user_id);
		}

		if (filters.date_from) {
			query = query.gte('created_at', filters.date_from);
		}

		if (filters.date_to) {
			query = query.lte('created_at', filters.date_to);
		}

		if (filters.search) {
			query = query.ilike('message', `%${filters.search}%`);
		}

		// Sorting and pagination
		query = query.order('created_at', { ascending: false });

		if (filters.limit) {
			query = query.limit(filters.limit);
		}

		if (filters.offset) {
			query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
		}

		const { data, error, count } = await query;

		if (error) {
			console.error('Failed to get error logs:', error);
			return { success: false, error: 'Failed to retrieve errors' };
		}

		return { success: true, data: data as ErrorLog[], count: count || 0 };
	} catch (error) {
		console.error('Error in getErrorLogs:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Get error occurrences (deduplicated errors)
 */
export async function getErrorOccurrences(
	supabase: SupabaseClientType,
	filters: Omit<ErrorFilters, 'user_id'> = {}
): Promise<{ success: boolean; data?: ErrorOccurrence[]; count?: number; error?: string }> {
	try {
		let query = supabase.from('error_occurrences').select('*', { count: 'exact' });

		// Apply filters
		if (filters.error_type) {
			if (Array.isArray(filters.error_type)) {
				query = query.in('error_type', filters.error_type);
			} else {
				query = query.eq('error_type', filters.error_type);
			}
		}

		if (filters.severity) {
			if (Array.isArray(filters.severity)) {
				query = query.in('severity', filters.severity);
			} else {
				query = query.eq('severity', filters.severity);
			}
		}

		if (filters.resolved !== undefined) {
			query = query.eq('is_resolved', filters.resolved);
		}

		if (filters.search) {
			query = query.ilike('message', `%${filters.search}%`);
		}

		// Sorting and pagination
		query = query.order('occurrence_count', { ascending: false });

		if (filters.limit) {
			query = query.limit(filters.limit);
		}

		if (filters.offset) {
			query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
		}

		const { data, error, count } = await query;

		if (error) {
			console.error('Failed to get error occurrences:', error);
			return { success: false, error: 'Failed to retrieve error occurrences' };
		}

		return { success: true, data: data as ErrorOccurrence[], count: count || 0 };
	} catch (error) {
		console.error('Error in getErrorOccurrences:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Get single error log by ID
 */
export async function getErrorLog(
	supabase: SupabaseClientType,
	errorId: string
): Promise<{ success: boolean; data?: ErrorLog; error?: string }> {
	try {
		const { data, error } = await supabase
			.from('error_logs')
			.select('*')
			.eq('id', errorId)
			.single();

		if (error) {
			console.error('Failed to get error log:', error);
			return { success: false, error: 'Error not found' };
		}

		return { success: true, data: data as ErrorLog };
	} catch (error) {
		console.error('Error in getErrorLog:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Resolve an error
 */
export async function resolveError(
	supabase: SupabaseClientType,
	errorId: string,
	userId: string,
	notes?: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.rpc('resolve_error', {
			p_error_log_id: errorId,
			p_resolved_by: userId,
			p_notes: notes || null
		});

		if (error) {
			console.error('Failed to resolve error:', error);
			return { success: false, error: 'Failed to resolve error' };
		}

		return { success: true };
	} catch (error) {
		console.error('Error in resolveError:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Bulk resolve errors by signature
 */
export async function resolveErrorBySignature(
	supabase: SupabaseClientType,
	errorSignature: string,
	userId: string,
	notes?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
	try {
		const { data, error } = await supabase.rpc('resolve_error_by_signature', {
			p_error_signature: errorSignature,
			p_resolved_by: userId,
			p_notes: notes || null
		});

		if (error) {
			console.error('Failed to bulk resolve errors:', error);
			return { success: false, error: 'Failed to resolve errors' };
		}

		return { success: true, count: data as number };
	} catch (error) {
		console.error('Error in resolveErrorBySignature:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Cleanup old resolved errors
 */
export async function cleanupOldErrors(
	supabase: SupabaseClientType,
	daysOld: number = 90
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
	try {
		const { data, error } = await supabase.rpc('cleanup_old_errors', {
			p_days_old: daysOld
		});

		if (error) {
			console.error('Failed to cleanup errors:', error);
			return { success: false, error: 'Failed to cleanup errors' };
		}

		return { success: true, deletedCount: data as number };
	} catch (error) {
		console.error('Error in cleanupOldErrors:', error);
		return { success: false, error: 'Unexpected error' };
	}
}

/**
 * Helper to extract user context from session
 */
export async function getUserContext(
	supabase: SupabaseClientType,
	userId?: string
): Promise<{ user_id?: string; user_role?: 'student' | 'teacher' | 'admin' }> {
	if (!userId) return {};

	try {
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', userId)
			.single();

		if (!profile) return { user_id: userId };

		return {
			user_id: userId,
			user_role: profile.role as 'student' | 'teacher' | 'admin'
		};
	} catch {
		return { user_id: userId };
	}
}
