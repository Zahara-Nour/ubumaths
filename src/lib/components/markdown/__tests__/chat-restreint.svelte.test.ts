/**
 * Chat élève — rendu RESTREINT du markdown (décision S1 de David, 2026-10-03)
 *
 * Audit du 2026-10-03 : le chat rendait `tipTapToMarkdown(message.content)` avec
 * le `MarkdownRenderer` complet. Un élève, en tapant un message, faisait charger
 * à CHAQUE lecteur mineur une URL de son choix (fuite d'adresse IP) : image
 * `![x](https://…)`, vidéo `!video[…](https://…)`, formule
 * `$\htmlStyle{background-image:url(…)}{x}$`, et tout bloc ubumark (```trig,
 * ```figure…) via un bloc de code dont la langue est recopiée.
 *
 * Mode restreint (`restricted`) : texte, marques, listes, citations, code en
 * TEXTE, formules filtrées ; images du seul stockage Supabase du projet ; ni
 * vidéo ni bloc spécial. Le mode normal (cours, exercices) est inchangé.
 *
 * Chemin réel : JSON TipTap → `tipTapToMarkdown` → `MarkdownRenderer`, dans un
 * <main> (décor de l'application).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { JSONContent } from '@tiptap/core';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import MarkdownRenderer from '../MarkdownRenderer.svelte';
import { tipTapToMarkdown } from '$lib/components/rich-text/markdown-export';

const HOTE = 'exemple.invalid';
const IMAGE_EXTERNE = `https://${HOTE}/traceur.png`;
const VIDEO_EXTERNE = `https://${HOTE}/clip.mp4`;
const IMAGE_SUPABASE = `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/conv/photo.png`;

const TRIG = 'preset: custom\npoints: M = pi/3';
const FIGURE = 'fenetre: -1 ; 8 ; -1 ; 6\ntaille: petite\n---\nA = point(0, 0)\nB = point(5, 0)';

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

// ---------------------------------------------------------------------------
// Messages TipTap réalistes (ce que l'éditeur du chat produit et stocke)
// ---------------------------------------------------------------------------

const texte = (text: string, marks?: JSONContent['marks']): JSONContent =>
	marks ? { type: 'text', text, marks } : { type: 'text', text };
const paragraphe = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content });
const doc = (...content: JSONContent[]): JSONContent => ({ type: 'doc', content });
const blocDeCode = (language: string, code: string): JSONContent => ({
	type: 'codeBlock',
	attrs: { language },
	content: [texte(code)]
});
const formule = (latex: string): JSONContent => ({
	type: 'mathInline',
	attrs: { latex, syntax: 'latex' }
});

async function rendu(message: JSONContent, restricted = true) {
	const content = tipTapToMarkdown(message);
	const screen = await render(MarkdownRenderer, {
		target: mainElement(),
		props: { content, restricted }
	});
	return screen.container as HTMLElement;
}

/** Tous les éléments, shadow DOM des formules MathLive compris */
function tousLesElements(root: Element | ShadowRoot): Element[] {
	const out: Element[] = [];
	for (const el of root.querySelectorAll('*')) {
		out.push(el);
		if (el.shadowRoot) out.push(...tousLesElements(el.shadowRoot));
	}
	return out;
}

/** Une URL hostile atteint-elle un attribut qui ferait une requête ? */
function attributsQuiCitent(root: Element, needle: string): string[] {
	const hits: string[] = [];
	for (const el of tousLesElements(root)) {
		for (const attr of ['src', 'srcset', 'href', 'poster', 'style', 'data']) {
			const value = el.getAttribute(attr);
			if (value?.includes(needle)) hits.push(`<${el.tagName.toLowerCase()} ${attr}="${value}">`);
		}
	}
	return hits;
}

// ---------------------------------------------------------------------------

