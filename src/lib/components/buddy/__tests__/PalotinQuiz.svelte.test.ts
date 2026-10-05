import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PalotinQuiz from '../PalotinQuiz.svelte';

describe('PalotinQuiz', () => {
	// Fenêtre posée par-dessus une page qui a déjà son h1 : titre de niveau 2
	it('titre de niveau 2, jamais un second h1', async () => {
		const screen = await render(PalotinQuiz, { props: { onComplete: () => {} } });
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Choisis ton Palotin !' }))
			.toBeVisible();
		expect(screen.container.querySelectorAll('h1')).toHaveLength(0);
	});
});
