/**
 * Bloc ```schema-barres à l'écran (spécification : `docs/wip/schema-barres-progress.md` § 2,
 * comportements 4, 8, 10 et erreurs)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SchemaBarres from '../SchemaBarres.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseSchemaBarresContent } from '$lib/ubumark/parser/schema-barres-parser';
import { SCHEMA_BARRES_UNAVAILABLE } from '$lib/ubumark/types/schema-barres';
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

const node = (...lines: string[]) => parseSchemaBarresContent(lines.join('\n'));

const PRIMES = [
	'Or : ? (4) ; 70 (2)',
	'Argent : ? (4)',
	'Bronze : ? (4) ; -80 (1,5)',
	'total : 320 €'
];

describe('SchemaBarres — schéma', () => {
	it('8. un SVG role="img" dont le nom donne les barres, jamais les étiquettes', async () => {
		const screen = await render(SchemaBarres, {
			target: mainElement(),
			props: { node: node(...PRIMES) }
		});
		const svgs = screen.container.querySelectorAll('svg[role="img"]');
		expect(svgs).toHaveLength(1);
		const label = svgs[0].getAttribute('aria-label') ?? '';
		expect(label).toBe('Schéma en barres : Or, Argent, Bronze');
		expect(label).not.toContain('320');
		expect(label).not.toContain('70');
	});

	it('un rectangle par segment, une partie manquante en pointillés sans fond', async () => {
		const screen = await render(SchemaBarres, {
			target: mainElement(),
			props: { node: node(...PRIMES) }
		});
		const rects = screen.container.querySelectorAll('rect');
		expect(rects).toHaveLength(5);
		const missing = screen.container.querySelectorAll('.schema-barres-manquant');
		expect(missing).toHaveLength(1);
		expect(getComputedStyle(missing[0]).fill).toBe('none');
		expect(missing[0].getAttribute('stroke-dasharray')).not.toBeNull();
		const full = screen.container.querySelector(
			'.schema-barres-segment:not(.schema-barres-manquant)'
		)!;
		expect(getComputedStyle(full).fill).not.toBe('none');
	});

	it('étiquettes, noms et accolades écrits dans le dessin', async () => {
		const screen = await render(SchemaBarres, {
			target: mainElement(),
			props: { node: node(...PRIMES, 'Cuivre : ? (2) = 9 €') }
		});
		const text = screen.container.textContent ?? '';
		for (const expected of ['Or', 'Argent', 'Bronze', '70', '80', '320 €', '9 €']) {
			expect(text, expected).toContain(expected);
		}
		expect(screen.container.querySelectorAll('polyline')).toHaveLength(2);
	});

	it('couleurs du thème : aucune écrite en dur, fond discret des segments pleins', async () => {
		const target = mainElement();
		const screen = await render(SchemaBarres, { target, props: { node: node(...PRIMES) } });
		const svg = screen.container.querySelector('svg')!;
		for (const el of svg.querySelectorAll('*')) {
			expect(el.hasAttribute('fill'), el.tagName).toBe(false);
			expect(el.hasAttribute('stroke'), el.tagName).toBe(false);
		}
		const probe = target.appendChild(document.createElement('span'));
		probe.style.color = 'var(--color-muted)';
		const muted = getComputedStyle(probe).color;
		probe.remove();
		const full = svg.querySelector('.schema-barres-segment:not(.schema-barres-manquant)')!;
		expect(getComputedStyle(full).fill).toBe(muted);
	});

	it('tient sur un téléphone de 390 px', async () => {
		const narrow = mainElement();
		narrow.style.width = '358px';
		const screen = await render(SchemaBarres, {
			target: narrow,
			props: { node: node(...PRIMES, 'Cuivre : ? (2) = 9 € le lot') }
		});
		const width = screen.container.querySelector('svg')!.getBoundingClientRect().width;
		expect(width).toBeLessThanOrEqual(358);
		expect(width).toBeGreaterThan(250);
	});
});

describe('SchemaBarres — bloc en erreur', () => {
	it('le prof voit le message situé', async () => {
		const screen = await render(SchemaBarres, {
			target: mainElement(),
			props: { node: node('sans deux-points'), showErrors: true }
		});
		expect(screen.container.textContent).toContain('Ligne 1 :');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('l’élève voit un cadre neutre', async () => {
		const screen = await render(SchemaBarres, {
			target: mainElement(),
			props: { node: node('sans deux-points'), showErrors: false }
		});
		expect(screen.container.textContent).toContain(SCHEMA_BARRES_UNAVAILABLE);
		expect(screen.container.textContent).not.toContain('Ligne 1');
	});
});

describe('SchemaBarres — branché dans le rendu Markdown', () => {
	it('10. au premier niveau et dans un item de liste', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: [
					'```schema-barres',
					'Or : ? (4)',
					'```',
					'',
					'1. Et celui-ci ?',
					'',
					'   ```schema-barres',
					'   A : ? ; ?',
					'   total : 9',
					'   ```'
				].join('\n') as ResolvedMarkdown
			}
		});
		expect(screen.container.querySelectorAll('svg[role="img"]')).toHaveLength(2);
	});
});
