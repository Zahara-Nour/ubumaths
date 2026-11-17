/**
 * Présence du Palotin : zones et plafond des passages (chantier `palotins`)
 * ==========================================================================
 *
 * Maison (accueil, Chatterie) : toujours là. Passage (reste de l'espace élève,
 * révisions hors séance) : écusson et passages. Séance : écusson seul.
 * Ailleurs : rien. Un passage spontané au plus toutes les 10 minutes, mémoire
 * du navigateur, qui ne lève jamais (docs/wip/palotins-progress.md, B7 à B9).
 */
import { describe, expect, it } from 'vitest';
import {
	createPassageClock,
	LAST_PASSAGE_KEY,
	palotinZone,
	parseBuddyPresence,
	PASSAGE_COOLDOWN
} from '../palotin-presence';

// Functions
/** Stockage en mémoire, au contrat de `Storage` pour ce qu'utilise l'horloge. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => void values.set(key, value),
		removeItem: (key: string) => void values.delete(key),
		clear: () => values.clear(),
		key: () => null,
		get length() {
			return values.size;
		}
	};
}

/** Stockage qui lève à chaque accès (navigation privée, stockage bloqué). */
function brokenStorage(): Storage {
	const fail = () => {
		throw new Error('SecurityError');
	};
	return {
		getItem: fail,
		setItem: fail,
		removeItem: fail,
		clear: fail,
		key: fail,
		length: 0
	};
}

describe('palotinZone', () => {
	it.each([
		['/dashboard', 'maison'],
		['/dashboard/', 'maison'],
		['/dashboard/student/chatterie', 'maison'],
		['/dashboard/student/chatterie/notion-1', 'maison'],
		['/dashboard/student/devoirs', 'passage'],
		['/dashboard/student/cours/abc', 'passage'],
		['/dashboard/revisions', 'passage'],
		['/dashboard/revisions/decks/42', 'passage'],
		['/automaths/test', 'seance'],
		['/automaths/test/course', 'seance'],
		['/dashboard/revisions/decks/42/study', 'seance'],
		['/dashboard/revisions/chapitres/7', 'seance'],
		['/', null],
		['/shtam', null],
		['/automaths', null],
		['/automaths/testeur', null],
		['/dashboard/teacher', null],
		['/dashboard/studentx', null],
		['/dashboard/profile', null]
	])('%s → %s', (pathname, zone) => {
		expect(palotinZone(pathname)).toBe(zone);
	});
});

describe('createPassageClock — un passage spontané toutes les 10 minutes', () => {
	const T0 = 1_000_000_000_000;

	it('rien d’enregistré : le passage peut avoir lieu', () => {
		expect(createPassageClock(() => memoryStorage()).canPass(T0)).toBe(true);
	});

	it('après un passage : refusé avant 10 min, permis à 10 min', () => {
		const clock = createPassageClock(() => memoryStorage());
		clock.record(T0);
		expect(clock.canPass(T0 + PASSAGE_COOLDOWN - 1)).toBe(false);
		expect(clock.canPass(T0 + PASSAGE_COOLDOWN)).toBe(true);
	});

	it('partagé entre onglets : une autre horloge lit le même stockage', () => {
		const storage = memoryStorage();
		createPassageClock(() => storage).record(T0);
		expect(storage.getItem(LAST_PASSAGE_KEY)).toBe(String(T0));
		expect(createPassageClock(() => storage).canPass(T0 + 60_000)).toBe(false);
	});

	it('valeur illisible en stockage : ignorée', () => {
		const storage = memoryStorage({ [LAST_PASSAGE_KEY]: 'pas un nombre' });
		expect(createPassageClock(() => storage).canPass(T0)).toBe(true);
	});

	it('heure enregistrée dans le futur (horloge changée) : n’empêche rien', () => {
		const storage = memoryStorage({ [LAST_PASSAGE_KEY]: String(T0 + 3_600_000) });
		expect(createPassageClock(() => storage).canPass(T0)).toBe(true);
	});

	it('stockage qui lève : jamais d’erreur, le plafond tient pour la page', () => {
		const clock = createPassageClock(() => brokenStorage());
		expect(clock.canPass(T0)).toBe(true);
		expect(() => clock.record(T0)).not.toThrow();
		expect(clock.canPass(T0 + 60_000)).toBe(false);
	});

	it('pas de stockage du tout : le plafond tient pour la page', () => {
		const clock = createPassageClock(() => null);
		clock.record(T0);
		expect(clock.canPass(T0 + 60_000)).toBe(false);
	});
});

describe('parseBuddyPresence', () => {
	const buddy = {
		student_id: 's',
		palotin_type: 'cotice',
		xp: 1,
		level: 1,
		current_streak: 0,
		longest_streak: 0,
		last_activity_date: null,
		xp_earned_today: 0,
		last_xp_date: null,
		themes_explored: [],
		change_count: 0,
		equipped_skin_id: null,
		constance_week_start: null,
		constance_days_this_week: 0
	};

	it('réponse bien formée : rendue', () => {
		const view = parseBuddyPresence({ buddy, returnAfterPause: true });
		expect(view?.buddy?.palotin_type).toBe('cotice');
		expect(view?.returnAfterPause).toBe(true);
	});

	it('sans Palotin : rendue avec `buddy` nul', () => {
		expect(parseBuddyPresence({ buddy: null, returnAfterPause: false })).toEqual({
			buddy: null,
			returnAfterPause: false,
			weekMoment: null
		});
	});

	it('moment de la semaine transmis ; inconnu → mal formée (B2)', () => {
		expect(
			parseBuddyPresence({ buddy: null, returnAfterPause: false, weekMoment: 'active_weeks_5' })
				?.weekMoment
		).toBe('active_weeks_5');
		expect(
			parseBuddyPresence({ buddy: null, returnAfterPause: false, weekMoment: 'active_weeks_4' })
		).toBeNull();
	});

	it('mal formée : null', () => {
		expect(parseBuddyPresence({ buddy: { ...buddy, palotin_type: 'ubu' } })).toBeNull();
		expect(parseBuddyPresence('panne')).toBeNull();
	});
});
