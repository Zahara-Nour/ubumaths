import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';
import AppToaster from './AppToaster.svelte';

/** Nombre d'annonces visibles (sonner garde les autres dans le DOM, masquées) */
function visibleCount(): number {
	return document.querySelectorAll('[data-sonner-toast][data-visible="true"]').length;
}

describe('AppToaster', () => {
	afterEach(() => {
		toast.dismiss();
		vi.restoreAllMocks();
		// mobileStore est un singleton : lui rendre la vraie largeur
		window.dispatchEvent(new Event('resize'));
	});

	it('au téléphone, une seule annonce visible à la fois (la plus récente)', async () => {
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
		window.dispatchEvent(new Event('resize'));
		await render(AppToaster);
		toast.success('Atelier enregistré.');
		toast.success('Atelier vidé.');
		toast.success('Atelier chargé.');
		flushSync();
		await tick();
		await new Promise((r) => setTimeout(r, 400));
		expect(visibleCount()).toBe(1);
	});

	it("sur ordinateur, jusqu'à cinq annonces visibles", async () => {
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280);
		window.dispatchEvent(new Event('resize'));
		await render(AppToaster);
		// Six annonces : le défaut de sonner (3) ne suffirait pas
		for (const n of ['Un.', 'Deux.', 'Trois.', 'Quatre.', 'Cinq.', 'Six.']) toast.success(n);
		flushSync();
		await tick();
		await new Promise((r) => setTimeout(r, 400));
		expect(visibleCount()).toBe(5);
	});
});
