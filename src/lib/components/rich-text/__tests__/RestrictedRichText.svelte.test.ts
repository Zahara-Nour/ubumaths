/**
 * Affichage restreint d'un contenu écrit par un ÉLÈVE et lu par d'autres
 * (messagerie, signalements de fiches) : rien n'y charge de ressource externe.
 *
 * `RichTextDisplay` monte l'éditeur COMPLET en lecture seule : l'audit du
 * 2026-10-03 y a prouvé vidéo externe, `\htmlStyle` et injection CSS par la
 * couleur de texte (`textStyle`). `RestrictedRichText` rend le même contenu par
 * le moteur markdown en mode restreint (S1).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { JSONContent } from '@tiptap/core';
import RestrictedRichText from '../RestrictedRichText.svelte';

const HOTE = 'exemple.invalid';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

/** Tous les éléments, shadow DOM des formules compris */
function allElements(root: Element | ShadowRoot): Element[] {
	const out: Element[] = [];
	for (const el of root.querySelectorAll('*')) {
		out.push(el);
		if (el.shadowRoot) out.push(...allElements(el.shadowRoot));
	}
	return out;
}

/** Les attributs qui feraient une requête vers l'hôte hostile */
function hostileAttributes(root: Element): string[] {
	return allElements(root).flatMap((el) =>
		['src', 'srcset', 'href', 'poster', 'style', 'data']
			.map((a) => el.getAttribute(a))
			.filter((v): v is string => v !== null && v.includes(HOTE))
	);
}

async function shown(content: unknown): Promise<HTMLElement> {
	const screen = await render(RestrictedRichText, { target: mainElement(), props: { content } });
	return screen.container as HTMLElement;
}

const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const paragraph = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });

describe('RestrictedRichText — contenu d’élève lu par d’autres', () => {
	it('rend le texte, le gras et les listes', async () => {
		const el = await shown(
			doc(
				paragraph(
					{ type: 'text', text: 'Bonjour ' },
					{ type: 'text', text: 'Madame', marks: [{ type: 'bold' }] }
				),
				{
					type: 'bulletList',
					content: [{ type: 'listItem', content: [paragraph({ type: 'text', text: 'point un' })] }]
				}
			)
		);
		await expect.poll(() => el.textContent).toContain('Madame');
		expect(el.querySelector('strong')?.textContent).toBe('Madame');
		expect(el.querySelector('li')?.textContent).toContain('point un');
	});

	it('image externe : aucune requête', async () => {
		const el = await shown(
			doc({ type: 'image', attrs: { src: `https://${HOTE}/p.png`, alt: 'x' } })
		);
		await expect.poll(() => el.textContent).toContain('x');
		expect(el.querySelector('img')).toBeNull();
		expect(hostileAttributes(el)).toEqual([]);
	});

	it('vidéo externe : ni <video> ni <iframe>', async () => {
		const el = await shown(
			doc({ type: 'video', attrs: { src: `https://${HOTE}/v.mp4`, provider: 'html5' } })
		);
		expect(el.querySelector('video, iframe, source')).toBeNull();
		expect(hostileAttributes(el)).toEqual([]);
	});

	it('formule \\htmlStyle : aucune requête', async () => {
		const el = await shown(
			doc(
				paragraph({
					type: 'mathInline',
					attrs: { latex: `\\htmlStyle{background-image:url(https://${HOTE}/m.png)}{x}` }
				})
			)
		);
		await expect.poll(() => el.textContent).toContain('htmlStyle');
		expect(hostileAttributes(el)).toEqual([]);
	});

	it('couleur de texte piégée (textStyle) : aucune requête', async () => {
		const el = await shown(
			doc(
				paragraph({
					type: 'text',
					text: 'coloré',
					marks: [
						{
							type: 'textStyle',
							attrs: { color: `red; background-image:url(https://${HOTE}/t.png)` }
						}
					]
				})
			)
		);
		await expect.poll(() => el.textContent).toContain('coloré');
		expect(hostileAttributes(el)).toEqual([]);
	});

	it('ancien contenu HTML brut : texte seul, aucune requête', async () => {
		const el = await shown(`<p>Bonjour</p><img src="https://${HOTE}/h.png" onerror="alert(1)">`);
		await expect.poll(() => el.textContent).toContain('Bonjour');
		expect(el.querySelector('img')).toBeNull();
		expect(hostileAttributes(el)).toEqual([]);
	});

	// Audit ciblé (2026-10-03) : le contenu n'est validé qu'en longueur, pas en
	// forme. Un JSON malformé ne doit ni planter ni geler l'onglet du lecteur.
	it('JSON malformé (content non tableau) : le texte brut, sans planter', async () => {
		const el = await shown({ type: 'doc', content: 'x' });
		expect(el.querySelector('.markdown-content')).not.toBeNull();
	});

	it('titre de niveau démesuré : rendu borné, sans geler', async () => {
		const started = performance.now();
		const el = await shown({
			type: 'doc',
			content: [{ type: 'heading', attrs: { level: 1e8 }, content: [{ type: 'text', text: 'T' }] }]
		});
		await expect.poll(() => el.textContent).toContain('T');
		expect(performance.now() - started).toBeLessThan(2000);
		expect((el.textContent ?? '').length).toBeLessThan(200);
	});
});
