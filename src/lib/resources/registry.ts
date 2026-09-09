/**
 * Resource Registry
 * =================
 *
 * Single source of truth for **addressing** a resource: given a kind and an id,
 * where does that resource live for a given viewer?
 *
 * Before this registry every consumer rebuilt its own URLs (the internal-link
 * renderer had its own `switch`, the navigation had another one, `hooks.server.ts`
 * patched old paths case by case). Nothing tied those copies together, so when
 * the teacher content routes moved under `contenu/`, the internal links kept
 * pointing at paths that no longer existed — silently, because a URL string
 * cannot be type-checked.
 *
 * Three rules keep that from happening again:
 * 1. Every consumer resolves URLs through `resolveResource()`. No route literal
 *    for a resource lives anywhere else.
 * 2. Routes are built with SvelteKit's typed `resolve()`, so a route id that no
 *    longer exists is a **compile error**, not a 404 discovered in production.
 * 3. `__tests__/registry.test.ts` re-checks the built URLs against the routes on
 *    disk, which also catches a regression back to string concatenation.
 *
 * Scope: addressing only. Whether the viewer is *allowed* to open the page stays
 * with the route itself (layout guards + RLS). A non-null URL means "this is
 * where that kind lives for that role", not "you may read it".
 *
 * @module resources/registry
 */

import { resolve } from '$app/paths';
import {
	BookOpen,
	ClipboardCheck,
	ClipboardList,
	Compass,
	FileText,
	HelpCircle,
	NotebookPen,
	PencilRuler,
	Terminal
} from '@lucide/svelte';
import type { LucideIcon } from '@lucide/svelte';
import { lore } from '$lib/config/lore';
import { RESOURCE_KINDS, isResourceKind, type ResourceKind } from './kinds';

export { RESOURCE_KINDS, isResourceKind };
export type { ResourceKind };

// ============================================================================
// TYPES
// ============================================================================

/**
 * Who is looking. Roles are strictly separated in this app: the
 * `/dashboard/teacher` layout rejects admins and vice versa, so an admin cannot
 * fall back to a teacher route.
 */
export type ViewerRole = 'teacher' | 'student' | 'admin' | 'public';

/**
 * Extra ids a route may need beyond the resource's own id.
 *
 * A reference like `[[chapter:<uuid>]]` only carries the chapter id, but the
 * teacher chapter page is nested under its class. Callers that know the class
 * (the cahier de texte, a class page) pass it; the others get `null` and render
 * the reference as plain text rather than a broken link.
 */
export interface ResourceRouteContext {
	/** Class the resource is being viewed from. */
	classId?: string;
	/** URL-friendly identifier, when the resource has one (exercises only). */
	slug?: string;
}

/**
 * Builds a URL, or returns null when the route cannot be built (missing context).
 */
type RouteBuilder = (id: string, context: ResourceRouteContext) => string | null;

interface ResourceKindDefinition {
	/** French singular name, shown to users. */
	label: string;
	icon: LucideIcon;
	/**
	 * Route per viewer role. `null` means this kind has no page for that role —
	 * an honest "nowhere to go", not a fallback to somewhere wrong.
	 */
	routes: Record<ViewerRole, RouteBuilder | null>;
}

/**
 * A reference resolved into something renderable.
 */
export interface ResolvedResource {
	kind: ResourceKind;
	id: string;
	/** Display label (caller-provided, else the kind's French name). */
	label: string;
	/** French name of the kind, for tooltips and aria-labels. */
	kindLabel: string;
	icon: LucideIcon;
	/**
	 * Target URL, or null when this kind has no page for this viewer or a
	 * required context id is missing. Consumers must render null as inert text.
	 */
	url: string | null;
}

export interface ResolveResourceOptions {
	role: ViewerRole;
	label?: string;
	context?: ResourceRouteContext;
}

// ============================================================================
// ROUTE HELPERS
// ============================================================================

/**
 * Teacher chapter pages are nested under their class.
 *
 * Extracted rather than inlined so `resolve()` collapses to `string` before the
 * result is unioned with `null`: `ResolvedPathname` is a union over every route
 * in the app, and building `ResolvedPathname | null` inline overflows what
 * TypeScript can represent ("union type that is too complex").
 */
function teacherChapterPath(classId: string, chapterId: string): string {
	return resolve('/(protected)/dashboard/teacher/cours/[classId]/[chapterId]', {
		classId,
		chapterId
	});
}

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * Route map, verified against the filesystem by the registry test.
 *
 * Naming is inconsistent on purpose — it mirrors reality: teacher exercises live
 * under the French `contenu/exercices`, student ones under the English
 * `exercises`. The registry is where that inconsistency stops being everyone's
 * problem.
 */
