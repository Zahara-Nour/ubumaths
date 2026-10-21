/**
 * Image introuvable : le PDF sort quand même, avec un cadre « Image indisponible »
 * ================================================================================
 *
 * Demande de David (2026-10-17) : une seule image introuvable (stockage, réseau,
 * fichier supprimé) faisait échouer TOUT le PDF (« failed to load file »). Typst
 * choisit le décodeur d'après l'extension du chemin virtuel : le remplaçant doit
 * donc être au même format (PNG, JPEG, GIF ou SVG).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchExternalImages, placeholderUrlFor } from '../image-loader';

const BYTES = {
	image: new Uint8Array([1, 2, 3]),
	png: new Uint8Array([80, 78, 71]),
	jpg: new Uint8Array([74, 80, 71]),
	gif: new Uint8Array([71, 73, 70]),
	svg: new Uint8Array([83, 86, 71])
};

/** Les images « réelles » répondent selon `ok` ; les remplaçants depuis /images/pdf/ */
function stubFetch(ok: (url: string) => boolean, placeholdersOk = true) {
	const calls: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const url = String(input);
			calls.push(url);
			const placeholder = /\/images\/pdf\/image-indisponible\.(png|jpg|gif|svg)$/.exec(url);
			if (placeholder) {
				return placeholdersOk
					? new Response(BYTES[placeholder[1] as keyof typeof BYTES])
					: new Response('', { status: 404 });
			}
			return ok(url) ? new Response(BYTES.image) : new Response('', { status: 400 });
		})
	);
	return calls;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('placeholderUrlFor : le remplaçant au format du chemin virtuel', () => {
	it.each([
		['https://x.test/a.png', '/images/pdf/image-indisponible.png'],
		['https://x.test/a.jpg', '/images/pdf/image-indisponible.jpg'],
		['https://x.test/a.jpeg', '/images/pdf/image-indisponible.jpg'],
		['https://x.test/a.gif', '/images/pdf/image-indisponible.gif'],
		['https://x.test/a.svg', '/images/pdf/image-indisponible.svg'],
		// WebP est converti en PNG : son chemin virtuel finit par .png
		['https://x.test/a.webp', '/images/pdf/image-indisponible.png'],
		['https://x.test/sans-extension', '/images/pdf/image-indisponible.png']
	])('%s → %s', (url, expected) => {
		expect(placeholderUrlFor(url)).toBe(expected);
	});
});

describe('fetchExternalImages', () => {
	it('image trouvée : ses octets, aucun remplaçant demandé', async () => {
		const calls = stubFetch(() => true);
		const images = await fetchExternalImages(['https://x.test/a.png']);
		expect(images.get('https://x.test/a.png')).toEqual(BYTES.image);
		expect(calls.some((c) => c.includes('image-indisponible'))).toBe(false);
	});

	it('image introuvable : le cadre « Image indisponible », au bon format', async () => {
		stubFetch(() => false);
		const images = await fetchExternalImages([
			'https://x.test/a.png',
			'https://x.test/b.jpeg',
			'https://x.test/c.svg'
		]);
		expect(images.get('https://x.test/a.png')).toEqual(BYTES.png);
		expect(images.get('https://x.test/b.jpeg')).toEqual(BYTES.jpg);
		expect(images.get('https://x.test/c.svg')).toEqual(BYTES.svg);
	});

	it('une introuvable parmi d’autres : seules les manquantes sont remplacées', async () => {
		stubFetch((url) => !url.endsWith('/manque.png'));
		const images = await fetchExternalImages([
			'https://x.test/ok.png',
			'https://x.test/manque.png'
		]);
		expect(images.get('https://x.test/ok.png')).toEqual(BYTES.image);
		expect(images.get('https://x.test/manque.png')).toEqual(BYTES.png);
	});

	it('le remplaçant d’un format n’est téléchargé qu’une fois', async () => {
		const calls = stubFetch(() => false);
		await fetchExternalImages([
			'https://x.test/a.png',
			'https://x.test/b.png',
			'https://x.test/c.png'
		]);
		expect(calls.filter((c) => c.endsWith('image-indisponible.png'))).toHaveLength(1);
	});

	it('remplaçant lui-même introuvable : l’image reste absente, sans erreur', async () => {
		stubFetch(() => false, false);
		const images = await fetchExternalImages(['https://x.test/a.png']);
		expect(images.has('https://x.test/a.png')).toBe(false);
	});
});
