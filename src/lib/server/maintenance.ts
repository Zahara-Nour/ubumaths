import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * Maintenance mode — serves a self-contained 503 page while the app is being
 * migrated (e.g. the Supabase EU migration cutover).
 *
 * Design goals:
 * - **No DB / no auth dependency**: the toggle and bypass are env-var + cookie
 *   only, so it works even while the database is frozen or unreachable. The
 *   handle is wired BEFORE the Supabase handle in hooks.server.ts.
 * - **SEO-safe**: returns HTTP 503 + `Retry-After` (search engines won't deindex).
 * - **Operator bypass**: visiting `/?bypass=<MAINTENANCE_BYPASS_SECRET>` sets a
 *   signed-by-secret cookie so the operator can test the migrated site.
 *
 * Env vars (read via $env/dynamic/private, all optional, OFF by default):
 * - `MAINTENANCE_MODE`        : 'true' enables maintenance mode.
 * - `MAINTENANCE_BYPASS_SECRET`: secret for the operator bypass (required for bypass).
 * - `MAINTENANCE_UNTIL`       : optional ISO datetime shown to users + drives Retry-After.
 */

export const MAINTENANCE_BYPASS_COOKIE = 'maintenance_bypass';
const DEFAULT_RETRY_AFTER_SECONDS = 3600;
const BYPASS_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface MaintenanceEnv {
	MAINTENANCE_MODE?: string;
	MAINTENANCE_BYPASS_SECRET?: string;
	MAINTENANCE_UNTIL?: string;
}

/**
 * Static assets must keep flowing during maintenance so the 503 page (and dev
 * tooling) can load. Everything else is blocked.
 */
export function isAllowedDuringMaintenance(pathname: string): boolean {
	return (
		pathname.startsWith('/_app/') ||
		pathname === '/favicon.ico' ||
		pathname === '/favicon.png' ||
		pathname === '/robots.txt' ||
		pathname === '/manifest.json' ||
		pathname.startsWith('/fonts/')
	);
}

/**
 * Constant-time secret comparison, length-independent (hashes both sides first
 * so the secret's length isn't leaked via timing).
 */
export function secretsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
	if (!a || !b) return false;
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** Seconds until `until` (min 1), or a sane default when unset/invalid/past. */
export function computeRetryAfter(until: string | undefined, now: Date): number {
	if (!until) return DEFAULT_RETRY_AFTER_SECONDS;
	const target = new Date(until).getTime();
	if (Number.isNaN(target)) return DEFAULT_RETRY_AFTER_SECONDS;
	const seconds = Math.ceil((target - now.getTime()) / 1000);
	return seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
}

/** Human-readable "retour prévu" string (FR), or null when no/invalid date. */
function formatUntil(until: string | undefined): string | null {
	if (!until) return null;
	const d = new Date(until);
	if (Number.isNaN(d.getTime())) return null;
	const time = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	}).format(d);
	return time;
}

/** Self-contained maintenance HTML — no external assets, no JS, no DB. */
export function renderMaintenancePage(opts: { until?: string } = {}): string {
	const until = formatUntil(opts.until);
	const etaLine = until
		? `<p class="eta">Retour prévu vers <strong>${until}</strong> (heure de Paris).</p>`
		: '';
	return `<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>Maintenance · UbuMaths</title>
		<style>
			:root { color-scheme: light dark; }
			* { box-sizing: border-box; }
			body {
				margin: 0;
				min-height: 100vh;
				display: grid;
				place-items: center;
				font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
				background: linear-gradient(135deg, #6d28d9 0%, #2563eb 100%);
				color: #fff;
				padding: 1.5rem;
			}
			.card {
				max-width: 30rem;
				text-align: center;
				background: rgba(255, 255, 255, 0.08);
				border: 1px solid rgba(255, 255, 255, 0.18);
				border-radius: 1.25rem;
				padding: 2.5rem 2rem;
				backdrop-filter: blur(8px);
			}
			.emoji { font-size: 3.5rem; line-height: 1; }
			h1 { font-size: 1.6rem; margin: 1rem 0 0.5rem; }
			p { margin: 0.5rem 0; line-height: 1.5; opacity: 0.95; }
			.eta { margin-top: 1rem; font-size: 0.95rem; opacity: 0.9; }
			.brand { margin-top: 1.5rem; font-weight: 700; letter-spacing: 0.02em; }
		</style>
	</head>
	<body>
		<main class="card">
			<div class="emoji" aria-hidden="true">🛠️</div>
			<h1>Maintenance en cours</h1>
			<p>UbuMaths est momentanément indisponible pendant une mise à jour technique.</p>
			<p>On revient très vite&nbsp;!</p>
			${etaLine}
			<div class="brand">UbuMaths</div>
		</main>
	</body>
</html>`;
}

/**
 * Builds the maintenance Handle. The env reader is injected so the handle is
 * unit-testable without mocking the `$env/dynamic/private` virtual module.
 */
export function createMaintenanceHandle(
	readEnv: () => MaintenanceEnv,
	options: { isDev?: boolean } = {}
): Handle {
	const isDev = options.isDev ?? false;

	return async ({ event, resolve }) => {
		const cfg = readEnv();

		// Off by default — pass straight through.
		if (cfg.MAINTENANCE_MODE !== 'true') return resolve(event);

		const { pathname } = event.url;

		// Static assets always flow (so the 503 page renders).
		if (isAllowedDuringMaintenance(pathname)) return resolve(event);

		const secret = cfg.MAINTENANCE_BYPASS_SECRET;
		const queryBypass = event.url.searchParams.get('bypass');

		// Operator presents the secret in the URL → set cookie, then redirect to a
		// clean URL so the secret doesn't linger in history/links.
		if (secretsMatch(queryBypass, secret)) {
			event.cookies.set(MAINTENANCE_BYPASS_COOKIE, secret as string, {
				path: '/',
				httpOnly: true,
				secure: !isDev,
				sameSite: 'lax',
				maxAge: BYPASS_COOKIE_MAX_AGE
			});
			const clean = new URL(event.url);
			clean.searchParams.delete('bypass');
			throw redirect(303, clean.pathname + clean.search);
		}

		// Returning operator with a valid bypass cookie → let them through.
		if (secretsMatch(event.cookies.get(MAINTENANCE_BYPASS_COOKIE), secret)) {
			return resolve(event);
		}

		// Everyone else → 503 maintenance page.
		return new Response(renderMaintenancePage({ until: cfg.MAINTENANCE_UNTIL }), {
			status: 503,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Retry-After': String(computeRetryAfter(cfg.MAINTENANCE_UNTIL, new Date())),
				'Cache-Control': 'no-store'
			}
		});
	};
}

/** Production handle, wired into hooks.server.ts before the Supabase handle. */
export const maintenanceHandle: Handle = createMaintenanceHandle(
	() => ({
		MAINTENANCE_MODE: env.MAINTENANCE_MODE,
		MAINTENANCE_BYPASS_SECRET: env.MAINTENANCE_BYPASS_SECRET,
		MAINTENANCE_UNTIL: env.MAINTENANCE_UNTIL
	}),
	{ isDev: dev }
);
