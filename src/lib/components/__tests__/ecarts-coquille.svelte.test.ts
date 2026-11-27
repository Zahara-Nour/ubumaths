/**
 * Écarts de la coquille qui demandent un navigateur (docs/ecarts/registre.md) :
 * L41, L43, L45, L52.
 *
 * Le projet vitest `ecarts` n'a pas de navigateur : chaque écart est ici en
 * `it.fails`, et son nom porte le marqueur « écart L41 » que la preuve du
 * registre cherche. Tant que l'écart est vrai, `it.fails` est vert ; à la
 * correction il devient rouge, et la PR qui corrige retire `.fails` ET le
 * marqueur (docs/pratiques/registre-des-ecarts.md § Les trois preuves).
 *
 * Un `it.fails` est vert dès que son corps lève : chaque écart a donc un témoin,
 * test ordinaire qui fait le même geste sur un cas qui marche déjà, et le corps
 * du `it.fails` ne porte qu'une affirmation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet, flushSync } from 'svelte';
import Recherche from '../../../routes/(protected)/dashboard/teacher/recherche/+page.svelte';
import type { PageData as RecherchePageData } from '../../../routes/(protected)/dashboard/teacher/recherche/$types';
import TeacherLayout from '../../../routes/(protected)/dashboard/teacher/+layout.svelte';
import type { LayoutData as TeacherLayoutData } from '../../../routes/(protected)/dashboard/teacher/$types';
import Wheel from '../Wheel.svelte';
import { StudentDashboardCache } from '#lib/stores/studentDashboardCache.svelte.ts';
import { clearSelectedClass } from '#lib/stores/selectedClass.svelte.ts';
import { teacherCache } from '#lib/stores/teacherDashboardCache.svelte.ts';
import type { ClassWithData } from '#lib/server/students.ts';
import type { ResourceKind } from '#lib/resources/kinds.ts';
import type { StudentProfile } from '#lib/types/student-cache.ts';

// Constantes
const HOUR = 60 * 60 * 1000;
const PROFILE: StudentProfile = {
	id: 'eleve-1',
	email: 'eleve01@local.test',
	firstname: 'Ada',
	lastname: null,
	full_name: null,
	avatar_url: null,
	grade: null,
	is_test: false,
	school_id: null,
	classes: []
};
const STUDENTS = [
	{ id: 'eleve-1', firstname: 'Ada' },
	{ id: 'eleve-2', firstname: 'Blaise' },
	{ id: 'eleve-3', firstname: 'Sophie' }
];

// Functions
/** Les données de la page de recherche pour une adresse `?q=…&kinds=…`. */
function rechercheData(query: string, kinds: ResourceKind[]): RecherchePageData {
	const data = {
		query,
		kinds,
		tags: [] as string[],
		results: [] as RecherchePageData['results'],
		searched: false,
		error: null
	} satisfies Pick<
		RecherchePageData,
		'query' | 'kinds' | 'tags' | 'results' | 'searched' | 'error'
	>;
	return data as RecherchePageData;
}

/** Les types cochés tels que le formulaire les enverrait. */
function kindsEnvoyes(container: HTMLElement): string {
	return container.querySelector<HTMLInputElement>('input[name="kinds"]')?.value ?? 'absent';
}

function classe(id: string, name: string): ClassWithData {
	return {
		id,
		name,
		description: null,
		join_code: 'ABC123',
		is_active: true,
		created_at: '2026-09-01T08:00:00.000Z',
		updated_at: '2026-09-01T08:00:00.000Z',
		google_classroom_course_id: null,
		student_count: 0,
		schedules: []
	};
}

/** Les données du layout prof, sans utilisateur (aucune lecture réseau lancée). */
function layoutData(classes: ClassWithData[]): TeacherLayoutData {
	const data = {
		classes,
		classesLoaded: true,
		currentPeriod: null,
		allPeriods: [] as TeacherLayoutData['allPeriods']
	} satisfies Pick<TeacherLayoutData, 'classes' | 'classesLoaded' | 'currentPeriod' | 'allPeriods'>;
	return data as TeacherLayoutData;
}

const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));

/** Les noms des classes que le cache du prof connaît. */
function classesEnCache(): string[] {
	return teacherCache
		.getAllClassesSync()
		.map((c) => c.name)
		.sort();
}

