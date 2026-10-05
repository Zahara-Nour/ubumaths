import { describe, expect, it } from 'vitest';
import { extractMath } from '$lib/ubumark/parser/math-extractor';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { findBareGreekNames } from '$lib/exercises/bare-greek-warnings';
import {
	ARTICLE_SOURCES,
	findPublishedArticle,
	parseArticle,
	parseArticles,
	pickRandomArticle,
	publishedArticles,
	type ShtamArticle
} from '../articles';

// Article minimal valide ; chaque test en dérive une variante
function source({
	title = 'Un triangle porte plainte',
	date = '2026-10-05',
	author = 'giron',
	lede = 'Il dit ne pas avoir été consulté.',
	extraFront = '',
	body = 'Le corps de l’article, avec ~a^2+b^2=c^2~.',
	truth = '## Le vrai du faux\n\nUn triangle rectangle ne porte jamais plainte.'
} = {}): string {
	return `---\ntitle: ${title}\ndate: ${date}\nauthor: ${author}\nlede: ${lede}\n${extraFront}---\n\n${body}\n\n${truth}\n`;
}

function article(slug: string, date: string, draft = false): ShtamArticle {
	return parseArticle(slug, source({ date, extraFront: draft ? 'draft: true\n' : '' }));
}

describe('parseArticle', () => {
	it('lit l’en-tête, le corps et le vrai du faux', () => {
		const a = parseArticle('triangle-plainte', source());
		expect(a).toMatchObject({
			slug: 'triangle-plainte',
			title: 'Un triangle porte plainte',
			date: '2026-10-05',
			author: 'giron',
			lede: 'Il dit ne pas avoir été consulté.',
			draft: false
		});
		expect(a.body).toBe('Le corps de l’article, avec ~a^2+b^2=c^2~.');
		expect(a.truth).toBe('Un triangle rectangle ne porte jamais plainte.');
	});

	it('refuse un article sans vrai du faux', () => {
		expect(() => parseArticle('x', source({ truth: '' }))).toThrow(/vrai du faux/i);
	});

	it('refuse un vrai du faux vide', () => {
		expect(() => parseArticle('x', source({ truth: '## Le vrai du faux\n\n' }))).toThrow(
			/vrai du faux/i
		);
	});

	it('refuse deux sections vrai du faux', () => {
		const twice = '## Le vrai du faux\n\nUn.\n\n## Le vrai du faux\n\nDeux.';
		expect(() => parseArticle('x', source({ truth: twice }))).toThrow(/vrai du faux/i);
	});

	it('refuse un corps vide', () => {
		expect(() => parseArticle('x', source({ body: '' }))).toThrow(/corps/i);
	});

	it('refuse une signature inconnue', () => {
		expect(() => parseArticle('x', source({ author: 'ubu' }))).toThrow();
	});

	it('refuse une date impossible', () => {
		expect(() => parseArticle('x', source({ date: '2026-02-30' }))).toThrow(/date/i);
	});

	it('refuse un slug qui n’est pas en kebab-case', () => {
		expect(() => parseArticle('Triangle_Plainte', source())).toThrow(/slug/i);
	});

	it('refuse un fichier sans en-tête', () => {
		expect(() => parseArticle('x', 'Juste du texte.')).toThrow(/en-tête/i);
	});
});

describe('parseArticles', () => {
	it('tire le slug du nom de fichier', () => {
		const [a] = parseArticles({ './articles/triangle-plainte.md': source() });
		expect(a.slug).toBe('triangle-plainte');
	});

	it('nomme le fichier fautif dans l’erreur', () => {
		expect(() => parseArticles({ './articles/casse.md': source({ author: 'ubu' }) })).toThrow(
			/casse\.md/
		);
	});
});

describe('publishedArticles', () => {
	it('range du plus récent au plus ancien', () => {
		const list = [
			article('a', '2026-09-01'),
			article('b', '2026-10-01'),
			article('c', '2026-09-15')
		];
		expect(publishedArticles(list, '2026-10-05').map((a) => a.slug)).toEqual(['b', 'c', 'a']);
	});

	it('à date égale, garde un ordre stable par slug', () => {
		const list = [article('zebre', '2026-10-01'), article('alpha', '2026-10-01')];
		expect(publishedArticles(list, '2026-10-05').map((a) => a.slug)).toEqual(['alpha', 'zebre']);
	});

	it('publie un article daté du jour même', () => {
		expect(publishedArticles([article('a', '2026-10-05')], '2026-10-05')).toHaveLength(1);
	});

	it('cache un article daté dans le futur', () => {
		expect(publishedArticles([article('a', '2026-10-06')], '2026-10-05')).toEqual([]);
	});

	it('cache un brouillon', () => {
		expect(publishedArticles([article('a', '2026-10-01', true)], '2026-10-05')).toEqual([]);
	});
});

describe('findPublishedArticle', () => {
	const list = [
		article('publie', '2026-10-01'),
		article('futur', '2026-12-01'),
		article('brouillon', '2026-10-01', true)
	];

	it('trouve un article publié', () => {
		expect(findPublishedArticle(list, 'publie', '2026-10-05')?.slug).toBe('publie');
	});

	it('ne trouve ni un article futur, ni un brouillon, ni un inconnu', () => {
		expect(findPublishedArticle(list, 'futur', '2026-10-05')).toBeNull();
		expect(findPublishedArticle(list, 'brouillon', '2026-10-05')).toBeNull();
		expect(findPublishedArticle(list, 'inconnu', '2026-10-05')).toBeNull();
	});
});

describe('pickRandomArticle', () => {
	const list = [article('a', '2026-10-01'), article('b', '2026-10-02'), article('c', '2026-10-03')];

	it('rend null sans article', () => {
		expect(pickRandomArticle([], () => 0.5)).toBeNull();
	});

	it('peut tirer chacun des articles, du premier au dernier', () => {
		expect(pickRandomArticle(list, () => 0)?.slug).toBe('a');
		expect(pickRandomArticle(list, () => 0.5)?.slug).toBe('b');
		expect(pickRandomArticle(list, () => 0.9999)?.slug).toBe('c');
	});
});

describe('les articles du dépôt', () => {
	it('sont tous valides (un article mal formé casse la CI, pas la prod)', () => {
		expect(() => parseArticles(ARTICLE_SOURCES)).not.toThrow();
	});

	// Mêmes contrôles que `pnpm check:ubumark` : une formule cassée s'affiche en rouge sans erreur
	it.each(Object.entries(ARTICLE_SOURCES))('%s : formules rendues sans erreur', (_path, raw) => {
		const broken = extractMath(raw)
			.placeholders.map((p) => ({ p, latex: expressionToLatex(p.expression, p.syntax) }))
			.filter(({ latex }) => latex.includes('textcolor{red}'))
			.map(({ p }) => p.expression);
		expect(broken).toEqual([]);
		expect(findBareGreekNames(raw)).toEqual([]);
	});

	it('existent', () => {
		expect(Object.keys(ARTICLE_SOURCES).length).toBeGreaterThan(0);
	});
});
