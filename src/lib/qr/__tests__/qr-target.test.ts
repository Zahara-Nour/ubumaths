import { describe, expect, it } from 'vitest';
import { normalizeQrTarget } from '../qr-target';

/** L'adresse rendue, ou le message d'erreur */
const target = (raw: string) => {
	const result = normalizeQrTarget(raw);
	return 'url' in result ? result.url : `ERREUR: ${result.error}`;
};

describe('normalizeQrTarget — adresses du site', () => {
	it('complète un chemin court avec l’adresse du site', () => {
		expect(target('/glossaire')).toBe('https://www.chiph.re/glossaire');
	});

	it('garde la requête et le fragment d’un chemin court', () => {
		expect(target('/exercice/aire?token=Ab12#q2')).toBe(
			'https://www.chiph.re/exercice/aire?token=Ab12#q2'
		);
	});

	it('écrit chiph.re avec www, pour éviter la redirection', () => {
		expect(target('chiph.re/shtam')).toBe('https://www.chiph.re/shtam');
		expect(target('https://chiph.re/shtam')).toBe('https://www.chiph.re/shtam');
		expect(target('http://chiph.re/shtam')).toBe('https://www.chiph.re/shtam');
		expect(target('www.chiph.re/shtam')).toBe('https://www.chiph.re/shtam');
		expect(target('https://www.chiph.re/shtam')).toBe('https://www.chiph.re/shtam');
	});

	it('mène à l’accueil pour chiph.re seul', () => {
		expect(target('chiph.re')).toBe('https://www.chiph.re/');
	});

	it('ne prend pas pour le site un domaine qui ne fait que lui ressembler', () => {
		expect(target('https://chiph.re.example.com/x')).toBe('https://chiph.re.example.com/x');
	});
});

describe('normalizeQrTarget — sites extérieurs', () => {
	it('garde telle quelle une adresse https extérieure', () => {
		expect(target('https://fr.wikipedia.org/wiki/Pythagore')).toBe(
			'https://fr.wikipedia.org/wiki/Pythagore'
		);
	});

	it('refuse http:// pour un site extérieur', () => {
		expect(target('http://example.com/page')).toMatch(/^ERREUR: .*https:\/\//);
	});
});

describe('normalizeQrTarget — refus', () => {
	it('refuse une adresse vide', () => {
		expect(target('   ')).toMatch(/^ERREUR: .*manquante/);
	});

	it('refuse javascript: et les autres schémas', () => {
		expect(target('javascript:alert(1)')).toMatch(/^ERREUR: /);
		expect(target('data:text/html,<p>x</p>')).toMatch(/^ERREUR: /);
		expect(target('mailto:prof@example.com')).toMatch(/^ERREUR: /);
	});

	it('refuse un mot qui n’est pas une adresse', () => {
		expect(target('glossaire')).toMatch(/^ERREUR: .*https:\/\//);
	});

	it('refuse une adresse qui contient une espace', () => {
		expect(target('https://example.com/une page')).toMatch(/^ERREUR: .*espace/);
	});

	it('refuse // (adresse sans schéma vers un autre site)', () => {
		expect(target('//example.com/x')).toMatch(/^ERREUR: /);
	});
});
