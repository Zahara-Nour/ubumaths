/**
 * Bloc ```horloge à l'écran (phase 0 : `docs/wip/horloge-progress.md` § 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Horloge from '../Horloge.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import MultipleChoiceInput from '$lib/components/question-inputs/MultipleChoiceInput.svelte';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { HORLOGE_ARIA_LABEL, HORLOGE_UNAVAILABLE } from '$lib/ubumark/types/horloge';
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

const node = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));
const widthCm = (el: Element) => el.getBoundingClientRect().width / (96 / 2.54);

describe('Horloge — cadran', () => {
	it('un SVG role="img" dont le nom ne donne pas l’heure', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 9 h 35') }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		expect(svgs[0].getAttribute('aria-label')).toBe(HORLOGE_ARIA_LABEL);
		// Rien de l'heure dans le DOM (ni texte, ni attribut lisible)
		const html = screen.container.innerHTML;
		expect(html).not.toMatch(/9\s*h/);
		// Texte du DOM : les chiffres du cadran seulement
		expect(screen.container.textContent?.trim()).toBe('123456789101112');
		expect(html).not.toMatch(/data-/);
		expect(screen.container.querySelector('title, desc')).toBeNull();
	});

	it('60 graduations, 12 chiffres, deux aiguilles', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 9 h 35') }
		});
		const el = screen.container;
		expect(el.querySelectorAll('.horloge-trait')).toHaveLength(60);
		expect(el.querySelectorAll('.horloge-chiffre')).toHaveLength(12);
		expect(el.querySelectorAll('.horloge-aiguille')).toHaveLength(2);
	});

	it('minutes cachées : une seule aiguille', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 3 h', 'minutes: cachées') }
		});
		expect(screen.container.querySelectorAll('.horloge-aiguille')).toHaveLength(1);
	});

	it('couleurs du thème : aucune écrite en dur, la petite aiguille en couleur d’accent', async () => {
		const target = mainElement();
		const screen = await render(Horloge, { target, props: { node: node('heure: 9 h 35') } });
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const token = (name: string) => {
			const probe = target.appendChild(document.createElement('span'));
			probe.style.color = `var(${name})`;
			const color = getComputedStyle(probe).color;
			probe.remove();
			return color;
		};
		const stroke = (selector: string) => getComputedStyle(svg.querySelector(selector)!).stroke;
		expect(stroke('.horloge-aiguille-heures')).toBe(token('--color-primary'));
		expect(stroke('.horloge-aiguille-minutes')).toBe(token('--color-foreground'));
		expect(token('--color-primary')).not.toBe(token('--color-foreground'));
	});

	it('4 cm par défaut, la taille demandée sinon, jamais plus large que le conteneur', async () => {
		const target = mainElement();
		const a = await render(Horloge, { target, props: { node: node('heure: 9 h') } });
		expect(widthCm(a.container.querySelector('svg')!)).toBeCloseTo(4, 1);

		const b = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 9 h', 'taille: 2,5cm') }
		});
		expect(widthCm(b.container.querySelector('svg')!)).toBeCloseTo(2.5, 1);

		const narrow = mainElement();
		narrow.style.width = '100px';
		const c = await render(Horloge, {
			target: narrow,
			props: { node: node('heure: 9 h', 'taille: 8cm') }
		});
		expect(c.container.querySelector('svg')!.getBoundingClientRect().width).toBeLessThanOrEqual(
			100
		);
	});

	it('plusieurs cadrans et leurs légendes', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 8 h 30 ; 8 h 45', 'légendes: Départ ; Arrivée') }
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
		expect(screen.container.textContent).toContain('Départ');
		expect(screen.container.textContent).toContain('Arrivée');
	});
});

describe('Horloge — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 25 h'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(Horloge, {
			target: mainElement(),
			props: { node: node('heure: 25 h'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(HORLOGE_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('Horloge — branchée dans le rendu Markdown', () => {
	it('au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```horloge',
					'heure: 9 h',
					'```',
					'',
					'1. Et celle-ci ?',
					'',
					'   ```horloge',
					'   heure: 3 h',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});

	it('dans un choix de QCM : 3 cm (décisions 5 et 6)', async () => {
		const clock = (h: number) => `\`\`\`horloge\nheure: ${h} h\n\`\`\`` as ResolvedMarkdown;
		const screen = await render(MultipleChoiceInput, {
			target: mainElement(),
			props: { choices: [{ content: clock(3) }, { content: clock(9) }] }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(2);
		for (const svg of svgs) expect(widthCm(svg)).toBeCloseTo(3, 1);
	});
});
