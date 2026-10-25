/**
 * Bloc ```collection à l'écran (phase 0 : `docs/wip/collection-progress.md` § 2, 4, 5, 8 bis)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Collection from '../Collection.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { COLLECTION_ARIA_LABEL, COLLECTION_UNAVAILABLE } from '$lib/ubumark/types/collection';
import { buildCollectionScene, COLLECTION_VIEW } from '$lib/ubumark/utils/collection-scene';
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

const node = (...lines: string[]) => parseCollectionContent(lines.join('\n'));
const widthCm = (el: Element) => el.getBoundingClientRect().width / (96 / 2.54);

/** Cliquer au centre d'un objet dessiné, comme un doigt */
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

describe('Collection — dessin', () => {
	it('un SVG role="img" dont le nom ne donne pas le nombre, aucun texte', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('dizaines: 3', 'unités: 5') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe(COLLECTION_ARIA_LABEL);
		expect(screen.container.textContent?.trim()).toBe('');
		expect(screen.container.innerHTML).not.toMatch(/data-/);
		expect(screen.container.querySelector('title, desc')).toBeNull();
	});

	it('autant d’objets dessinés que dans la scène', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('dizaines: 4', 'unités: 7', 'dessin: paquets') }
		});
		const el = screen.container;
		expect(el.querySelectorAll('.collection-objet')).toHaveLength(11);
		expect(el.querySelectorAll('.collection-paquet')).toHaveLength(4);
		expect(el.querySelectorAll('circle')).toHaveLength(47);
	});

	it('couleurs du thème : aucune écrite en dur, objets en couleur d’accent', async () => {
		const target = mainElement();
		const screen = await render(Collection, {
			target,
			props: { node: node('dizaines: 2', 'unités: 3') }
		});
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const probe = target.appendChild(document.createElement('span'));
		probe.style.color = 'var(--color-primary)';
		const primary = getComputedStyle(probe).color;
		expect(getComputedStyle(svg.querySelector('.collection-cube .collection-forme')!).fill).toBe(
			primary
		);
	});

	it('même échelle partout : 6 cm pleine largeur par défaut au PDF, 8 cm à l’écran', async () => {
		const n = node('dizaines: 10');
		const screen = await render(Collection, { target: mainElement(), props: { node: n } });
		const ratio = buildCollectionScene(n.spec!, 0).width / COLLECTION_VIEW.fullWidth;
		expect(widthCm(screen.container.querySelector('svg')!)).toBeCloseTo(8 * ratio, 1);

		const sized = node('dizaines: 10', 'taille: 4cm');
		const b = await render(Collection, { target: mainElement(), props: { node: sized } });
		expect(widthCm(b.container.querySelector('svg')!)).toBeCloseTo(4 * ratio, 1);
	});

	it('jamais plus large que le conteneur (390 px de téléphone et moins)', async () => {
		const narrow = mainElement();
		narrow.style.width = '100px';
		const screen = await render(Collection, {
			target: narrow,
			props: { node: node('unités: 100', 'taille: 12cm') }
		});
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		expect(width).toBeLessThanOrEqual(100);
	});

	it('plusieurs collections : légendes A, B d’office', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('dizaines: 2 ; 3', 'unités: 8 ; 1') }
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
		const captions = [...screen.container.querySelectorAll('figcaption')].map((f) =>
			f.textContent?.trim()
		);
		expect(captions).toEqual(['A', 'B']);
	});

	it('légendes données par l’auteur', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 8 ; 1', 'légendes: Léa ; Tom') }
		});
		expect(screen.container.textContent).toContain('Léa');
		expect(screen.container.textContent).toContain('Tom');
	});
});

describe('Collection — toucher pour marquer (décision 2)', () => {
	it('toucher un objet le marque, le retoucher le démarque', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 5', 'dessin: paquets') }
		});
		const svg = screen.container.querySelector('svg')!;
		const objets = () => [...svg.querySelectorAll('.collection-objet')];
		const marked = () => svg.querySelectorAll('.collection-marque').length;

		tap(svg, objets()[2]);
		await expect.poll(marked).toBe(1);
		expect(objets()[2].classList.contains('collection-objet-marque')).toBe(true);

		tap(svg, objets()[2]);
		await expect.poll(marked).toBe(0);
	});

	it('toucher une barre la marque en entier', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('dizaines: 2', 'unités: 1') }
		});
		const svg = screen.container.querySelector('svg')!;
		tap(svg, svg.querySelectorAll('.collection-barre')[1]);
		await expect.poll(() => svg.querySelectorAll('.collection-marque').length).toBe(1);
	});

	it('« Effacer les marques » n’apparaît qu’avec une marque, et les retire toutes', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 6') }
		});
		const svg = screen.container.querySelector('svg')!;
		const button = () =>
			[...screen.container.querySelectorAll('button')].find((b) =>
				b.textContent?.includes('Effacer les marques')
			);
		expect(button()).toBeUndefined();

		const objets = [...svg.querySelectorAll('.collection-objet')];
		tap(svg, objets[0]);
		tap(svg, objets[3]);
		await expect.poll(() => svg.querySelectorAll('.collection-marque').length).toBe(2);
		button()!.click();
		await expect.poll(() => svg.querySelectorAll('.collection-marque').length).toBe(0);
		await expect.poll(button).toBeUndefined();
	});

	it('une nouvelle collection (question suivante) repart sans marque', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 6') }
		});
		const svg = () => screen.container.querySelector('svg')!;
		tap(svg(), svg().querySelectorAll('.collection-objet')[0]);
		await expect.poll(() => svg().querySelectorAll('.collection-marque').length).toBe(1);
		await screen.rerender({ node: node('unités: 7') });
		await expect.poll(() => svg().querySelectorAll('.collection-marque').length).toBe(0);
	});
});

describe('Collection — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 101'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(Collection, {
			target: mainElement(),
			props: { node: node('unités: 101'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(COLLECTION_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('Collection — branchée dans le rendu Markdown', () => {
	it('au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```collection',
					'unités: 9',
					'```',
					'',
					'1. Et celle-ci ?',
					'',
					'   ```collection',
					'   dizaines: 3',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});

	it('dans un choix de QCM : 3 cm pleine largeur (décision 9)', async () => {
		const choice = (d: number) => `\`\`\`collection\ndizaines: ${d}\n\`\`\`` as ResolvedMarkdown;
		const screen = await render(MultipleChoiceInput, {
			target: mainElement(),
			props: { choices: [{ content: choice(10) }, { content: choice(10) }] }
		});
		const ratio =
			buildCollectionScene(node('dizaines: 10').spec!, 0).width / COLLECTION_VIEW.fullWidth;
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(2);
		for (const svg of svgs) expect(widthCm(svg)).toBeCloseTo(3 * ratio, 1);
	});
});
