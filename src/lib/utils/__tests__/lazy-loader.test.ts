/**
 * `lazyLoader` : un module lourd chargé une fois, à la demande, et un échec
 * qui ne condamne pas les essais suivants.
 */

import { describe, it, expect, vi } from 'vitest';
import { lazyLoader } from '../lazy-loader';

describe('lazyLoader', () => {
	it('ne charge rien avant la première demande', () => {
		const importer = vi.fn(() => Promise.resolve('module'));
		const loader = lazyLoader(importer);

		expect(importer).not.toHaveBeenCalled();
		expect(loader.loaded).toBeUndefined();
	});

	it('charge une seule fois pour des demandes simultanées', async () => {
		const importer = vi.fn(() => Promise.resolve('module'));
		const loader = lazyLoader(importer);

		const [a, b] = await Promise.all([loader.load(), loader.load()]);

		expect(a).toBe('module');
		expect(b).toBe('module');
		expect(importer).toHaveBeenCalledTimes(1);
	});

	it('rend le module chargé tout de suite, sans promesse', async () => {
		const loader = lazyLoader(() => Promise.resolve('module'));

		await loader.load();

		expect(loader.loaded).toBe('module');
	});

	it('réessaie après un échec', async () => {
		const importer = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('réseau coupé'))
			.mockResolvedValueOnce('module');
		const loader = lazyLoader(importer);

		await expect(loader.load()).rejects.toThrow('réseau coupé');
		expect(loader.loaded).toBeUndefined();

		await expect(loader.load()).resolves.toBe('module');
		expect(importer).toHaveBeenCalledTimes(2);
	});
});
