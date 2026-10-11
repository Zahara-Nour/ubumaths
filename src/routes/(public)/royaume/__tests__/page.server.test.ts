import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pageServer from '../+page.server';
import { allArticles } from '$lib/server/shtam/articles';

// Articles du Shtam du test : deux parus, un futur
vi.mock('$lib/server/shtam/articles', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/shtam/articles')>();
	const raw = (date: string) =>
		`---\ntitle: Titre ${date}\ndate: ${date}\nauthor: giron\nlede: Chapeau ${date}.\n---\n\nCorps.\n\n## Le vrai du faux\n\nFait.\n`;
	const articles = original.parseArticles({
		'./articles/ancien.md': raw('2026-09-01'),
		'./articles/recent.md': raw('2026-10-01'),
		'./articles/futur.md': raw('2026-12-01')
	});
	return { ...original, allArticles: vi.fn(() => articles) };
});

interface TourData {
	ambianceMonth: number;
	almanachDate: string;
	shtam: { slug: string; title: string; lede: string; byline: string } | null;
}

const load = async () => (await pageServer.load({} as never)) as TourData;

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('/royaume/+page.server.ts', () => {
	it('n’est pas prérendue : la date du jour serait figée au build', () => {
		expect(pageServer.prerender).toBe(false);
	});

	it('donne la date du jour à Paris dans l’Almanach, et l’ambiance de son mois', async () => {
		vi.useFakeTimers();
		// 23 h 30 UTC le 22 août 2026 : déjà le 23 à Paris, 1 Ambraire (mois 0)
		vi.setSystemTime(new Date('2026-08-22T23:30:00Z'));
		const data = await load();
		expect(data.ambianceMonth).toBe(0);
		expect(data.almanachDate).toMatch(/^1 Ambraire, An \d+ E\.R\.$/);
	});

	it('la Cloche du Grand Reset prend l’ambiance d’Auguste', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-22T10:00:00Z'));
		const data = await load();
		expect(data.ambianceMonth).toBe(6);
		expect(data.almanachDate).toMatch(/Cloche/);
	});

	it('tire une dépêche parue (titre, chapeau, signature), jamais une future', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
		for (let i = 0; i < 20; i++) {
			const { shtam } = await load();
			expect(['ancien', 'recent']).toContain(shtam?.slug);
			expect(shtam?.lede).toMatch(/^Chapeau 2026-(09|10)-01\.$/);
			expect(shtam?.byline).not.toBe('');
		}
	});

	it('aucune dépêche parue : pas de dépêche', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
		expect((await load()).shtam).toBeNull();
	});

	it('un Shtam illisible ne fait pas tomber la page : pas de dépêche, une trace', async () => {
		vi.mocked(allArticles).mockImplementationOnce(() => {
			throw new Error('en-tête cassé');
		});
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect((await load()).shtam).toBeNull();
		expect(spy).toHaveBeenCalled();
	});
});
