import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	SITE_LOGO,
	SITE_URL,
	absoluteUrl,
	canonicalUrl,
	toJsonLdScript,
	toPlainText
} from '../site';

describe('absoluteUrl', () => {
	it('préfixe un chemin par le domaine canonique', () => {
		expect(absoluteUrl('/shtam')).toBe(`${SITE_URL}/shtam`);
		expect(SITE_URL).toBe('https://www.chiph.re');
	});
});

describe('canonicalUrl', () => {
	it('remplace l’origine du serveur local par le domaine canonique', () => {
		expect(canonicalUrl('http://localhost:5175/glossaire')).toBe('https://www.chiph.re/glossaire');
	});

	it('remplace l’origine d’un aperçu Vercel, et celle de chiph.re qui redirige', () => {
		expect(canonicalUrl('https://ubumaths-git-feat-x.vercel.app/shtam/le-zero')).toBe(
			'https://www.chiph.re/shtam/le-zero'
		);
		expect(canonicalUrl('https://chiph.re/glossaire')).toBe('https://www.chiph.re/glossaire');
	});

	it('accepte un chemin relatif', () => {
		expect(canonicalUrl('/cours/abc123')).toBe('https://www.chiph.re/cours/abc123');
		expect(canonicalUrl('cours/abc123')).toBe('https://www.chiph.re/cours/abc123');
	});

	it('garde la requête et le jeton tels quels', () => {
		expect(
			canonicalUrl('http://localhost:5175/exercice/aire-du-disque?token=Ab12Cd34Ef56Gh78')
		).toBe('https://www.chiph.re/exercice/aire-du-disque?token=Ab12Cd34Ef56Gh78');
		expect(
			canonicalUrl(
				'https://preview.vercel.app/automaths/test?categories=%255B%257B%2522a%2522%255D&mode=course'
			)
		).toBe('https://www.chiph.re/automaths/test?categories=%255B%257B%2522a%2522%255D&mode=course');
	});

	it('garde le fragment', () => {
		expect(canonicalUrl('http://localhost:5175/glossaire#derivee')).toBe(
			'https://www.chiph.re/glossaire#derivee'
		);
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

describe('SITE_LOGO', () => {
	it('est un fichier dédié de static/, carré et d’au moins 512 px (Google : 112 px minimum)', () => {
		expect(SITE_LOGO).toBe('/logo.png');
		const png = readFileSync(join(process.cwd(), 'static', SITE_LOGO));
		// En-tête PNG : largeur et hauteur aux octets 16-23
		const width = png.readUInt32BE(16);
		const height = png.readUInt32BE(20);
		expect(width).toBe(height);
		expect(width).toBeGreaterThanOrEqual(512);
	});
});
