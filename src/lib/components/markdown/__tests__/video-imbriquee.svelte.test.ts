/**
 * Vidéo dans une liste ou une citation (outils manquants n° 21, 2026-11-09)
 *
 * L'arbre ubumark porte le nœud `video` dans un `list-item` ou un `blockquote`,
 * mais `ListNode` et `Blockquote` n'en avaient pas de cas : la vidéo n'était
 * jamais rendue. Elle passe désormais par `VideoDisplay`, comme au premier
 * niveau : les restrictions (chat, cahier) s'appliquent par contexte.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

const MP4 = 'https://exemple.invalid/clip.mp4';
const YOUTUBE = '!video[Cours](https://youtu.be/abcDEF12345)';

async function rendre(content: string, props: Record<string, unknown> = {}) {
	const screen = await render(MarkdownRenderer, { props: { content, ...props } });
	return screen.container as HTMLElement;
}

describe('vidéo imbriquée — rendu normal (cours, exercices)', () => {
	for (const [nom, prefixe] of [
		['liste à puces', '- '],
		['liste numérotée', '1. '],
		['citation', '> '],
		['encadré', '> [!méthode]\n> ']
	] as const) {
		it(`${nom} : lecteur vidéo rendu`, async () => {
			const el = await rendre(`${prefixe}!video[Démo](${MP4})`);
			expect(el.querySelector('video source')?.getAttribute('src')).toBe(MP4);
		});
	}

	it('YouTube dans une liste : lecteur intégré youtube-nocookie', async () => {
		const el = await rendre(`- ${YOUTUBE}`);
		expect(el.querySelector('iframe')?.getAttribute('src')).toContain(
			'youtube-nocookie.com/embed/abcDEF12345'
		);
	});

	it('liste imbriquée dans une citation : rendue aussi', async () => {
		const el = await rendre(`> - !video[Démo](${MP4})`);
		expect(el.querySelector('video source')?.getAttribute('src')).toBe(MP4);
	});
});

describe('vidéo imbriquée — restrictions inchangées', () => {
	it('mode restreint (chat) : ni lecteur ni requête', async () => {
		for (const content of [`- !video[Démo](${MP4})`, `> !video[Démo](${MP4})`, `- ${YOUTUBE}`]) {
			const el = await rendre(content, { restricted: true });
			expect(el.querySelector('video, iframe, source')).toBeNull();
		}
	});

	it('médias du projet seulement (cahier) : un lien, pas de lecteur', async () => {
		for (const content of [`- !video[Démo](${MP4})`, `> !video[Démo](${MP4})`]) {
			const el = await rendre(content, { projectMediaOnly: true });
			expect(el.querySelector('video, iframe, source')).toBeNull();
			expect(el.querySelector('a.external-media')?.getAttribute('href')).toBe(MP4);
		}
	});
});
