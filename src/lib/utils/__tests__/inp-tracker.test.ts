/**
 * Calcul de l'INP : interactions seules, une valeur par interaction,
 * règle des 50 interactions, adresse de la page où l'interaction a commencé.
 */
import { describe, expect, it } from 'vitest';
import { createInpTracker, describeTarget, type InteractionEntry } from '../inp-tracker';

// Functions

function element(tag: string, attributes: Record<string, string> = {}): Element {
	return {
		tagName: tag.toUpperCase(),
		getAttribute: (name: string) => attributes[name] ?? null
	} as unknown as Element;
}

function entry(partial: Partial<InteractionEntry>): InteractionEntry {
	return { duration: 0, name: 'click', startTime: 0, interactionId: 1, ...partial };
}

describe('createInpTracker — interactions seules', () => {
	it('ignore les événements sans interactionId (survol, défilement)', () => {
		const tracker = createInpTracker();
		tracker.add(
			[
				entry({ interactionId: 0, duration: 900, name: 'pointerover' }),
				entry({ interactionId: undefined, duration: 800, name: 'scroll' })
			],
			'/a'
		);
		expect(tracker.current()).toBeNull();
	});

	it('une interaction vaut son événement le plus lent, pas la somme', () => {
		const tracker = createInpTracker();
		tracker.add(
			[
				entry({ interactionId: 7, duration: 120, name: 'pointerdown' }),
				entry({ interactionId: 7, duration: 340, name: 'pointerup' }),
				entry({ interactionId: 7, duration: 200, name: 'click' })
			],
			'/a'
		);
		expect(tracker.current()).toMatchObject({ value: 340, eventName: 'pointerup' });
	});

	it("garde l'interaction la plus lente", () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 250 })], '/a');
		tracker.add([entry({ interactionId: 2, duration: 610 })], '/a');
		tracker.add([entry({ interactionId: 3, duration: 300 })], '/a');
		expect(tracker.current()?.value).toBe(610);
	});
});

describe('createInpTracker — règle des 50 interactions', () => {
	it('sous 50 interactions, la plus lente fait l’INP', () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 2000 })], '/a');
		tracker.add([entry({ interactionId: 2, duration: 300 })], '/a');
		expect(tracker.current(49)?.value).toBe(2000);
	});

	it('à 50 interactions, la plus lente est écartée', () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 2000 })], '/a');
		tracker.add([entry({ interactionId: 2, duration: 300 })], '/a');
		expect(tracker.current(50)?.value).toBe(300);
	});

	it('à 100 interactions, les deux plus lentes sont écartées', () => {
		const tracker = createInpTracker();
		for (let i = 1; i <= 100; i++) {
			tracker.add([entry({ interactionId: i, duration: i * 10 })], '/a');
		}
		expect(tracker.current()?.value).toBe(980);
	});

	it('sans compteur du navigateur, compte les interactions observées', () => {
		const tracker = createInpTracker();
		for (let i = 1; i <= 50; i++) {
			tracker.add([entry({ interactionId: i, duration: i })], '/a');
		}
		expect(tracker.current(undefined)?.value).toBe(49);
	});
});

describe('createInpTracker — interactions évincées', () => {
	it('une interaction évincée des 10 plus lentes revient si son entrée la plus lente arrive après', () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 20 })], '/a');
		for (let i = 2; i <= 11; i++) {
			tracker.add([entry({ interactionId: i, duration: 100 + i })], '/a');
		}
		// l'interaction 1 est sortie des 10 gardées ; son pointerup lent arrive
		tracker.add([entry({ interactionId: 1, duration: 900, name: 'pointerup' })], '/a');
		expect(tracker.current()).toMatchObject({ value: 900, eventName: 'pointerup' });
	});

	it('ne compte pas deux fois une interaction évincée puis revenue', () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 20 })], '/a');
		for (let i = 2; i <= 50; i++) {
			tracker.add([entry({ interactionId: i, duration: 100 + i })], '/a');
		}
		tracker.add([entry({ interactionId: 1, duration: 30 })], '/a');
		// 50 interactions distinctes (et non 51) : la plus lente (150) est écartée
		expect(tracker.current()?.value).toBe(149);
	});
});

describe("createInpTracker — adresse de l'interaction", () => {
	it('prend la page du début de l’interaction, pas celle du moment de l’envoi', () => {
		const tracker = createInpTracker();
		tracker.recordStart(1000, 'https://chiph.re/atelier');
		// le clic a mené ailleurs avant que l'entrée soit observée
		tracker.add(
			[entry({ interactionId: 1, duration: 700, startTime: 1005 })],
			'https://chiph.re/dashboard'
		);
		expect(tracker.current()?.url).toBe('https://chiph.re/atelier');
	});

	it('choisit le dernier début qui précède l’interaction', () => {
		const tracker = createInpTracker();
		tracker.recordStart(1000, '/atelier');
		tracker.recordStart(5000, '/cours');
		tracker.recordStart(9000, '/dashboard');
		tracker.add([entry({ interactionId: 1, duration: 700, startTime: 5002 })], '/dashboard');
		expect(tracker.current()?.url).toBe('/cours');
	});

	it("tolère 1 ms d'arrondi entre l'événement et l'entrée", () => {
		const tracker = createInpTracker();
		tracker.recordStart(1000, '/atelier');
		tracker.recordStart(2000.4, '/cours');
		tracker.add([entry({ interactionId: 1, duration: 700, startTime: 2000 })], '/dashboard');
		expect(tracker.current()?.url).toBe('/cours');
	});

	it("sans début connu, prend l'adresse courante", () => {
		const tracker = createInpTracker();
		tracker.add([entry({ interactionId: 1, duration: 700, startTime: 10 })], '/atelier');
		expect(tracker.current()?.url).toBe('/atelier');
	});
});

describe('describeTarget — cible sans donnée personnelle', () => {
	it("n'envoie jamais l'aria-label (il peut porter le nom d'un élève)", () => {
		const cible = element('button', { 'aria-label': "Sélectionner l'élève Léa Martin" });
		expect(describeTarget(cible)).toBe('button');
	});

	it('balise et id', () => {
		expect(describeTarget(element('div', { id: 'grapheur' }))).toBe('div#grapheur');
	});

	it('balise, id et role', () => {
		expect(describeTarget(element('button', { id: 'onglet-graphe', role: 'tab' }))).toBe(
			'button#onglet-graphe[role=tab]'
		);
	});

	it('balise seule, jamais la valeur saisie', () => {
		expect(describeTarget(element('textarea', { value: 'mon secret' }))).toBe('textarea');
	});

	it('cible absente → null', () => {
		expect(describeTarget(null)).toBeNull();
	});

	it('description tronquée à 80 caractères', () => {
		const long = describeTarget(element('div', { id: 'x'.repeat(200) }));
		expect(long?.length).toBe(80);
	});
});
