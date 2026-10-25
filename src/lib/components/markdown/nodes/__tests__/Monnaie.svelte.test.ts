/**
 * Bloc ```monnaie à l'écran (phase 0 : `docs/archive/wip/monnaie-progress.md` § 2, 5, 10 bis)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Monnaie from '../Monnaie.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { MONNAIE_ARIA_LABEL, MONNAIE_UNAVAILABLE } from '$lib/ubumark/types/monnaie';
import { buildMonnaieScene, MONNAIE_VIEW } from '$lib/ubumark/utils/monnaie-scene';
import type { ResolvedMarkdown } from '$lib/ubumark';

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

const node = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));
const widthCm = (el: Element) => el.getBoundingClientRect().width / (96 / 2.54);

/** Cliquer au centre d'une coupure dessinée, comme un doigt */
function tap(svg: SVGSVGElement, el: Element) {
	const box = el.getBoundingClientRect();
	svg.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			clientX: box.left + box.width / 2,
			clientY: box.top + box.height / 2
		})
	);
}

describe('Monnaie — dessin', () => {
	it('un SVG role="img" dont le nom ne donne pas le total ; le total écrit nulle part', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: 20 10 10', 'pièces: 2 2 2 1') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe(MONNAIE_ARIA_LABEL);
		expect(screen.container.textContent).not.toMatch(/47/);
		for (const el of screen.container.querySelectorAll('*')) {
			for (const attr of el.getAttributeNames().filter((a) => a.startsWith('aria-'))) {
				expect(el.getAttribute(attr)).not.toMatch(/\d/);
			}
		}
		expect(screen.container.innerHTML).not.toMatch(/data-/);
		expect(screen.container.querySelector('title, desc')).toBeNull();
	});

	it('chaque coupure dessinée, sa valeur écrite (billet : aussi dans deux coins)', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: 20 5', 'pièces: 2 1') }
		});
		const el = screen.container;
		expect(el.querySelectorAll('.monnaie-objet')).toHaveLength(4);
		expect(el.querySelectorAll('.monnaie-billet')).toHaveLength(2);
		expect(el.querySelectorAll('.monnaie-piece')).toHaveLength(2);
		const texts = [...el.querySelectorAll('text')].map((t) => t.textContent);
		expect(texts).toEqual(['20 €', '20', '20', '5 €', '5', '5', '2 €', '1 €']);
		// La pièce de 2 € a un anneau : deux disques
		expect(el.querySelectorAll('.monnaie-piece')[0].querySelectorAll('circle')).toHaveLength(2);
		expect(el.querySelectorAll('.monnaie-piece')[1].querySelectorAll('circle')).toHaveLength(1);
	});

	it('couleurs du thème : aucune écrite en dur, pièces en couleur d’accent', async () => {
		const target = mainElement();
		const screen = await render(Monnaie, {
			target,
			props: { node: node('billets: 10', 'pièces: 1') }
		});
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const probe = target.appendChild(document.createElement('span'));
		probe.style.color = 'var(--color-primary)';
		const primary = getComputedStyle(probe).color;
		expect(getComputedStyle(svg.querySelector('.monnaie-piece circle')!).fill).toBe(primary);
	});

	it('même échelle partout : 8 cm pleine largeur par défaut, `taille:` la change', async () => {
		const n = node('billets: 50 20 20 10');
		const screen = await render(Monnaie, { target: mainElement(), props: { node: n } });
		const ratio = buildMonnaieScene(n.spec!, 0).width / MONNAIE_VIEW.fullWidth;
		expect(widthCm(screen.container.querySelector('svg')!)).toBeCloseTo(8 * ratio, 1);

		const sized = node('billets: 50 20 20 10', 'taille: 4cm');
		const b = await render(Monnaie, { target: mainElement(), props: { node: sized } });
		expect(widthCm(b.container.querySelector('svg')!)).toBeCloseTo(4 * ratio, 1);
	});

	it('jamais plus large que le conteneur', async () => {
		const narrow = mainElement();
		narrow.style.width = '100px';
		const screen = await render(Monnaie, {
			target: narrow,
			props: { node: node('pièces: 30×2', 'taille: 12cm') }
		});
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		expect(width).toBeLessThanOrEqual(100);
	});

	it('cadre entier : le trait au bord du dessin n’est pas rogné (recette, 390 px)', async () => {
		// Chrome rogne au pixel la boîte du SVG : le bord droit du cadre, à un demi-trait du
		// bord, disparaissait sur un dessin de largeur fractionnaire (« mélangé », choix de QCM)
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: 20 10 10 5', 'pièces: 3×2 4×1', 'disposition: mélangé') }
		});
		const svg = screen.container.querySelector('svg')!;
		expect(getComputedStyle(svg).overflow).toBe('visible');
	});

	it('plusieurs ensembles : légendes A, B d’office, ou celles de l’auteur', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: ; 10', 'pièces: 10×1 ;') }
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
		const captions = [...screen.container.querySelectorAll('figcaption')].map((f) =>
			f.textContent?.trim()
		);
		expect(captions).toEqual(['A', 'B']);

		const named = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('pièces: 1 ; 2', 'légendes: Léa ; Tom') }
		});
		expect(named.container.textContent).toContain('Léa');
		expect(named.container.textContent).toContain('Tom');
	});
});

