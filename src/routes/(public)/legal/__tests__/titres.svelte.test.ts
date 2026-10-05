import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Component } from 'svelte';
import Mentions from '../mentions-legales/+page.svelte';
import Confidentialite from '../confidentialite/+page.svelte';
import Cgu from '../cgu/+page.svelte';

describe('titres des pages légales, accentués', () => {
	it.each([
		['mentions légales', Mentions, 'Mentions légales'],
		['confidentialité', Confidentialite, 'Politique de confidentialité'],
		['CGU', Cgu, 'Conditions générales d’utilisation']
	] as [string, Component, string][])('%s', async (_nom, Page, titre) => {
		const screen = await render(Page);
		await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(titre);
	});
});