describe('Chat — mode restreint (S1)', () => {
	it('image externe tapée en texte : aucune <img>, aucun attribut ne cite l’URL', async () => {
		const el = await rendu(doc(paragraphe(texte(`![x](${IMAGE_EXTERNE})`))));
		await expect.poll(() => el.textContent).toMatch(/image externe non affichée/);
		expect(el.querySelector('img')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it('nœud image TipTap externe : aucune <img>, texte de remplacement avec l’alt', async () => {
		const el = await rendu(
			doc({ type: 'image', attrs: { src: IMAGE_EXTERNE, alt: 'mon <b>chat</b>' } })
		);
		await expect.poll(() => el.textContent).toMatch(/image externe non affichée/);
		expect(el.textContent).toContain('mon <b>chat</b>');
		expect(el.querySelector('img, b')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it('images data: et protocole-relatif : aucune <img>', async () => {
		const el = await rendu(
			doc(
				paragraphe(texte(`![a](//${HOTE}/p.png)`)),
				paragraphe(texte('![b](data:image/svg+xml;base64,PHN2Zy8+)'))
			)
		);
		await expect.poll(() => el.textContent).toMatch(/image externe non affichée/);
		expect(el.querySelector('img')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it('image du stockage Supabase du projet : rendue', async () => {
		const el = await rendu(doc({ type: 'image', attrs: { src: IMAGE_SUPABASE, alt: 'photo' } }));
		await expect.poll(() => el.querySelector('img')).not.toBeNull();
		expect(el.querySelector('img')?.getAttribute('src')).toBe(IMAGE_SUPABASE);
	});

	it('vidéo (fichier ou YouTube) : ni <video>, ni <iframe>, ni <source>', async () => {
		const el = await rendu(
			doc(
				{ type: 'video', attrs: { src: VIDEO_EXTERNE, alt: 'clip' } },
				paragraphe(texte('!video[yt](https://www.youtube.com/watch?v=dQw4w9WgXcQ)'))
			)
		);
		await expect.poll(() => el.textContent).toMatch(/vidéo non affichée/);
		expect(el.querySelector('video, iframe, source')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
		expect(attributsQuiCitent(el, 'youtube')).toEqual([]);
	});

	it('formule \\htmlStyle : pas de formule MathLive, l’URL n’atteint aucun style', async () => {
		const hostile = `\\htmlStyle{background-image:url(${IMAGE_EXTERNE})}{x}`;
		const el = await rendu(
			doc(paragraphe(texte('ordinaire '), formule('x^2'), texte(' piégée '), formule(hostile)))
		);
		// La formule ordinaire reste rendue…
		await expect.poll(() => el.querySelectorAll('math-span').length).toBe(1);
		await expect.poll(() => el.querySelector('math-span')?.shadowRoot).not.toBeNull();
		expect(el.querySelector('math-span')?.textContent).toContain('x^2');
		// …la piégée est du texte
		expect(el.textContent).toContain('\\htmlStyle');
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it.each([
		['\\href', `\\href{https://${HOTE}/}{x}`],
		['\\class', '\\class{evil}{x}'],
		['\\cssId', '\\cssId{evil}{x}'],
		['\\htmlData', '\\htmlData{a=b}{x}'],
		['\\style', `\\style{background:url(https://${HOTE}/p.png)}{x}`],
		['\\enclose', `\\enclose{box}[mathbackground="url(https://${HOTE}/p.png)"]{x}`],
		// Audit S1 (2026-10-03) : MathLive recopie une couleur non reconnue telle
		// quelle dans `style=` — même fuite que \htmlStyle.
		['\\color', `\\color{zz;background-image:url(https://${HOTE}/c.png)}x`],
		['\\textcolor', `\\textcolor{zz;background-image:url(https://${HOTE}/c.png)}{x}`],
		['\\colorbox', `\\colorbox{zz;background-image:url(https://${HOTE}/c.png)}{x}`],
		['\\fcolorbox', `\\fcolorbox{zz}{zz;background-image:url(https://${HOTE}/c.png)}{x}`],
		['\\fontfamily', `\\fontfamily{x;background-image:url(https://${HOTE}/f.png)}x`],
		// Avec une case à remplir : rendu par MathPrompt (<math-field>), pas MathInline
		[
			'\\placeholder + \\htmlStyle',
			`\\placeholder{}+\\htmlStyle{background:url(https://${HOTE}/p.png)}{x}`
		]
	])('formule %s : texte, pas de math-span', async (_nom, latex) => {
		const el = await rendu(doc(paragraphe(texte('a '), formule(latex))));
		await expect.poll(() => el.textContent).toContain(latex);
		expect(el.querySelector('math-span, math-div, math-field')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it('formule centrée piégée ($$…$$) : texte, pas de math-div', async () => {
		const el = await rendu(
			doc({
				type: 'mathBlock',
				attrs: { latex: `\\htmlStyle{background:url(${IMAGE_EXTERNE})}{y}`, syntax: 'latex' }
			})
		);
		await expect.poll(() => el.textContent).toContain('\\htmlStyle');
		expect(el.querySelector('math-span, math-div, math-field')).toBeNull();
		expect(attributsQuiCitent(el, HOTE)).toEqual([]);
	});

	it('```trig et ```figure (bloc de code) : aucun composant, le texte est visible', async () => {
		const el = await rendu(doc(blocDeCode('trig', TRIG), blocDeCode('figure', FIGURE)));
		await expect.poll(() => el.textContent).toContain('points: M = pi/3');
		expect(el.textContent).toContain('A = point(0, 0)');
		expect(el.querySelector('.trig-circle-container')).toBeNull();
		expect(el.querySelector('svg')).toBeNull();
		expect(el.querySelectorAll('pre').length).toBe(2);
	});

	it('```trig tapé en texte dans un item de liste : aucun composant', async () => {
		const md = doc({
			type: 'bulletList',
			content: [{ type: 'listItem', content: [blocDeCode('trig', TRIG)] }]
		});
		const el = await rendu(md);
		await expect.poll(() => el.textContent).toContain('points: M = pi/3');
		expect(el.querySelector('.trig-circle-container, svg')).toBeNull();
	});

	it('texte, gras, liste, code : rendus normalement', async () => {
		const el = await rendu(
			doc(
				paragraphe(
					texte('Bonjour '),
					texte('fort', [{ type: 'bold' }]),
					texte(' et '),
					texte('a+b', [{ type: 'code' }])
				),
				{
					type: 'bulletList',
					content: [
						{ type: 'listItem', content: [paragraphe(texte('un'))] },
						{ type: 'listItem', content: [paragraphe(texte('deux'))] }
					]
				},
				blocDeCode('python', 'print(1)')
			)
		);
		await expect.poll(() => el.querySelector('strong')?.textContent).toBe('fort');
		expect(el.querySelector('code')?.textContent).toContain('a+b');
		expect(el.querySelectorAll('li').length).toBe(2);
		expect(el.querySelector('pre')?.textContent).toContain('print(1)');
	});
});

describe('Mode normal — inchangé', () => {
	it('image externe : toujours une <img>', async () => {
		const el = await rendu(doc({ type: 'image', attrs: { src: IMAGE_EXTERNE, alt: 'x' } }), false);
		await expect.poll(() => el.querySelector('img')).not.toBeNull();
		expect(el.querySelector('img')?.getAttribute('src')).toBe(IMAGE_EXTERNE);
	});

	it('```trig : toujours le cercle', async () => {
		const el = await rendu(doc(blocDeCode('trig', TRIG)), false);
		await expect.poll(() => el.querySelector('.trig-circle-container')).not.toBeNull();
	});

	it('formule \\htmlStyle : toujours un math-span (contenu de prof)', async () => {
		const el = await rendu(doc(paragraphe(formule('\\htmlStyle{color:red}{x}'))), false);
		await expect.poll(() => el.querySelectorAll('math-span').length).toBe(1);
	});
});
