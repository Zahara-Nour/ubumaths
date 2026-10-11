/**
 * Source d'une image Markdown.
 *
 * Un nom de fichier simple (`figure.png`) désigne le stockage des questions ;
 * un chemin qui commence par `/` (`/shtam/armoire.svg`) désigne un fichier du
 * site (`static/`) — illustrations des articles du Shtam (2026-10-05).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ImageDisplay from '../ImageDisplay.svelte';

async function srcOf(src: string): Promise<string | null> {
	const screen = await render(ImageDisplay, { props: { src, alt: 'illustration' } });
	return screen.container.querySelector('img')?.getAttribute('src') ?? null;
}

describe('source d’une image', () => {
	it('un chemin du site est servi tel quel', async () => {
		expect(await srcOf('/shtam/armoire-relevee.svg')).toBe('/shtam/armoire-relevee.svg');
	});

	it('un nom de fichier simple va toujours au stockage des questions', async () => {
		expect(await srcOf('figure.png')).toMatch(/\/storage\/v1\/object\/public\/.+\/figure\.png$/);
	});

	it('une adresse complète est servie telle quelle', async () => {
		expect(await srcOf('https://exemple.fr/a.png')).toBe('https://exemple.fr/a.png');
	});

	it('`//autre-site` n’est pas pris pour un chemin du site', async () => {
		expect(await srcOf('//autre-site.fr/a.png')).not.toBe('//autre-site.fr/a.png');
	});
});
