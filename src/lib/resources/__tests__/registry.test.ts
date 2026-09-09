/**
 * Resource registry tests
 * =======================
 *
 * The important test here is `route existence`: it walks `src/routes` and checks
 * that every URL the registry can build matches a real SvelteKit page route.
 *
 * This is the guard the codebase was missing. The internal-link renderer pointed
 * at `/dashboard/{role}/exercices/{uuid}` and `/dashboard/{role}/evaluations/{uuid}`
 * long after those routes stopped existing (or never existed), because a URL
 * built by string concatenation is invisible to the type checker. Moving a route
 * now fails this test instead of shipping a 404.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import {
	RESOURCE_KINDS,
	RESOURCE_REGISTRY,
	isResourceKind,
	resolveResource,
	type ResourceKind,
	type ViewerRole
} from '../registry';

// ============================================================================
// CONSTANTS
// ============================================================================

const ROUTES_DIR = join(process.cwd(), 'src', 'routes');

/** Stand-in ids: only their shape matters, routes never inspect them. */
const SENTINEL = {
	id: '11111111-1111-4111-8111-111111111111',
	classId: '22222222-2222-4222-8222-222222222222',
	slug: 'fractions-abc123',
	/** Jeton de partage : une fiche n'a d'adresse publique que par ce lien. */
	shareToken: 'abcdef0123456789abcdef'
} as const;

const ROLES: ViewerRole[] = ['teacher', 'student', 'admin', 'public'];

// ============================================================================
// ROUTE COLLECTION
// ============================================================================

/**
 * Collect every page route declared on disk, as URL patterns.
 *
 * Group segments — `(public)`, `(protected)` — contribute nothing to the URL,
 * which is exactly why a path can look right in the file tree and be wrong in
 * the browser.
 */
function collectPageRoutes(dir: string, urlPath = ''): string[] {
	const routes: string[] = [];

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === '__tests__') {
			continue;
		}

		const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
		const childUrl = isGroup ? urlPath : `${urlPath}/${entry.name}`;
		const childDir = join(dir, entry.name);

		if (existsSync(join(childDir, '+page.svelte'))) {
			routes.push(childUrl || '/');
		}
		routes.push(...collectPageRoutes(childDir, childUrl));
	}

	return routes;
}

/**
 * Turn a SvelteKit route pattern into a matcher.
 *
 * `[id]` matches one segment, `[...rest]` any number, `[[optional]]` zero or one.
 * Matcher syntax (`[id=uuid]`) is treated as a plain parameter — validating the
 * matcher itself is the route's job, not this test's.
 */
function routeToRegExp(route: string): RegExp {
	const pattern = route
		.split('/')
		.filter(Boolean)
		.map((segment) => {
			if (segment.startsWith('[...')) return '.+';
			if (segment.startsWith('[[')) return '[^/]*';
			if (segment.startsWith('[')) return '[^/]+';
			return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		})
		.join('/');

	return new RegExp(`^/${pattern}$`);
}

const PAGE_ROUTES = collectPageRoutes(ROUTES_DIR);
const ROUTE_MATCHERS = PAGE_ROUTES.map(routeToRegExp);

function routeExists(url: string): boolean {
	return ROUTE_MATCHERS.some((matcher) => matcher.test(url));
}

/** Every (kind, role) pair that declares a route. */
const DECLARED_ROUTES: Array<{ kind: ResourceKind; role: ViewerRole }> = RESOURCE_KINDS.flatMap(
	(kind) =>
		ROLES.filter((role) => RESOURCE_REGISTRY[kind].routes[role] !== null).map((role) => ({
			kind,
			role
		}))
);

// ============================================================================
// TESTS
// ============================================================================

describe('route collection', () => {
	it('finds the app routes and strips group segments', () => {
		expect(PAGE_ROUTES.length).toBeGreaterThan(50);
		// `(public)/auth/login` is served at `/auth/login`.
		expect(PAGE_ROUTES).toContain('/auth/login');
		expect(PAGE_ROUTES.some((route) => route.includes('('))).toBe(false);
	});

	it('matches parameterised routes', () => {
		expect(routeExists(`/dashboard/student/cours/${SENTINEL.id}`)).toBe(true);
		expect(routeExists('/route/qui/nexiste/pas')).toBe(false);
	});
});

describe('declared routes exist', () => {
	it('declares at least one route per role that has pages', () => {
		expect(DECLARED_ROUTES.length).toBeGreaterThan(0);
	});

	it.each(DECLARED_ROUTES)('$kind → $role points at a real route', ({ kind, role }) => {
		const { url } = resolveResource(kind, SENTINEL.id, {
			role,
			context: {
				classId: SENTINEL.classId,
				slug: SENTINEL.slug,
				shareToken: SENTINEL.shareToken
			}
		});

		expect(url, `${kind}/${role} builds no URL despite declaring a route`).not.toBeNull();
		expect(routeExists(url as string), `${kind}/${role} → ${url} matches no route`).toBe(true);
	});
});

