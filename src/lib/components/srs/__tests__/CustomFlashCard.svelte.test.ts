/**
 * CustomFlashCard — carte de révision retournable (ReviewSession).
 *
 * iPhone (David, 2026-10-27) : la carte plafonnée à 80 % de l'écran se mesurait
 * elle-même ; à la 2e mesure elle ne se voyait plus trop haute et coupait sa fin
 * au lieu de défiler (même défaut que CorrectionCard).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CustomFlashCard from '../CustomFlashCard.svelte';
import { templateMarkdown } from '$lib/ubumark';

describe('CustomFlashCard — carte plus haute que l’écran', () => {
	it('le recto défile au lieu de couper la fin', async () => {
		const long = Array.from({ length: 80 }, (_, i) => `Ligne ${i + 1}.`).join('\n\n');
		const main = document.body.appendChild(document.createElement('main'));
		const { container } = await render(CustomFlashCard, {
			target: main,
			props: { frontContent: templateMarkdown(long), backContent: templateMarkdown('Réponse') }
		});
		const recto = container.querySelector('.flip-front') as HTMLElement;
		await expect.poll(() => recto.scrollHeight > recto.clientHeight + 1).toBe(true);
		await new Promise((r) => setTimeout(r, 300));
		expect(getComputedStyle(recto).overflowY).toBe('auto');
		// la fiche garde toute sa hauteur (pas écrasée à celle de la face) : sa fin est atteignable
		const fiche = recto.firstElementChild as HTMLElement;
		expect(fiche.scrollHeight).toBeLessThanOrEqual(fiche.clientHeight + 1);
		main.remove();
	});
});
