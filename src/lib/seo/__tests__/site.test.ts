import { describe, expect, it } from 'vitest';
import { SITE_URL, absoluteUrl, toJsonLdScript, toPlainText } from '../site';

describe('absoluteUrl', () => {
	it('préfixe un chemin par le domaine canonique', () => {
		expect(absoluteUrl('/shtam')).toBe(`${SITE_URL}/shtam`);
		expect(SITE_URL).toBe('https://www.chiph.re');
	});
});

describe('toJsonLdScript', () => {
	it('produit une balise script JSON-LD relisible', () => {
		const html = toJsonLdScript({ '@type': 'WebSite', name: 'Chiphre' });
		expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
		const json = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
		expect(JSON.parse(json)).toEqual({ '@type': 'WebSite', name: 'Chiphre' });
	});

	it('ne laisse aucun texte fermer la balise script', () => {
		const html = toJsonLdScript({ headline: 'fin </script><script>alert(1)</script> <!--' });
		expect(html.match(/<\/script>/g)).toHaveLength(1);
		expect(html).not.toContain('<!--');
	});
});

describe('toPlainText', () => {
	it('rend une formule ubumark lisible en texte brut', () => {
		expect(toPlainText('Les autres jours, ~\\pi~ se contenterait d’être irrationnel.')).toBe(
			'Les autres jours, π se contenterait d’être irrationnel.'
		);
	});

	it('retire le gras et les autres marques', () => {
		expect(toPlainText('Un **grand** ~a^2~ et $\\sqrt{2}$')).toBe('Un grand a^2 et √2');
	});
});