describe('resolveResource', () => {
	it('returns a null URL when the kind has no page for that role', () => {
		// The question bank lives under /dashboard/admin, closed to teachers.
		expect(resolveResource('question', SENTINEL.id, { role: 'teacher' }).url).toBeNull();
		// No document detail page exists yet, for anyone.
		for (const role of ROLES) {
			expect(resolveResource('document', SENTINEL.id, { role }).url).toBeNull();
		}
	});

	it('une fiche n’a AUCUNE adresse publique sans jeton de partage', () => {
		// C'est la garde qui fait tenir tout le dispositif : hors du cahier
		// partagé, une fiche citée reste du texte inerte.
		expect(resolveResource('worksheet', SENTINEL.id, { role: 'public' }).url).toBeNull();

		const avecJeton = resolveResource('worksheet', SENTINEL.id, {
			role: 'public',
			context: { shareToken: SENTINEL.shareToken }
		});
		expect(avecJeton.url).toBe(`/cahier/${SENTINEL.shareToken}/fiche/${SENTINEL.id}`);
	});

	it('returns a null URL when a required context id is missing', () => {
		// The teacher chapter page is nested under its class.
		expect(resolveResource('chapter', SENTINEL.id, { role: 'teacher' }).url).toBeNull();
		expect(
			resolveResource('chapter', SENTINEL.id, {
				role: 'teacher',
				context: { classId: SENTINEL.classId }
			}).url
		).toBe(`/dashboard/teacher/cours/${SENTINEL.classId}/${SENTINEL.id}`);
	});

	it('prefers the slug for the public exercise page and falls back to the id', () => {
		expect(
			resolveResource('exercise', SENTINEL.id, {
				role: 'public',
				context: { slug: SENTINEL.slug }
			}).url
		).toBe(`/exercice/${SENTINEL.slug}`);

		expect(resolveResource('exercise', SENTINEL.id, { role: 'public' }).url).toBe(
			`/exercice/${SENTINEL.id}`
		);
	});

	it('falls back to the kind name when no label is given', () => {
		expect(resolveResource('chapter', SENTINEL.id, { role: 'student' }).label).toBe('Chapitre');
		expect(
			resolveResource('chapter', SENTINEL.id, { role: 'student', label: 'Fractions' }).label
		).toBe('Fractions');
	});

	it('always exposes the kind label and icon, even without a URL', () => {
		const resolved = resolveResource('document', SENTINEL.id, { role: 'student' });
		expect(resolved.kindLabel).toBe('Document');
		expect(resolved.icon).toBeDefined();
	});
});

describe('isResourceKind', () => {
	it('accepts every registered kind', () => {
		for (const kind of RESOURCE_KINDS) {
			expect(isResourceKind(kind)).toBe(true);
		}
	});

	it('rejects anything else', () => {
		// `parody_evaluation` existe comme type TAGUABLE (`resource_tags`) mais
		// n'est pas référençable : le bon exemple d'un type volontairement absent.
		expect(isResourceKind('parody_evaluation')).toBe(false);
		expect(isResourceKind('')).toBe(false);
		expect(isResourceKind(null)).toBe(false);
		expect(isResourceKind(42)).toBe(false);
	});
});

describe('ubumark vocabulary stays in sync', () => {
	// `src/lib/ubumark` is self-contained by design (it imports nothing from the
	// rest of $lib), so its inline-link whitelist is a second list of the same
	// vocabulary. This test is what keeps the two from drifting apart again.
	it.each([...RESOURCE_KINDS])('parses [[%s:uuid|label]] as an internal link', (kind) => {
		const ast = parseMarkdown(`[[${kind}:${SENTINEL.id}|Une ressource]]`);
		const [block] = ast.children;

		expect(block.type).toBe('paragraph');
		if (block.type !== 'paragraph') return;

		expect(block.children).toHaveLength(1);
		const [node] = block.children;
		expect(node.type).toBe('internal-link');
		if (node.type !== 'internal-link') return;

		expect(node.referenceType).toBe(kind);
		expect(node.uuid).toBe(SENTINEL.id);
		expect(node.label).toBe('Une ressource');
	});

	it('leaves an unregistered kind as plain text', () => {
		const ast = parseMarkdown(`[[parody_evaluation:${SENTINEL.id}|Une parodie]]`);
		const [block] = ast.children;

		expect(block.type).toBe('paragraph');
		if (block.type !== 'paragraph') return;

		expect(block.children.every((child) => child.type !== 'internal-link')).toBe(true);
	});
});
