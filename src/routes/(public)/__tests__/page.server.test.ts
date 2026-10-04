import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pageServer from '../+page.server';

afterEach(() => {
	vi.useRealTimers();
});

describe('/+page.server.ts', () => {
	it('n’est pas prérendue : la date du jour serait figée au build', () => {
		expect(pageServer.prerender).toBe(false);
	});

	it('calcule la date du jour à Paris, à chaque requête', async () => {
		vi.useFakeTimers();
		// 23 h 30 UTC le 22 août 2026 : déjà le 23 à Paris
		vi.setSystemTime(new Date('2026-08-22T23:30:00Z'));
		const data = (await pageServer.load({} as never)) as { almanach: unknown };
		expect(data.almanach).toMatchObject({ kind: 'month', monthIndex: 0, day: 1, year: 131 });

		vi.setSystemTime(new Date('2026-05-22T10:00:00Z'));
		const later = (await pageServer.load({} as never)) as { almanach: unknown };
		expect(later.almanach).toMatchObject({ monthName: 'Lumenal', day: 13, year: 130 });
	});
});
