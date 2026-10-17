import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { building, dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import avatarPereUbu from '$lib/assets/images/avatar-pereubu.png?inline';
import { frenchOrdinal, PI_STATUS_OCCURRENCES } from '$lib/error-page/pi-status';
import { piSpiralSvg } from '$lib/error-page/pi-spiral-svg';

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

/** Première apparition de 503 dans π : le code coloré dans la spirale. */
const MAINTENANCE_OCCURRENCE = PI_STATUS_OCCURRENCES[503];

/**
 * Page de maintenance autonome — ni JS, ni base, ni ressource externe : elle
 * doit tenir pendant qu'on fige la base. Même famille que la page d'erreur
 * (`src/routes/+error.svelte`) : spirale de π, 503 en ambre, Père Ubu au centre,
 * mais en HTML pur. L'image est intégrée (`?inline`) et la spirale construite en
 * texte SVG (`piSpiralSvg`).
 */
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
		<title>Maintenance | Chiphre</title>
		<style>
			:root {
				color-scheme: light dark;
				--bg: #ffffff;
				--fg: #1c1917;
				--muted: #57534e;
				--spiral: rgba(28, 25, 23, 0.85);
				--accent: #d97706;
				--accent-fg: #1c1917;
				--ring: #f59e0b;
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--bg: #252525;
					--fg: #f5f5f4;
					--muted: #a8a29e;
					--spiral: rgba(245, 245, 244, 0.85);
					--accent: #fbbf24;
					--ring: #fbbf24;
				}
			}
			* { box-sizing: border-box; }
			body {
				margin: 0;
				min-height: 100vh;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 2rem 3rem;
				flex-wrap: wrap;
				padding: 2rem 1rem;
				font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
				background: var(--bg);
				color: var(--fg);
			}
			.visual {
				position: relative;
				width: min(28rem, 85vw, 70vh);
				aspect-ratio: 1;
				flex-shrink: 0;
			}
			.pi-spiral {
				width: 100%;
				height: 100%;
				color: var(--spiral);
				font-variant-numeric: tabular-nums;
				animation: spin 20s linear infinite;
				will-change: transform;
			}
			.pi-spiral .highlighted { fill: var(--accent); font-weight: 700; }
			@keyframes spin { to { transform: rotate(360deg); } }
			@media (prefers-reduced-motion: reduce) { .pi-spiral { animation: none; } }
			.ubu {
				position: absolute;
				top: 50%;
				left: 50%;
				width: 26%;
				height: 26%;
				transform: translate(-50%, -50%);
				border-radius: 50%;
				border: 2px solid var(--ring);
				background: var(--bg);
				object-fit: cover;
			}
			main { max-width: 34rem; display: flex; flex-direction: column; gap: 1rem; }
			.eyebrow {
				margin: 0;
				font-weight: 600;
				letter-spacing: 0.2em;
				text-transform: uppercase;
				color: var(--muted);
			}
			h1 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 2.25rem; }
			p { margin: 0; line-height: 1.6; text-wrap: balance; }
			.eta { color: var(--muted); }
			.retry {
				align-self: flex-start;
				margin-top: 0.5rem;
				padding: 0.6rem 1.1rem;
				border-radius: 0.5rem;
				background: var(--accent);
				color: var(--accent-fg);
				font-weight: 600;
				text-decoration: none;
			}
			@media (max-width: 1023px) {
				main { align-items: center; text-align: center; }
				.retry { align-self: center; }
			}
		</style>
	</head>
	<body>
		<div class="visual">
			${piSpiralSvg(MAINTENANCE_OCCURRENCE.position)}
			<img class="ubu" src="${avatarPereUbu}" alt="" width="262" height="266" />
		</div>
		<main>
			<p class="eyebrow">Erreur 503</p>
			<h1>Maintenance en cours</h1>
			<p>
				Le nombre 503 est de service à la
				<strong>${frenchOrdinal(MAINTENANCE_OCCURRENCE.position)} décimale</strong>&nbsp;de&nbsp;π&nbsp;;
				Chiphre, lui, est hors service le temps d’une mise à jour.
			</p>
			${etaLine}
			<a class="retry" href="">Réessayer</a>
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
		// During build/prerendering, never gate: prerendered pages forbid accessing
		// event.url.searchParams (which the bypass check reads). Maintenance only
		// needs to apply at runtime.
		if (building) return resolve(event);

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
