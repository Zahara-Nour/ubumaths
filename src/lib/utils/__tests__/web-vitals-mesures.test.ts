/**
 * Mesures de performance envoyées à notre serveur (chantier amelioration, PR 2).
 *
 * Le collecteur garde les mesures d'une visite et les envoie quand la page passe en
 * arrière-plan : toutes, bonnes ou mauvaises, rattachées à l'identifiant de route
 * (« /(public)/cours/[token] »), jamais à l'adresse réelle.
 */
import { describe, it, expect, vi } from 'vitest';
import {
	createClsTracker,
	createSampleCollector,
	isMeasuredRoute,
	isPlausibleValue,
	type WebVitalSample
} from '../web-vitals-mesures.ts';

function collecteur() {
	const send = vi.fn<(samples: WebVitalSample[]) => void>();
	return { send, collector: createSampleCollector(send) };
}

describe('isMeasuredRoute', () => {
	it.each(['/', '/(public)/cours/[token]', '/(protected)/automaths/test'])('compte %s', (route) => {
		expect(isMeasuredRoute(route)).toBe(true);
	});

	it.each([
		'/(protected)/dashboard/admin',
		'/(protected)/dashboard/admin/errors',
		'/(protected)/dev',
		'/(protected)/dev/modeles/[id]'
	])('écarte %s (admin et /dev)', (route) => {
		expect(isMeasuredRoute(route)).toBe(false);
	});

	it('ne confond pas un mot qui commence par « dev » ou « admin »', () => {
		expect(isMeasuredRoute('/(public)/developpement')).toBe(true);
		expect(isMeasuredRoute('/(public)/administration')).toBe(true);
	});

	it('écarte une route inconnue (null) ou vide', () => {
		expect(isMeasuredRoute(null)).toBe(false);
		expect(isMeasuredRoute('')).toBe(false);
	});
});

describe('isPlausibleValue', () => {
	it('accepte une durée jusqu’à dix minutes', () => {
		expect(isPlausibleValue('LCP', 0)).toBe(true);
		expect(isPlausibleValue('LCP', 600_000)).toBe(true);
	});

	it('refuse une valeur absurde, négative ou non finie', () => {
		expect(isPlausibleValue('LCP', 5_648_992)).toBe(false);
		expect(isPlausibleValue('TTFB', -1)).toBe(false);
		expect(isPlausibleValue('INP', Number.NaN)).toBe(false);
		expect(isPlausibleValue('FCP', Number.POSITIVE_INFINITY)).toBe(false);
	});

	it('borne le CLS à 100', () => {
		expect(isPlausibleValue('CLS', 0.05)).toBe(true);
		expect(isPlausibleValue('CLS', 100.5)).toBe(false);
	});
});

