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
import { flushErrors } from '#lib/utils/errorMonitoring.ts';
import {
	cleanupFreezeDetection,
	clearFreezeDetectionData,
	initFreezeDetection
} from '#lib/utils/freezeDetection.ts';

// Types
type LongTaskCallback = (list: { getEntries: () => { duration: number }[] }) => void;

// Constantes
const ERRORS_ENDPOINT = '/api/errors/log';
const children = createRawSnippet(() => ({ render: () => '<p>page</p>' }));

// Functions
/**
 * Le menu de modération tel qu'il est rendu pour un compteur de signalements :
 * tout son HTML (texte, libellés, pastille, icône), sans les commentaires de Svelte.
 */
async function menuRendu(pendingReportsCount: number | null): Promise<string> {
	const data = { pendingReportsCount } satisfies Pick<ModerationLayoutData, 'pendingReportsCount'>;
	const { container, unmount } = await render(ModerationLayout, {
		props: { data: data as ModerationLayoutData, children }
	});
	const rendu = container.innerHTML.replace(/<!--.*?-->/g, '');
	unmount();
	return rendu;
}

describe('compteur de signalements illisible dans le menu de modération', () => {
	let aucun: string;
	let aucunBis: string;
	let trois: string;
	let illisible: string;

	beforeAll(async () => {
		aucun = await menuRendu(0);
		aucunBis = await menuRendu(0);
		trois = await menuRendu(3);
		illisible = await menuRendu(null);
	});

	it('témoin : le menu est rendu, et deux rendus du même compteur sont identiques', () => {
		expect(aucun).toContain('Gestion');
		expect(aucunBis).toBe(aucun);
	});

	it('témoin : trois signalements en attente ne sont pas rendus comme zéro', () => {
		expect(trois).not.toBe(aucun);
	});

	it.fails('écart L123 : un compteur illisible n’est pas rendu comme zéro signalement', () => {
		expect(illisible).not.toBe(aucun);
	});
});

describe('« Détection des freezes » coupée dans la configuration', () => {
	let envoisActive: number;
	let envoisCoupee: number;
	let envoisRetablie: number;

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

		// Le réseau : la configuration lue par le store, et le point d'envoi de la
		// surveillance, dont on compte les appels. La surveillance elle-même est la
		// vraie : une garde posée chez elle fermerait le test comme une garde posée
		// dans la détection.
		let freezeDetectionEnabled = true;
		const reseau = vi.fn(async (adresse: RequestInfo | URL) =>
			String(adresse) === ERRORS_ENDPOINT
				? Response.json({ success: true })
				: Response.json({ ...DEFAULT_BUG_REPORTS_CONFIG, freezeDetectionEnabled })
		);
		vi.stubGlobal('fetch', reseau);

		/**
		 * Règle la configuration, lance la détection, fait voir une tâche longue de
		 * `duree` ms. Chaque appel prend une durée différente : la surveillance
		 * n'envoie pas deux fois le même message.
		 */
		const envoisApresUneTacheLongue = async (active: boolean, duree: number): Promise<number> => {
			freezeDetectionEnabled = active;
			bugReportsConfigStore.reset();
			await bugReportsConfigStore.load();
			if (bugReportsConfigStore.freezeDetectionEnabled !== active) {
				throw new Error('configuration non prise en compte');
			}

			reseau.mockClear();
			callbacks.length = 0;
			initFreezeDetection();
			if (callbacks.length === 0) throw new Error('observateur de tâches longues non posé');
			for (const callback of callbacks) callback({ getEntries: () => [{ duration: duree }] });
			// L'envoi passe par un `import()`, puis par une file : les laisser aboutir.
			await vi.dynamicImportSettled();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await flushErrors();
			cleanupFreezeDetection();
			return reseau.mock.calls.filter(([adresse]) => String(adresse) === ERRORS_ENDPOINT).length;
		};

		envoisActive = await envoisApresUneTacheLongue(true, 60_000);
		envoisCoupee = await envoisApresUneTacheLongue(false, 61_000);
		envoisRetablie = await envoisApresUneTacheLongue(true, 62_000);
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

	it('témoin : détection rétablie, la tâche suivante est de nouveau envoyée', () => {
		expect(envoisRetablie).toBe(1);
	});

	it.fails('écart L110 : détection coupée, la tâche longue n’est pas envoyée', () => {
		expect(envoisCoupee).toBe(0);
	});
});
