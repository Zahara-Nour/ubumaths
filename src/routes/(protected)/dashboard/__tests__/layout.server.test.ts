import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from '../+layout.server';

afterEach(() => {
	vi.useRealTimers();
});

type LayoutData = { almanachToday?: unknown };

describe('dashboard/+layout.server.ts — date de l’Almanach', () => {
	it('renvoie la date pataphysique du jour à Paris', async () => {
		vi.useFakeTimers();
		// 23 h 30 UTC le 22 août 2026 : déjà le 23 à Paris, 1 Ambraire An 131
		vi.setSystemTime(new Date('2026-08-22T23:30:00Z'));
		const data = (await load({ locals: { supabase: {}, profile: null } } as never)) as LayoutData;
		expect(data.almanachToday).toMatchObject({ kind: 'month', monthIndex: 0, day: 1, year: 131 });

		vi.setSystemTime(new Date('2026-05-22T10:00:00Z'));
		const later = (await load({ locals: { supabase: {}, profile: null } } as never)) as LayoutData;
		expect(later.almanachToday).toMatchObject({ monthName: 'Lumenal', day: 13, year: 130 });
	});
});