describe('createSampleCollector', () => {
	it('envoie les mesures de chargement, bonnes comprises, sur la route d’arrivée', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/(public)/cours/[token]');
		collector.recordLoad('TTFB', 120.4);
		collector.recordLoad('FCP', 800.6);
		collector.recordLoad('LCP', 1200);

		collector.flush();

		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][0]).toEqual([
			{ route: '/(public)/cours/[token]', metric: 'TTFB', value: 120 },
			{ route: '/(public)/cours/[token]', metric: 'FCP', value: 801 },
			{ route: '/(public)/cours/[token]', metric: 'LCP', value: 1200 }
		]);
	});

	it('garde le dernier LCP observé avant l’envoi', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordLoad('LCP', 900);
		collector.recordLoad('LCP', 1500);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([{ route: '/', metric: 'LCP', value: 1500 }]);
	});

	it('rattache le chargement à la page d’arrivée, même après une navigation interne', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.noteRoute('/(protected)/automaths');
		collector.recordLoad('LCP', 1000);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([{ route: '/', metric: 'LCP', value: 1000 }]);
	});

	it('arrivée sur une page sans route (404) : le chargement n’est pas reporté sur la suivante', () => {
		const { send, collector } = collecteur();
		collector.noteRoute(null);
		collector.recordLoad('LCP', 1000);
		collector.noteRoute('/(public)');

		collector.flush();

		expect(send).not.toHaveBeenCalled();
	});

	it('n’envoie le chargement qu’une fois, et ignore un LCP venu après', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordLoad('LCP', 1000);
		collector.flush();

		collector.recordLoad('LCP', 4000);
		collector.flush();

		expect(send).toHaveBeenCalledTimes(1);
	});

	it('envoie le CLS sur la page courante, arrondi au millième', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.noteRoute('/(protected)/automaths');
		collector.recordCls(0.04567);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([
			{ route: '/(protected)/automaths', metric: 'CLS', value: 0.046 }
		]);
	});

	it('envoie un CLS nul : une page stable compte dans le relevé', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordCls(0);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([{ route: '/', metric: 'CLS', value: 0 }]);
	});

	it('envoie l’INP sur la route où l’interaction a commencé', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/(protected)/automaths');
		collector.recordInp(180, '/(protected)/automaths/test');

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([
			{ route: '/(protected)/automaths/test', metric: 'INP', value: 180 }
		]);
	});

	it('une ligne par visite : CLS et INP ne repartent pas après un retour sur l’onglet', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordCls(0.1);
		collector.recordInp(100, '/');
		collector.flush();

		// l'élève revient, une interaction lente survient, il repart
		collector.recordCls(0.3);
		collector.recordInp(250, '/');
		collector.flush();

		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][0]).toEqual([
			{ route: '/', metric: 'CLS', value: 0.1 },
			{ route: '/', metric: 'INP', value: 100 }
		]);
	});

	it('un passage en arrière-plan avant que la page soit notée ne consomme pas l’envoi', () => {
		const { send, collector } = collecteur();
		collector.recordLoad('TTFB', 90);
		collector.flush();
		expect(send).not.toHaveBeenCalled();

		collector.noteRoute('/');
		collector.recordCls(0.2);
		collector.flush();
		expect(send.mock.calls[0][0]).toEqual([
			{ route: '/', metric: 'TTFB', value: 90 },
			{ route: '/', metric: 'CLS', value: 0.2 }
		]);
	});

	it('n’envoie rien pour une page d’admin ou de /dev', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/(protected)/dashboard/admin/errors');
		collector.recordLoad('LCP', 1000);
		collector.recordCls(0.2);
		collector.recordInp(300, '/(protected)/dev/modeles');

		collector.flush();

		expect(send).not.toHaveBeenCalled();
	});

	it('n’envoie rien tant que la route est inconnue', () => {
		const { send, collector } = collecteur();
		collector.recordLoad('LCP', 1000);
		collector.recordCls(0.2);
		collector.recordInp(300, null);

		collector.flush();

		expect(send).not.toHaveBeenCalled();
	});

	it('écarte une valeur absurde et garde les autres', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordLoad('LCP', 5_648_992);
		collector.recordLoad('TTFB', 90);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([{ route: '/', metric: 'TTFB', value: 90 }]);
	});

	it('une mesure écartée ne fait pas perdre les autres du même envoi', () => {
		const { send, collector } = collecteur();
		collector.noteRoute('/');
		collector.recordInp(900_000, '/');
		collector.recordCls(0.2);

		collector.flush();

		expect(send.mock.calls[0][0]).toEqual([{ route: '/', metric: 'CLS', value: 0.2 }]);
	});
});

describe('createClsTracker', () => {
	it('vaut 0 sans décalage', () => {
		expect(createClsTracker().value()).toBe(0);
	});

	it('additionne les décalages d’une même rafale (moins d’une seconde d’écart)', () => {
		const cls = createClsTracker();
		cls.add(0.05, 1000);
		cls.add(0.03, 1500);
		expect(cls.value()).toBeCloseTo(0.08);
	});

	it('retient la pire rafale, pas la somme de la visite', () => {
		const cls = createClsTracker();
		cls.add(0.05, 1000);
		cls.add(0.2, 10_000);
		cls.add(0.01, 60_000);
		expect(cls.value()).toBeCloseTo(0.2);
	});

	it('coupe une rafale au bout de cinq secondes', () => {
		const cls = createClsTracker();
		for (let time = 0; time <= 5600; time += 800) cls.add(0.01, time);
		// 0 à 4800 ms : sept décalages ; 5600 ms ouvre une nouvelle rafale
		expect(cls.value()).toBeCloseTo(0.07);
	});
});
