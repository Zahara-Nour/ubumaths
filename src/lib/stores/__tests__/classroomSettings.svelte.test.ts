/**
 * Réglages de la forme « En classe » (chantier `diaporama-reglages`, phase 0
 * validée le 2026-11-20) : gardés dans le navigateur, rien en base.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/env', () => ({ browser: true, building: false, dev: true }));

const { createClassroomSettingsStore, DEFAULT_CLASSROOM_SETTINGS, CLASSROOM_SETTINGS_KEY } =
	await import('../classroomSettings.svelte.ts');

describe('classroomSettings', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('par défaut : plein écran allumé, le reste éteint, 10 s de correction', () => {
		const store = createClassroomSettingsStore();
		expect(store.settings).toEqual({
			fullscreenOnStart: true,
			correctionAfterEach: false,
			correctionSeconds: 10,
			pauseAtEnd: false,
			chime: false
		});
		expect(DEFAULT_CLASSROOM_SETTINGS.correctionSeconds).toBe(10);
	});

	it('un changement est gardé et relu par un nouveau store', () => {
		const store = createClassroomSettingsStore();
		store.update({ correctionAfterEach: true, chime: true });
		expect(store.settings.correctionAfterEach).toBe(true);

		const again = createClassroomSettingsStore();
		expect(again.settings.correctionAfterEach).toBe(true);
		expect(again.settings.chime).toBe(true);
		expect(again.settings.fullscreenOnStart).toBe(true);
	});

	it('la durée de correction reste entre 5 et 60 s, par pas de 5 s', () => {
		const store = createClassroomSettingsStore();
		store.update({ correctionSeconds: 2 });
		expect(store.settings.correctionSeconds).toBe(5);
		store.update({ correctionSeconds: 90 });
		expect(store.settings.correctionSeconds).toBe(60);
		store.update({ correctionSeconds: 17 });
		expect(store.settings.correctionSeconds).toBe(15);
	});

	it('un contenu gardé illisible ou faux redonne les défauts, champ par champ', () => {
		localStorage.setItem(CLASSROOM_SETTINGS_KEY, '{pas du json');
		expect(createClassroomSettingsStore().settings).toEqual(DEFAULT_CLASSROOM_SETTINGS);

		localStorage.setItem(
			CLASSROOM_SETTINGS_KEY,
			JSON.stringify({ pauseAtEnd: true, correctionSeconds: 'beaucoup', chime: 3 })
		);
		const store = createClassroomSettingsStore();
		expect(store.settings.pauseAtEnd).toBe(true);
		expect(store.settings.correctionSeconds).toBe(10);
		expect(store.settings.chime).toBe(false);
	});

	it('stockage bloqué (navigation privée) : défauts, et les changements valent pour la page', () => {
		const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('bloqué');
		});
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('bloqué');
		});
		try {
			const store = createClassroomSettingsStore();
			expect(store.settings).toEqual(DEFAULT_CLASSROOM_SETTINGS);
			store.update({ pauseAtEnd: true });
			expect(store.settings.pauseAtEnd).toBe(true);
		} finally {
			getItem.mockRestore();
			setItem.mockRestore();
		}
	});
});
