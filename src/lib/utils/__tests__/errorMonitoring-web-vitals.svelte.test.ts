/**
 * Suivi des Web Vitals : INP et CLS ne partent qu'une fois par valeur.
 *
 * INP et CLS sont envoyés au passage de la page en arrière-plan. Avant, la
 * même valeur repartait à CHAQUE passage, dès que la fenêtre anti-doublon de
 * 5 minutes était écoulée : un onglet laissé ouvert plusieurs jours renvoyait
 * le même INP des dizaines de fois (prod, octobre 2026 : « INP 1688ms » ×28,
 * un seul élève, une seule page). Les comptes d'INP de `error_logs` étaient
 * gonflés d'autant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureError, flushErrors, initWebVitals } from '../errorMonitoring';

// Le module garde ses empreintes anti-doublon d'un test à l'autre
// (`vi.resetModules` ne le recharge pas en mode navigateur) : chaque test
// a ses propres valeurs.

/** Les messages réellement envoyés à l'API */
let sent: string[] = [];
/** Les corps complets envoyés (adresse, contexte) */
let bodies: { message: string; url: string; context?: Record<string, unknown> }[] = [];

/** Rappels des PerformanceObserver, par type observé */
const observers = new Map<string, (list: { getEntries: () => unknown[] }) => void>();

let visibility: DocumentVisibilityState = 'visible';

class FakeObserver {
	private callback: (list: { getEntries: () => unknown[] }) => void;
	constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
		this.callback = callback;
	}
	observe(options: { type: string }) {
		observers.set(options.type, this.callback);
	}
	disconnect() {}
}

function emit(type: string, entries: unknown[]) {
	observers.get(type)?.({ getEntries: () => entries });
}

/** Un aller-retour de l'onglet en arrière-plan, puis l'envoi */
async function hideAndShow() {
	visibility = 'hidden';
	document.dispatchEvent(new Event('visibilitychange'));
	visibility = 'visible';
	document.dispatchEvent(new Event('visibilitychange'));
	await flushErrors();
}

/** Laisse passer la fenêtre anti-doublon (5 minutes) et la limite par minute */
function waitSixMinutes() {
	vi.advanceTimersByTime(6 * 60 * 1000);
}

beforeEach(() => {
	vi.useFakeTimers();
	sent = [];
	bodies = [];
	observers.clear();
	vi.stubGlobal('PerformanceObserver', FakeObserver);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_url: string, init?: { body?: string }) => {
			const body = JSON.parse(init?.body ?? '{}');
			sent.push(body.message);
			bodies.push(body);
			return new Response(null, { status: 200 });
		})
	);
	Object.defineProperty(document, 'visibilityState', {
		configurable: true,
		get: () => visibility
	});
	initWebVitals();
});

afterEach(() => {
	window.dispatchEvent(new Event('beforeunload')); // remet initWebVitals à zéro
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('Web Vitals — INP et CLS une fois par valeur', () => {
	it("n'envoie pas deux fois le même INP, même après 5 minutes", async () => {
		emit('event', [{ duration: 616, interactionId: 1 }]);
		await hideAndShow();
		waitSixMinutes();
		await hideAndShow();
		waitSixMinutes();
		await hideAndShow();

		expect(sent).toEqual(['Web Vital INP: 616ms (threshold: 200ms)']);
	});

	it('envoie le nouvel INP quand une interaction plus lente survient', async () => {
		emit('event', [{ duration: 650, interactionId: 1 }]);
		await hideAndShow();
		waitSixMinutes();
		emit('event', [{ duration: 800, interactionId: 2 }]);
		await hideAndShow();

		expect(sent).toEqual([
			'Web Vital INP: 650ms (threshold: 200ms)',
			'Web Vital INP: 800ms (threshold: 200ms)'
		]);
	});

	it("n'envoie pas deux fois le même CLS, même après 5 minutes", async () => {
		emit('layout-shift', [{ hadRecentInput: false, value: 0.3 }]);
		await hideAndShow();
		waitSixMinutes();
		await hideAndShow();

		expect(sent).toEqual(['Web Vital CLS: 0.300 (threshold: 0.1)']);
	});

	it('renvoie au passage suivant un INP abandonné par la limite par minute', async () => {
		// 10 erreurs par minute au plus : la limite est atteinte avant l'INP
		for (let i = 0; i < 10; i++) captureError(`Erreur de remplissage ${i}`);
		emit('event', [{ duration: 1234, interactionId: 1 }]);
		await hideAndShow();
		expect(sent).not.toContain('Web Vital INP: 1234ms (threshold: 200ms)');

		vi.advanceTimersByTime(61 * 1000);
		await hideAndShow();

		expect(sent).toContain('Web Vital INP: 1234ms (threshold: 200ms)');
	});
});

describe('Web Vitals — INP compté sur les seules interactions', () => {
	it("n'envoie rien pour un événement lent qui n'est pas une interaction", async () => {
		emit('event', [{ duration: 1500, interactionId: 0, name: 'pointerover', startTime: 1 }]);
		await hideAndShow();

		expect(sent).toEqual([]);
	});

	it("rattache l'INP à la page où l'interaction a commencé", async () => {
		const initial = window.location.href;
		try {
			history.pushState(null, '', '/atelier-inp-test');
			const start = new PointerEvent('pointerdown', { bubbles: true });
			window.dispatchEvent(start);
			history.pushState(null, '', '/dashboard-inp-test');
			emit('event', [
				{ duration: 1700, interactionId: 41, name: 'pointerup', startTime: start.timeStamp + 3 }
			]);
			await hideAndShow();
		} finally {
			history.replaceState(null, '', initial);
		}

		expect(sent).toEqual(['Web Vital INP: 1700ms (threshold: 200ms)']);
		expect(new URL(bodies[0].url).pathname).toBe('/atelier-inp-test');
	});

	it("joint le type d'événement et la cible, sans aria-label ni contenu saisi", async () => {
		const button = document.createElement('button');
		button.setAttribute('aria-label', "Sélectionner l'élève Léa Martin");
		button.id = 'zoom-avant';
		emit('event', [
			{ duration: 1900, interactionId: 42, name: 'click', startTime: 1, target: button }
		]);
		await hideAndShow();

		expect(bodies[0].context).toMatchObject({
			event_name: 'click',
			target: 'button#zoom-avant'
		});
	});

	it('ne garde plus les écouteurs de début après le beforeunload', async () => {
		const initial = window.location.href;
		try {
			// beforeunload (sortie annulée) puis nouvelle initialisation
			window.dispatchEvent(new Event('beforeunload'));
			initWebVitals();
			history.pushState(null, '', '/atelier-inp-reinit');
			const start = new KeyboardEvent('keydown', { bubbles: true });
			window.dispatchEvent(start);
			history.pushState(null, '', '/dashboard-inp-reinit');
			emit('event', [
				{ duration: 1800, interactionId: 43, name: 'keydown', startTime: start.timeStamp }
			]);
			await hideAndShow();
		} finally {
			history.replaceState(null, '', initial);
		}

		expect(sent).toEqual(['Web Vital INP: 1800ms (threshold: 200ms)']);
		expect(new URL(bodies[0].url).pathname).toBe('/atelier-inp-reinit');
	});
});