/** La durée de rotation de la roue une fois lancée. */
async function dureeDeRotation(props: { spinDuration?: number }): Promise<string> {
	const { container } = await render(Wheel, {
		props: { students: STUDENTS, showConfetti: false, ...props }
	});
	container
		.querySelector('.center-button')
		?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	flushSync();
	// Style calculé, pas le style en ligne : une durée posée par une variable CSS compte aussi.
	const svg = container.querySelector('svg');
	return svg ? getComputedStyle(svg).transitionDuration : 'absent';
}

describe('recherche du prof : filtres au retour arrière', () => {
	it('témoin : les types de l’adresse d’arrivée sont cochés', async () => {
		const { container } = await render(Recherche, {
			props: { data: rechercheData('fractions', ['exercise']) }
		});
		expect(kindsEnvoyes(container)).toBe('exercise');
	});

	// Aujourd'hui : « exercise » reste coché après la navigation.
	it.fails('écart L41 : une autre recherche (retour arrière) coche ses propres types', async () => {
		const { container, rerender } = await render(Recherche, {
			props: { data: rechercheData('fractions', ['exercise']) }
		});
		await rerender({ data: rechercheData('pythagore', ['worksheet']) });
		expect(kindsEnvoyes(container)).toBe('worksheet');
	});
});

describe('cache élève : donnée périmée', () => {
	let cache: StudentDashboardCache;
	let seen: StudentProfile | null | undefined;
	let stop: () => void;

	// Un écran qui lit le profil par `getProfileSync`, comme un `$derived`.
	beforeEach(() => {
		vi.useFakeTimers();
		cache = new StudentDashboardCache();
		cache.hydrateProfile(PROFILE);
		seen = undefined;
		stop = $effect.root(() => {
			$effect(() => {
				seen = cache.getProfileSync();
			});
		});
		flushSync();
	});
	afterEach(() => {
		stop();
		vi.useRealTimers();
	});

	it('témoin : l’écran lit le profil, et une lecture directe le voit périmé après 3 heures', () => {
		expect(seen?.firstname).toBe('Ada');
		vi.advanceTimersByTime(3 * HOUR);
		flushSync();
		expect(cache.getProfileSync()).toBeNull();
	});

	// Aujourd'hui : l'écran garde le profil périmé (l'heure n'est pas réactive).
	it.fails('écart L43 : après 3 heures, l’écran ne montre plus le profil périmé', () => {
		const avant = seen;
		vi.advanceTimersByTime(3 * HOUR);
		flushSync();
		// Rien (null) ou un profil relu : tout sauf le profil périmé.
		expect(seen).not.toBe(avant);
	});
});

describe('layout du prof : données neuves après une action de formulaire', () => {
	beforeEach(() => {
		teacherCache.hydrateAllClasses([]);
	});
	// Le layout retient la première classe dans le localStorage : ne pas la laisser aux autres tests.
	afterEach(() => {
		clearSelectedClass();
	});

	it('témoin : les classes d’arrivée sont dans le cache', async () => {
		await render(TeacherLayout, {
			props: { data: layoutData([classe('c1', '6e A')]), children }
		});
		expect(classesEnCache()).toEqual(['6e A']);
	});

	// Aujourd'hui : le cache garde « 6e A » seule (lu une fois, au montage).
	it.fails('écart L45 : une classe ajoutée (données relues) arrive dans le cache', async () => {
		const { rerender } = await render(TeacherLayout, {
			props: { data: layoutData([classe('c1', '6e A')]), children }
		});
		await rerender({ data: layoutData([classe('c1', '6e A'), classe('c2', '5e B')]) });
		expect(classesEnCache()).toEqual(['5e B', '6e A']);
	});
});

describe('roue : durée de rotation', () => {
	it('témoin : sans durée demandée, la roue tourne 4 secondes', async () => {
		expect(await dureeDeRotation({})).toBe('4s');
	});

	// Aujourd'hui : 4 secondes quelle que soit la durée demandée.
	it.fails('écart L52 : avec spinDuration = 2, la roue tourne 2 secondes', async () => {
		expect(await dureeDeRotation({ spinDuration: 2 })).toBe('2s');
	});
});
