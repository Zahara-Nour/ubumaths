/**
 * Logger serveur (écart L8, lot 0) : pas de codes ANSI en production.
 *
 * Les journaux Vercel affichent les séquences d'échappement en clair
 * (`\x1b[90m3:12:04 PM\x1b[0m …`) : en prod, la ligne doit être du texte nu.
 * En dev, le terminal les interprète : les couleurs restent.
 *
 * `dev` est lu une fois, à l'import du module : chaque cas recharge le module
 * après avoir fixé `$app/environment`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const ANSI = '\x1b[';

async function loadLogger(dev: boolean) {
	vi.resetModules();
	vi.doMock('$app/environment', () => ({ dev, browser: false, building: false, version: '' }));
	return import('$lib/utils/logger');
}

function printed(spy: { mock: { calls: unknown[][] } }): string {
	return spy.mock.calls.flat().map(String).join(' ');
}

afterEach(() => {
	vi.doUnmock('$app/environment');
	vi.restoreAllMocks();
});

describe('createServerLogger — codes ANSI', () => {
	it('en production, aucune ligne ne contient de code ANSI', async () => {
		const { createServerLogger } = await loadLogger(false);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const info = vi.spyOn(console, 'info').mockImplementation(() => {});
		const logger = createServerLogger('api/test/+server.ts');

		logger.error('échec', { email: 'eleve@example.com' });
		logger.warn('attention');
		logger.info('information');

		for (const spy of [error, warn, info]) {
			expect(spy).toHaveBeenCalledTimes(1);
			expect(printed(spy)).not.toContain(ANSI);
			expect(printed(spy)).toContain('[api/test/+server.ts]');
		}
	});

	it('en production, le masquage des données personnelles est inchangé', async () => {
		const { createServerLogger } = await loadLogger(false);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		createServerLogger('x.ts').error('échec', { email: 'eleve@example.com', password: 'p' });

		expect(error.mock.calls[0][2]).toEqual({ email: '[email@redacted]', password: '[REDACTED]' });
	});

	it('en dev, les couleurs restent', async () => {
		const { createServerLogger } = await loadLogger(true);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		createServerLogger('x.ts').error('échec');

		expect(printed(error)).toContain(ANSI);
	});
});
