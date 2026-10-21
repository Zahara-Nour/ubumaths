/**
 * runAfterResponse — la tâche est confiée à `waitUntil`, ses erreurs ne remontent jamais.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { waitUntil, loggerError } = vi.hoisted(() => ({
	waitUntil: vi.fn(),
	loggerError: vi.fn()
}));

vi.mock('@vercel/functions', () => ({ waitUntil }));
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ error: loggerError, info: vi.fn(), warn: vi.fn() })
}));

import { runAfterResponse } from '../after-response';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('runAfterResponse', () => {
	it('confie la tâche à waitUntil sans l’attendre', () => {
		runAfterResponse(new Promise(() => {}), 'test');
		expect(waitUntil).toHaveBeenCalledTimes(1);
		expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);
	});

	it('une tâche en échec est journalisée, la promesse confiée ne rejette pas', async () => {
		runAfterResponse(Promise.reject(new Error('Brevo injoignable')), 'lien au parent');
		await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
		expect(loggerError).toHaveBeenCalledWith(
			expect.stringContaining('lien au parent'),
			expect.any(Error)
		);
	});
});
