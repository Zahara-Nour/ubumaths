import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pageServer from '../+page.server';

afterEach(() => {
	vi.useRealTimers();
});

describe('/almanach/+page.server.ts', () => {
	it('n’est pas prérendue : la date du jour serait figée au build', () => {
		expect(pageServer.prerender).toBe(false);
	});

	it('rend la date du jour à Paris et son jour civil pour le convertisseur', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2028-03-17T23:30:00Z'));
		const data = (await pageServer.load({} as never)) as { almanach: unknown; todayIso: string };
		expect(data.todayIso).toBe('2028-03-18');
		expect(data.almanach).toMatchObject({ kind: 'extra-day', extraDay: 'surnumeraire', year: 132 });
	});
});