describe('Monnaie — toucher pour marquer', () => {
	it('toucher une coupure la marque, la retoucher la démarque ; « Effacer les marques »', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('billets: 20 10', 'pièces: 2 1') }
		});
		const svg = screen.container.querySelector('svg')!;
		const objets = () => [...svg.querySelectorAll('.monnaie-objet')];
		const marked = () => svg.querySelectorAll('.monnaie-marque').length;
		const button = () =>
			[...screen.container.querySelectorAll('button')].find((b) =>
				b.textContent?.includes('Effacer les marques')
			);
		expect(button()).toBeUndefined();

		tap(svg, objets()[0]);
		await expect.poll(marked).toBe(1);
		expect(objets()[0].classList.contains('monnaie-objet-marque')).toBe(true);
		tap(svg, objets()[0]);
		await expect.poll(marked).toBe(0);

		tap(svg, objets()[1]);
		tap(svg, objets()[3]);
		await expect.poll(marked).toBe(2);
		button()!.click();
		await expect.poll(marked).toBe(0);
		await expect.poll(button).toBeUndefined();
	});

	it('un nouveau bloc (question suivante) repart sans marque', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('pièces: 2 1') }
		});
		const svg = () => screen.container.querySelector('svg')!;
		tap(svg(), svg().querySelectorAll('.monnaie-objet')[0]);
		await expect.poll(() => svg().querySelectorAll('.monnaie-marque').length).toBe(1);
		await screen.rerender({ node: node('pièces: 2 2') });
		await expect.poll(() => svg().querySelectorAll('.monnaie-marque').length).toBe(0);
	});
});

describe('Monnaie — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('pièces: 3'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(Monnaie, {
			target: mainElement(),
			props: { node: node('pièces: 3'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(MONNAIE_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('Monnaie — branchée dans le rendu Markdown', () => {
	it('au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```monnaie',
					'billets: 10',
					'```',
					'',
					'1. Et celle-ci ?',
					'',
					'   ```monnaie',
					'   pièces: 2',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});

	it('dans un choix de QCM : 6 cm pleine largeur', async () => {
		const choice = (lines: string) => `\`\`\`monnaie\n${lines}\n\`\`\`` as ResolvedMarkdown;
		const screen = await render(MultipleChoiceInput, {
			target: mainElement(),
			props: {
				choices: [{ content: choice('billets: 20 20 5') }, { content: choice('billets: 20 20 5') }]
			}
		});
		const ratio =
			buildMonnaieScene(node('billets: 20 20 5').spec!, 0).width / MONNAIE_VIEW.fullWidth;
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(2);
		for (const svg of svgs) expect(widthCm(svg)).toBeCloseTo(6 * ratio, 1);
	});
});