export const RESOURCE_REGISTRY: Record<ResourceKind, ResourceKindDefinition> = {
	exercise: {
		label: lore.learning.exercise,
		icon: PencilRuler,
		routes: {
			teacher: (id) => resolve('/(protected)/dashboard/teacher/contenu/exercices/[id]', { id }),
			student: (id) => resolve('/(protected)/dashboard/student/exercises/[id]', { id }),
			// The exercise UI lives under /dashboard/teacher, which the teacher layout
			// closes to admins.
			admin: null,
			// The public page resolves either a slug or a uuid; the slug is nicer when
			// the caller knows it. Being addressable is not being readable: the page
			// still requires `is_public` or a share token.
			public: (id, { slug }) => resolve('/(public)/exercice/[slug]', { slug: slug ?? id })
		}
	},
	question: {
		label: 'Question',
		icon: HelpCircle,
		routes: {
			// The question bank is authored under /dashboard/admin only.
			teacher: null,
			student: null,
			admin: (id) => resolve('/(protected)/dashboard/admin/questions/[id]/preview', { id }),
			public: null
		}
	},
	assessment: {
		label: 'Évaluation',
		icon: ClipboardCheck,
		routes: {
			// No read-only page exists; the edit page is the canonical entry point.
			teacher: (id) => resolve('/(protected)/dashboard/teacher/assessments/[id]/edit', { id }),
			// Students only ever reach an assessment through its results.
			student: (id) => resolve('/(protected)/dashboard/student/assessments/[id]/results', { id }),
			admin: null,
			public: null
		}
	},
	chapter: {
		label: 'Chapitre',
		icon: BookOpen,
		routes: {
			// Nested under its class: unresolvable without a classId.
			teacher: (id, { classId }) => (classId ? teacherChapterPath(classId, id) : null),
			student: (id) =>
				resolve('/(protected)/dashboard/student/cours/[chapterId]', { chapterId: id }),
			admin: null,
			public: null
		}
	},
	worksheet: {
		label: 'Fiche d’exercices',
		icon: FileText,
		routes: {
			teacher: (id) => resolve('/(protected)/dashboard/teacher/contenu/worksheets/[id]', { id }),
			// L'élève n'atteint pas une fiche mais la DISTRIBUTION qui le concerne :
			// cette route fait la traduction et redirige.
			student: (id) => resolve('/(protected)/dashboard/student/worksheets/fiche/[id]', { id }),
			admin: null,
			public: null
		}
	},
	python_exercise: {
		label: 'Exercice Python',
		icon: Terminal,
		routes: {
			// La page vit dans le groupe (public) : elle est donc atteignable par
			// tous les rôles, la RLS décidant du contenu.
			teacher: (id) => resolve('/(public)/python-exercises/[id]', { id }),
			student: (id) => resolve('/(public)/python-exercises/[id]', { id }),
			admin: (id) => resolve('/(public)/python-exercises/[id]', { id }),
			public: (id) => resolve('/(public)/python-exercises/[id]', { id })
		}
	},
	python_notebook: {
		label: 'Notebook Python',
		icon: NotebookPen,
		routes: {
			// Sous (protected) mais hors /dashboard : accessible aux trois rôles
			// connectés, jamais à un visiteur.
			teacher: (id) => resolve('/(protected)/python-notebook/[id]', { id }),
			student: (id) => resolve('/(protected)/python-notebook/[id]', { id }),
			admin: (id) => resolve('/(protected)/python-notebook/[id]', { id }),
			public: null
		}
	},
	construction: {
		label: 'Construction',
		icon: Compass,
		routes: {
			teacher: (id) => resolve('/(protected)/constructions/[id]', { id }),
			student: (id) => resolve('/(protected)/constructions/[id]', { id }),
			admin: (id) => resolve('/(protected)/constructions/[id]', { id }),
			public: null
		}
	},
	worksheet_exercise: {
		label: 'Exercice de fiche',
		icon: ClipboardList,
		routes: {
			// Route de résolution : elle traduit l'identifiant de jonction en fiche
			// et redirige. Le registre est synchrone et ne peut pas interroger la
			// base ; c'est donc la route qui fait la traduction.
			teacher: (id) =>
				resolve('/(protected)/dashboard/teacher/contenu/worksheets/exercice/[id]', { id }),
			// Même mécanique côté élève, avec une traduction de plus : il n'atteint
			// pas une fiche mais la DISTRIBUTION de cette fiche qui le concerne.
			student: (id) => resolve('/(protected)/dashboard/student/worksheets/exercice/[id]', { id }),
			admin: null,
			public: null
		}
	},
	document: {
		label: 'Document',
		icon: FileText,
		routes: {
			// No detail page exists for a document yet — only an index and an API
			// endpoint. Declared so references stay typed and countable; they render as
			// inert text until a page exists.
			teacher: null,
			student: null,
			admin: null,
			public: null
		}
	}
};

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Resolve a resource reference into a label, an icon and a URL.
 *
 * @example
 * const link = resolveResource('exercise', id, { role: 'student', label: 'Exercice 5' });
 * if (link.url) goto(link.url);
 */
export function resolveResource(
	kind: ResourceKind,
	id: string,
	options: ResolveResourceOptions
): ResolvedResource {
	const definition = RESOURCE_REGISTRY[kind];
	const buildRoute = definition.routes[options.role];

	return {
		kind,
		id,
		label: options.label ?? definition.label,
		kindLabel: definition.label,
		icon: definition.icon,
		url: buildRoute ? buildRoute(id, options.context ?? {}) : null
	};
}
