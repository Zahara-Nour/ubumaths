import { describe, it, expect, vi } from 'vitest';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import {
	createMaintenanceHandle,
	isAllowedDuringMaintenance,
	secretsMatch,
	computeRetryAfter,
	renderMaintenancePage,
	MAINTENANCE_BYPASS_COOKIE,
	type MaintenanceEnv
} from '../maintenance';

// Minimal RequestEvent mock (only the fields the handle touches).
function makeEvent(urlStr: string, cookies: Record<string, string> = {}) {
	const set = vi.fn();
	const get = vi.fn((name: string) => cookies[name]);
	const event = { url: new URL(urlStr), cookies: { get, set } } as unknown as RequestEvent;
	return { event, set, get };
}

const SENTINEL = new Response('NEXT', { status: 200 });
function makeResolve() {
	return vi.fn(async () => SENTINEL);
}

// Invoke a Handle with a partial event/resolve without leaking `any`.
function call(handle: Handle, event: RequestEvent, resolve: ReturnType<typeof makeResolve>) {
	return handle({ event, resolve } as unknown as Parameters<Handle>[0]);
}

function handleWith(cfg: MaintenanceEnv, isDev = false) {
	return createMaintenanceHandle(() => cfg, { isDev });
}

describe('isAllowedDuringMaintenance', () => {
	it('allows static assets', () => {
		expect(isAllowedDuringMaintenance('/_app/immutable/chunks/x.js')).toBe(true);
		expect(isAllowedDuringMaintenance('/favicon.ico')).toBe(true);
		expect(isAllowedDuringMaintenance('/robots.txt')).toBe(true);
		expect(isAllowedDuringMaintenance('/fonts/inter.woff2')).toBe(true);
	});

	it('blocks application routes', () => {
		expect(isAllowedDuringMaintenance('/')).toBe(false);
		expect(isAllowedDuringMaintenance('/dashboard/teacher')).toBe(false);
		expect(isAllowedDuringMaintenance('/api/questions')).toBe(false);
	});
});

describe('secretsMatch', () => {
	it('matches identical secrets', () => {
		expect(secretsMatch('s3cr3t-token', 's3cr3t-token')).toBe(true);
	});
	it('rejects different secrets', () => {
		expect(secretsMatch('s3cr3t-token', 'wrong')).toBe(false);
	});
	it('rejects empty/undefined', () => {
		expect(secretsMatch(undefined, 'x')).toBe(false);
		expect(secretsMatch('x', undefined)).toBe(false);
		expect(secretsMatch('', '')).toBe(false);
		expect(secretsMatch(null, null)).toBe(false);
	});
});

describe('computeRetryAfter', () => {
	const now = new Date('2026-06-13T10:00:00Z');
	it('defaults to 3600 when unset', () => {
		expect(computeRetryAfter(undefined, now)).toBe(3600);
	});
	it('defaults to 3600 when invalid', () => {
		expect(computeRetryAfter('not-a-date', now)).toBe(3600);
	});
	it('defaults to 3600 when in the past', () => {
		expect(computeRetryAfter('2026-06-13T09:00:00Z', now)).toBe(3600);
	});
	it('computes seconds until a future time', () => {
		expect(computeRetryAfter('2026-06-13T10:01:40Z', now)).toBe(100);
	});
});

describe('renderMaintenancePage', () => {
	it('renders the FR maintenance message and noindex', () => {
		const html = renderMaintenancePage();
		expect(html).toContain('Maintenance en cours');
		expect(html).toContain('name="robots" content="noindex"');
		expect(html).not.toContain('Retour prévu');
	});
	it('shows an ETA when a valid date is provided', () => {
		const html = renderMaintenancePage({ until: '2026-06-13T12:30:00Z' });
		expect(html).toContain('Retour prévu');
	});
});

describe('createMaintenanceHandle', () => {
	it('passes through when MAINTENANCE_MODE is off', async () => {
		const handle = handleWith({});
		const resolve = makeResolve();
		const { event } = makeEvent('https://ubumaths.fr/dashboard');
		const res = await call(handle, event, resolve);
		expect(resolve).toHaveBeenCalledOnce();
		expect(res).toBe(SENTINEL);
	});

	it('returns 503 + Retry-After for a normal route under maintenance, without resolving', async () => {
		const handle = handleWith({ MAINTENANCE_MODE: 'true', MAINTENANCE_UNTIL: undefined });
		const resolve = makeResolve();
		const { event } = makeEvent('https://ubumaths.fr/dashboard');
		const res = await call(handle, event, resolve);
		expect(resolve).not.toHaveBeenCalled();
		expect(res.status).toBe(503);
		expect(res.headers.get('Retry-After')).toBe('3600');
		expect(res.headers.get('Cache-Control')).toBe('no-store');
		expect(await res.text()).toContain('Maintenance en cours');
	});

	it('lets static assets through even under maintenance', async () => {
		const handle = handleWith({ MAINTENANCE_MODE: 'true' });
		const resolve = makeResolve();
		const { event } = makeEvent('https://ubumaths.fr/_app/immutable/x.js');
		const res = await call(handle, event, resolve);
		expect(resolve).toHaveBeenCalledOnce();
		expect(res).toBe(SENTINEL);
	});

	it('sets a bypass cookie and redirects to a clean URL on a valid ?bypass', async () => {
		const handle = handleWith({
			MAINTENANCE_MODE: 'true',
			MAINTENANCE_BYPASS_SECRET: 'open-sesame'
		});
		const resolve = makeResolve();
		const { event, set } = makeEvent('https://ubumaths.fr/dashboard?bypass=open-sesame');
		let thrown: unknown;
		try {
			await call(handle, event, resolve);
		} catch (e) {
			thrown = e;
		}
		const redirectErr = thrown as { status?: number; location?: string };
		expect(resolve).not.toHaveBeenCalled();
		expect(set).toHaveBeenCalledWith(
			MAINTENANCE_BYPASS_COOKIE,
			'open-sesame',
			expect.objectContaining({ httpOnly: true, path: '/' })
		);
		expect(redirectErr.status).toBe(303);
		expect(redirectErr.location).toBe('/dashboard');
	});

	it('lets a returning operator through with a valid bypass cookie', async () => {
		const handle = handleWith({
			MAINTENANCE_MODE: 'true',
			MAINTENANCE_BYPASS_SECRET: 'open-sesame'
		});
		const resolve = makeResolve();
		const { event } = makeEvent('https://ubumaths.fr/dashboard', {
			[MAINTENANCE_BYPASS_COOKIE]: 'open-sesame'
		});
		const res = await call(handle, event, resolve);
		expect(resolve).toHaveBeenCalledOnce();
		expect(res).toBe(SENTINEL);
	});

	it('blocks a wrong bypass secret with 503', async () => {
		const handle = handleWith({
			MAINTENANCE_MODE: 'true',
			MAINTENANCE_BYPASS_SECRET: 'open-sesame'
		});
		const resolve = makeResolve();
		const { event } = makeEvent('https://ubumaths.fr/dashboard?bypass=guess', {
			[MAINTENANCE_BYPASS_COOKIE]: 'also-wrong'
		});
		const res = await call(handle, event, resolve);
		expect(resolve).not.toHaveBeenCalled();
		expect(res.status).toBe(503);
	});
});
