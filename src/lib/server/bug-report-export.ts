/**
 * Bug Report Export Generator
 *
 * Generates Markdown exports optimized for Claude Code debugging.
 */

import type {
	BugReportWithAuthor,
	BugReportSessionContext,
	CapturedError,
	ClaudeCodeExport
} from '$lib/types/bug-reports';
import {
	BUG_REPORT_CATEGORY_LABELS,
	BUG_REPORT_SEVERITY_LABELS,
	BUG_REPORT_STATUS_LABELS
} from '$lib/types/bug-reports';

/**
 * Extract file paths from stack traces
 */
function extractFilePaths(stackTrace: string): string[] {
	const paths: string[] = [];
	// Match patterns like "at functionName (src/lib/file.ts:42:15)" or "src/routes/+page.svelte:18"
	const regex = /(?:at\s+\w+\s+\()?(?:\/home\/\w+\/\w+\/)?(src\/[^:)\s]+):(\d+)/g;
	let match;

	while ((match = regex.exec(stackTrace)) !== null) {
		const filePath = match[1];
		const lineNumber = match[2];
		const fullPath = `${filePath}:${lineNumber}`;
		if (!paths.includes(fullPath)) {
			paths.push(fullPath);
		}
	}

	return paths;
}

/**
 * Extract unique file paths from multiple errors
 */
function extractAllFilePaths(errors: CapturedError[]): string[] {
	const allPaths: string[] = [];

	for (const error of errors) {
		if (error.file_path && error.line_number) {
			const path = `${error.file_path}:${error.line_number}`;
			if (!allPaths.includes(path)) {
				allPaths.push(path);
			}
		}
		if (error.stack_trace) {
			const stackPaths = extractFilePaths(error.stack_trace);
			for (const p of stackPaths) {
				if (!allPaths.includes(p)) {
					allPaths.push(p);
				}
			}
		}
	}

	return allPaths;
}

/**
 * Infer potential files from page URL
 */
function inferFilesFromUrl(pageUrl: string): string[] {
	const files: string[] = [];

	try {
		const url = new URL(pageUrl, 'http://localhost');
		let path = url.pathname;

		// Remove trailing slash
		if (path.endsWith('/') && path.length > 1) {
			path = path.slice(0, -1);
		}

		// Handle route groups and convert to file paths
		if (path === '/') {
			files.push('src/routes/+page.svelte');
			files.push('src/routes/+page.server.ts');
		} else {
			// Convert URL path to potential route files
			// e.g., /dashboard/student/reports -> src/routes/(protected)/dashboard/student/reports/
			const segments = path.split('/').filter(Boolean);

			// Try with common route groups
			const routeGroups = ['', '(public)', '(protected)'];
			for (const group of routeGroups) {
				const routePath = group
					? `src/routes/${group}/${segments.join('/')}`
					: `src/routes/${segments.join('/')}`;

				files.push(`${routePath}/+page.svelte`);
				files.push(`${routePath}/+page.server.ts`);
			}

			// Also check for API routes if it looks like an API call
			if (path.startsWith('/api/')) {
				files.push(`src/routes${path}/+server.ts`);
			}
		}
	} catch {
		// Invalid URL, skip
	}

	return files;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
	try {
		const date = new Date(timestamp);
		return date.toLocaleString('fr-FR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	} catch {
		return timestamp;
	}
}

/**
 * Format time only (HH:mm:ss)
 */
function formatTime(timestamp: string): string {
	try {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	} catch {
		return timestamp;
	}
}

/**
 * Parse browser info from user agent
 */
function parseBrowserInfo(userAgent: string): string {
	if (!userAgent) return 'Inconnu';

	// Simple browser detection
	if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
		const match = userAgent.match(/Chrome\/(\d+)/);
		return `Chrome ${match?.[1] || ''}`;
	}
	if (userAgent.includes('Firefox')) {
		const match = userAgent.match(/Firefox\/(\d+)/);
		return `Firefox ${match?.[1] || ''}`;
	}
	if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
		const match = userAgent.match(/Version\/(\d+)/);
		return `Safari ${match?.[1] || ''}`;
	}
	if (userAgent.includes('Edg')) {
		const match = userAgent.match(/Edg\/(\d+)/);
		return `Edge ${match?.[1] || ''}`;
	}

	return userAgent.substring(0, 50);
}

/**
 * Parse OS from user agent
 */
