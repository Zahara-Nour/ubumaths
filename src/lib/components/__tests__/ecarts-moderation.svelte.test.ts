/**
 * Écarts de modération et de surveillance qui demandent un navigateur
 * (docs/ecarts/registre.md) : L110, L123.
 *
 * Le projet vitest `ecarts` n'a pas de navigateur : chaque écart est ici en
 * `it.fails`, et son nom porte le marqueur « écart L123 » que la preuve du
 * registre cherche. Tant que l'écart est vrai, `it.fails` est vert ; à la
 * correction il devient rouge, et la PR qui corrige retire `.fails` ET le
 * marqueur (docs/pratiques/registre-des-ecarts.md § Les trois preuves).
 *
 * Un `it.fails` est vert dès que son corps lève : chaque écart a donc un témoin,
 * test ordinaire qui fait le même geste sur un cas qui marche déjà, la sonde
 * tourne dans un `beforeAll` et le corps du `it.fails` ne porte qu'une affirmation.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import ModerationLayout from '../../../routes/(protected)/dashboard/teacher/moderation/+layout.svelte';
import type { LayoutData as ModerationLayoutData } from '../../../routes/(protected)/dashboard/teacher/moderation/$types';
import { bugReportsConfigStore } from '#lib/stores/bugReportsConfig.svelte.ts';
import { DEFAULT_BUG_REPORTS_CONFIG } from '#lib/types/bug-reports.ts';
import {
	cleanupFreezeDetection,
	clearFreezeDetectionData,
	initFreezeDetection
} from '#lib/utils/freezeDetection.ts';

// Types
type LongTaskCallback = (list: { getEntries: () => { duration: number }[] }) => void;

// Constantes
const sent = vi.hoisted(() => ({ capturePerformance: vi.fn(), captureError: vi.fn() }));
const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));

vi.mock('#lib/utils/errorMonitoring.ts', () => sent);

// Functions
/**
 * Ce que le menu de modération donne à lire pour un compteur de signalements :
 * son texte, et les libellés portés par `aria-label` ou `title`.
 */
async function menuLu(pendingReportsCount: number | null): Promise<string> {
	const data = { pendingReportsCount } satisfies Pick<ModerationLayoutData, 'pendingReportsCount'>;
	const { container, unmount } = await render(ModerationLayout, {
		props: { data: data as ModerationLayoutData, children }
	});
	const libelles = [...container.querySelectorAll('[aria-label], [title]')].map(
		(el) => `${el.getAttribute('aria-label') ?? ''}|${el.getAttribute('title') ?? ''}`
	);
	const lu = `${container.textContent?.replace(/\s+/g, ' ').trim()} ## ${libelles.join(' ; ')}`;
	unmount();
	return lu;
}

describe('compteur de signalements illisible dans le menu de modération', () => {
	let aucun: string;
	let aucunBis: string;
	let trois: string;
	let illisible: string;

	beforeAll(async () => {
		aucun = await menuLu(0);
		aucunBis = await menuLu(0);
		trois = await menuLu(3);
		illisible = await menuLu(null);
	});

	it('témoin : le menu se lit, et deux rendus du même compteur se lisent pareil', () => {
		expect(aucun).toContain('Gestion');
		expect(aucunBis).toBe(aucun);
	});

	it('témoin : trois signalements en attente ne se lisent pas comme zéro', () => {
		expect(trois).not.toBe(aucun);
	});

	it.fails('écart L123 : un compteur illisible ne se lit pas comme zéro signalement', () => {
		expect(illisible).not.toBe(aucun);
	});
});

describe('« Détection des freezes » coupée dans la configuration', () => {
	let envoisActive: number;
	let envoisCoupee: number;

	beforeAll(async () => {
		// Un faux observateur de tâches longues : le test décide quand une tâche
		// longue est vue (l'API n'existe que sous Chromium, et ne se commande pas).
		const callbacks: LongTaskCallback[] = [];
		vi.stubGlobal(
			'PerformanceObserver',
			class {
				constructor(callback: LongTaskCallback) {
					callbacks.push(callback);
				}
				observe(): void {}
				disconnect(): void {}
			}
		);

		/** Règle la configuration, lance la détection, fait voir une tâche d'une minute. */
		const envoisApresUneTacheLongue = async (freezeDetectionEnabled: boolean): Promise<number> => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => Response.json({ ...DEFAULT_BUG_REPORTS_CONFIG, freezeDetectionEnabled }))
			);
			bugReportsConfigStore.reset();
			await bugReportsConfigStore.load();
			if (bugReportsConfigStore.freezeDetectionEnabled !== freezeDetectionEnabled) {
				throw new Error('configuration non prise en compte');
			}

			sent.capturePerformance.mockClear();
			sent.captureError.mockClear();
			callbacks.length = 0;
			initFreezeDetection();
			for (const callback of callbacks) callback({ getEntries: () => [{ duration: 60_000 }] });
			// L'envoi passe par un `import()` : le laisser aboutir avant de compter.
			await vi.dynamicImportSettled();
			await new Promise((resolve) => setTimeout(resolve, 50));
			cleanupFreezeDetection();
			return sent.capturePerformance.mock.calls.length + sent.captureError.mock.calls.length;
		};

		envoisActive = await envoisApresUneTacheLongue(true);
		envoisCoupee = await envoisApresUneTacheLongue(false);
	});

	afterAll(() => {
		cleanupFreezeDetection();
		clearFreezeDetectionData();
		bugReportsConfigStore.reset();
		vi.unstubAllGlobals();
	});

	it('témoin : détection active, une tâche d’une minute est envoyée à la surveillance', () => {
		expect(envoisActive).toBe(1);
	});

	it.fails('écart L110 : détection coupée, la même tâche n’est pas envoyée', () => {
		expect(envoisCoupee).toBe(0);
	});
});