function parseOsInfo(userAgent: string): string {
	if (!userAgent) return 'Inconnu';

	if (userAgent.includes('Windows NT 10')) return 'Windows 10/11';
	if (userAgent.includes('Windows')) return 'Windows';
	if (userAgent.includes('Mac OS X')) return 'macOS';
	if (userAgent.includes('Linux')) return 'Linux';
	if (userAgent.includes('Android')) return 'Android';
	if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';

	return 'Autre';
}

/**
 * Generate Claude Code export markdown
 */
export function generateClaudeCodeExport(report: BugReportWithAuthor): ClaudeCodeExport {
	const context = (report.session_context as unknown as BugReportSessionContext) || {};
	const generatedAt = new Date().toISOString();

	// Extract all potential file paths
	const errorFilePaths = context.recentErrors ? extractAllFilePaths(context.recentErrors) : [];
	const urlFilePaths = report.page_url ? inferFilesFromUrl(report.page_url) : [];
	const allFilePaths = [...new Set([...errorFilePaths, ...urlFilePaths])];

	// Build markdown
	const sections: string[] = [];

	// Header
	sections.push(`# Bug Report: ${report.title}`);
	sections.push('');

	// General info
	sections.push('## Informations générales');
	sections.push(`- **ID**: \`${report.id}\``);
	sections.push(
		`- **Catégorie**: ${BUG_REPORT_CATEGORY_LABELS[report.category as keyof typeof BUG_REPORT_CATEGORY_LABELS] ?? report.category} (${report.category})`
	);
	sections.push(
		`- **Sévérité**: ${BUG_REPORT_SEVERITY_LABELS[report.severity as keyof typeof BUG_REPORT_SEVERITY_LABELS] ?? report.severity} (${report.severity})`
	);
	sections.push(
		`- **Statut**: ${BUG_REPORT_STATUS_LABELS[report.status as keyof typeof BUG_REPORT_STATUS_LABELS] ?? report.status} (${report.status})`
	);
	sections.push(`- **Créé le**: ${formatTimestamp(report.created_at)}`);

	if (report.author) {
		const authorInfo = report.author as { full_name: string | null; email: string; role: string };
		sections.push(`- **Auteur**: ${authorInfo.full_name || authorInfo.email} (${authorInfo.role})`);
	}

	if (report.auto_generated) {
		sections.push(`- **Type**: Rapport auto-généré (freeze détecté)`);
	}

	sections.push('');

	// Description
	sections.push('## Description du problème');
	sections.push('');
	sections.push(report.description);
	sections.push('');

	// Technical context
	sections.push('## Contexte technique');
	sections.push('');

	// Page info
	sections.push('### Page concernée');
	sections.push(`- **URL**: ${report.page_url || 'Non capturée'}`);
	sections.push(`- **Viewport**: ${report.viewport_size || 'Non capturé'}`);
	sections.push(`- **Navigateur**: ${parseBrowserInfo(report.user_agent || '')}`);
	sections.push(`- **OS**: ${parseOsInfo(report.user_agent || '')}`);
	sections.push('');

	// Recent errors
	if (context.recentErrors && context.recentErrors.length > 0) {
		sections.push('### Erreurs récentes (5 dernières minutes)');
		sections.push('');
		sections.push('| Timestamp | Type | Sévérité | Message | Fichier |');
		sections.push('|-----------|------|----------|---------|---------|');

		for (const err of context.recentErrors.slice(0, 10)) {
			const time = formatTime(err.timestamp);
			const file = err.file_path ? `${err.file_path}:${err.line_number || '?'}` : '-';
			const message = (err.message || '').substring(0, 50).replace(/\|/g, '\\|');
			sections.push(`| ${time} | ${err.type} | ${err.severity} | ${message}... | ${file} |`);
		}
		sections.push('');

		// Stack traces
		const errorsWithStacks = context.recentErrors.filter((e) => e.stack_trace);
		if (errorsWithStacks.length > 0) {
			sections.push('### Stack traces');
			sections.push('');

			for (const err of errorsWithStacks.slice(0, 3)) {
				sections.push(`**${err.type}**: ${(err.message || '').substring(0, 100)}`);
				sections.push('```');
				sections.push(err.stack_trace || '');
				sections.push('```');
				sections.push('');
			}
		}
	}

	// Freezes
	if (context.freezeEvents && context.freezeEvents.length > 0) {
		sections.push('### Freezes détectés');
		sections.push('');
		sections.push('| Timestamp | Durée | Type |');
		sections.push('|-----------|-------|------|');

		for (const freeze of context.freezeEvents.slice(0, 10)) {
			const time = formatTime(freeze.timestamp);
			const duration =
				freeze.duration >= 1000
					? `${(freeze.duration / 1000).toFixed(1)}s`
					: `${freeze.duration}ms`;
			sections.push(`| ${time} | ${duration} | ${freeze.type} |`);
		}
		sections.push('');
	}

	// User actions
	if (context.recentActions && context.recentActions.length > 0) {
		sections.push('### Actions utilisateur récentes');
		sections.push('');

		for (let i = 0; i < Math.min(context.recentActions.length, 15); i++) {
			const action = context.recentActions[i];
			const time = formatTime(action.timestamp);
			sections.push(`${i + 1}. \`${time}\` - ${action.type} sur \`${action.target}\``);
		}
		sections.push('');
	}

	// Web Vitals
	if (context.webVitals) {
		const vitals = context.webVitals;
		const hasVitals = vitals.LCP || vitals.FID || vitals.CLS || vitals.INP;

		if (hasVitals) {
			sections.push('### Web Vitals');
			sections.push('');

			if (vitals.LCP !== undefined) {
				const rating =
					vitals.LCP <= 2500 ? 'good' : vitals.LCP <= 4000 ? 'needs improvement' : 'poor';
				sections.push(`- **LCP**: ${(vitals.LCP / 1000).toFixed(2)}s (${rating})`);
			}
			if (vitals.FID !== undefined) {
				const rating =
					vitals.FID <= 100 ? 'good' : vitals.FID <= 300 ? 'needs improvement' : 'poor';
				sections.push(`- **FID**: ${vitals.FID}ms (${rating})`);
			}
			if (vitals.CLS !== undefined) {
				const rating =
					vitals.CLS <= 0.1 ? 'good' : vitals.CLS <= 0.25 ? 'needs improvement' : 'poor';
				sections.push(`- **CLS**: ${vitals.CLS.toFixed(3)} (${rating})`);
			}
			if (vitals.INP !== undefined) {
				const rating =
					vitals.INP <= 200 ? 'good' : vitals.INP <= 500 ? 'needs improvement' : 'poor';
				sections.push(`- **INP**: ${vitals.INP}ms (${rating})`);
			}
			sections.push('');
		}
	}

	// Slow requests
	if (context.slowRequests && context.slowRequests.length > 0) {
		sections.push('### Requêtes lentes');
		sections.push('');
		sections.push('| URL | Durée | Status |');
		sections.push('|-----|-------|--------|');

		for (const req of context.slowRequests) {
			const duration =
				req.duration >= 1000 ? `${(req.duration / 1000).toFixed(1)}s` : `${req.duration}ms`;
			sections.push(`| ${req.url} | ${duration} | ${req.status} |`);
		}
		sections.push('');
	}

	// Potential files
	if (allFilePaths.length > 0) {
		sections.push('## Fichiers potentiellement concernés');
		sections.push('');
		sections.push("Basé sur les stack traces et l'URL :");

		for (const filePath of allFilePaths.slice(0, 15)) {
			sections.push(`- \`${filePath}\``);
		}
		sections.push('');
	}

	// Useful commands
	sections.push('## Commandes utiles');
	sections.push('');
	sections.push('```bash');

	// Grep command for error message
	if (context.recentErrors && context.recentErrors.length > 0) {
		const firstError = context.recentErrors[0];
		if (firstError.message) {
			const searchTerm = firstError.message.split(' ').slice(0, 3).join(' ').replace(/'/g, "\\'");
			sections.push(`# Rechercher l'erreur`);
			sections.push(`grep -r '${searchTerm}' src/`);
			sections.push('');
		}
	}

	// Open files command
	if (allFilePaths.length > 0) {
		const filesToOpen = allFilePaths
			.slice(0, 5)
			.map((f) => f.split(':')[0])
			.filter((f, i, arr) => arr.indexOf(f) === i);

		if (filesToOpen.length > 0) {
			sections.push('# Ouvrir les fichiers concernés');
			sections.push(`code ${filesToOpen.join(' ')}`);
		}
	}

	sections.push('```');
	sections.push('');

	// Screenshot
	if (report.screenshot_url) {
		sections.push('## Screenshot');
		sections.push('');
		sections.push(`![Screenshot](${report.screenshot_url})`);
		sections.push('');
	}

	// Resolution notes (if any)
	if (report.resolution_notes) {
		sections.push('## Notes de résolution');
		sections.push('');
		sections.push(report.resolution_notes);
		sections.push('');
	}

	// Footer
	sections.push('---');
	sections.push(`*Export généré le ${formatTimestamp(generatedAt)}*`);

	const markdown = sections.join('\n');
	const filename = `bug-report-${report.id.substring(0, 8)}-${Date.now()}.md`;

	return {
		markdown,
		filename,
		generatedAt
	};
}
