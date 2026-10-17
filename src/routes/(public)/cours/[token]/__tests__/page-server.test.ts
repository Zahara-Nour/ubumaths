/**
 * Lien du cours — pages publiques et document
 * ===========================================
 *
 * Accessible SANS COMPTE. Ce que les trois points d'entrée garantissent :
 *  - un jeton ou un identifiant mal formé → 404, SANS appeler la base ;
 *  - la base rend `null` (révoqué, expiré, inexistant, classe archivée) → le
 *    MÊME 404 ;
 *  - `noindex` partout ;
 *  - le document passe par la fonction réservée au service role, puis une URL
 *    signée de 60 s ; la table `chapter_documents` n'est JAMAIS lue.
 *
 * Le module serveur est simulé : son comportement réel est prouvé par ses
 * propres tests et par `tests/integration/class-course-share-token.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const resolveCourse = vi.fn();
const resolveWorksheet = vi.fn();
const resolveDocument = vi.fn();

vi.mock('$lib/server/course-share-tokens', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/course-share-tokens')>()),
	resolveCourseShareToken: (...a: unknown[]) => resolveCourse(...a),
	resolveCourseWorksheetByShareToken: (...a: unknown[]) => resolveWorksheet(...a),
	resolveCourseDocumentByShareToken: (...a: unknown[]) => resolveDocument(...a)
}));

const createSignedUrl = vi.fn();
const storageFrom = vi.fn(() => ({ createSignedUrl }));
const tableFrom = vi.fn();
const serviceClient = { from: tableFrom, storage: { from: storageFrom }, rpc: vi.fn() };
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => serviceClient
}));

const { load: loadCours } = await import('../+page.server');
const { load: loadFiche } = await import('../fiche/[id]/+page.server');
const { GET } = await import('../document/[id]/+server');

const JETON = 'AbCdEfGhJkMnPqRs';
const ID = '11111111-1111-4111-8111-111111111111';

type CoursEvent = Parameters<typeof loadCours>[0];
type FicheEvent = Parameters<typeof loadFiche>[0];
type DocEvent = Parameters<typeof GET>[0];

function evenement<T>(params: Record<string, string>, url = 'http://localhost/x') {
	const headers: Record<string, string> = {};
	const ev = {
		params,
		url: new URL(url),
		locals: { supabase: { marque: 'requete' } },
		setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
	} as unknown as T;
	return { ev, headers };
}

/** Le statut d'une erreur ou d'une réponse SvelteKit. */
async function statutDe(p: Promise<unknown> | unknown): Promise<number> {
	try {
		const r = await p;
		return (r as Response).status;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

beforeEach(() => {
	resolveCourse.mockReset();
	resolveWorksheet.mockReset();
	resolveDocument.mockReset();
	createSignedUrl.mockReset();
	storageFrom.mockClear();
	tableFrom.mockReset();
});

describe('/cours/[token]', () => {
	it('jeton mal formé → 404 sans appel à la base', async () => {
		for (const token of ['court', 'a'.repeat(65), 'AbCdEfGhJk-MnPqRs']) {
			const { ev } = evenement<CoursEvent>({ token });
			expect(await statutDe(loadCours(ev))).toBe(404);
		}
		expect(resolveCourse).not.toHaveBeenCalled();
	});

	it('la base rend null → 404', async () => {
		resolveCourse.mockResolvedValue(null);
		const { ev, headers } = evenement<CoursEvent>({ token: JETON });
		expect(await statutDe(loadCours(ev))).toBe(404);
		expect(headers['X-Robots-Tag']).toMatch(/noindex/);
	});

	it('nominal : la vue du cours et le jeton, noindex', async () => {
		resolveCourse.mockResolvedValue({ class_name: '4e B', class_grade: null, chapters: [] });
		const { ev, headers } = evenement<CoursEvent>({ token: JETON });
		const data = (await loadCours(ev)) as { course: { className: string }; token: string };
		expect(resolveCourse).toHaveBeenCalledWith({ marque: 'requete' }, JETON);
		expect(data.course.className).toBe('4e B');
		expect(data.token).toBe(JETON);
		expect(headers['X-Robots-Tag']).toMatch(/noindex/);
	});
});

describe('/cours/[token]/fiche/[id]', () => {
	it('jeton ou identifiant mal formé → 404 sans appel à la base', async () => {
		for (const params of [
			{ token: 'court', id: ID },
			{ token: JETON, id: 'pas-un-uuid' }
		]) {
			const { ev } = evenement<FicheEvent>(params);
			expect(await statutDe(loadFiche(ev))).toBe(404);
		}
		expect(resolveWorksheet).not.toHaveBeenCalled();
	});

	it('la base rend null → 404', async () => {
		resolveWorksheet.mockResolvedValue(null);
		const { ev } = evenement<FicheEvent>({ token: JETON, id: ID });
		expect(await statutDe(loadFiche(ev))).toBe(404);
	});

	it('nominal : la fiche et le jeton, noindex', async () => {
		resolveWorksheet.mockResolvedValue({ id: ID, title: 'Fiche' });
		const { ev, headers } = evenement<FicheEvent>({ token: JETON, id: ID });
		const data = (await loadFiche(ev)) as { worksheet: { id: string }; token: string };
		expect(resolveWorksheet).toHaveBeenCalledWith({ marque: 'requete' }, JETON, ID);
		expect(data).toEqual({ worksheet: { id: ID, title: 'Fiche' }, token: JETON });
		expect(headers['X-Robots-Tag']).toMatch(/noindex/);
	});
});

describe('/cours/[token]/document/[id]', () => {
	const FICHIER = {
		storage_path: 'classe/chap/poly.pdf',
		file_name: 'poly.pdf',
		mime_type: 'application/pdf',
		source_type: 'upload',
		google_drive_url: null
	};

	it('jeton ou identifiant mal formé → 404 sans appel à la base', async () => {
		for (const params of [
			{ token: 'court', id: ID },
			{ token: JETON, id: 'pas-un-uuid' }
		]) {
			const { ev } = evenement<DocEvent>(params);
			expect(await statutDe(GET(ev))).toBe(404);
		}
		expect(resolveDocument).not.toHaveBeenCalled();
	});

	it('absent (null) → 404', async () => {
		resolveDocument.mockResolvedValue(null);
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID });
		expect(await statutDe(GET(ev))).toBe(404);
		expect(createSignedUrl).not.toHaveBeenCalled();
	});

	it('fichier : 303 vers une URL signée de 60 s, noindex, no-store, sans lire la table', async () => {
		resolveDocument.mockResolvedValue(FICHIER);
		createSignedUrl.mockResolvedValue({
			data: { signedUrl: 'https://stockage.test/signe' },
			error: null
		});
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID });
		const r = (await GET(ev)) as Response;

		expect(resolveDocument).toHaveBeenCalledWith(serviceClient, JETON, ID);
		expect(storageFrom).toHaveBeenCalledWith('chapter-documents');
		expect(createSignedUrl).toHaveBeenCalledWith('classe/chap/poly.pdf', 60, undefined);
		expect(r.status).toBe(303);
		expect(r.headers.get('Location')).toBe('https://stockage.test/signe');
		expect(r.headers.get('X-Robots-Tag')).toMatch(/noindex/);
		expect(r.headers.get('Cache-Control')).toBe('no-store');
		expect(tableFrom).not.toHaveBeenCalled();
	});

	it('?download, ou type non sûr à l’affichage : téléchargement forcé', async () => {
		resolveDocument.mockResolvedValue(FICHIER);
		createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://s/x' }, error: null });
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID }, 'http://localhost/x?download');
		await GET(ev);
		expect(createSignedUrl).toHaveBeenLastCalledWith('classe/chap/poly.pdf', 60, {
			download: 'poly.pdf'
		});

		resolveDocument.mockResolvedValue({ ...FICHIER, mime_type: 'text/html', file_name: 'a.html' });
		const { ev: ev2 } = evenement<DocEvent>({ token: JETON, id: ID });
		await GET(ev2);
		expect(createSignedUrl).toHaveBeenLastCalledWith('classe/chap/poly.pdf', 60, {
			download: 'a.html'
		});
	});

	it('Drive : 303 vers l’URL Drive, sans signer', async () => {
		resolveDocument.mockResolvedValue({
			storage_path: null,
			file_name: null,
			mime_type: null,
			source_type: 'google_drive',
			google_drive_url: 'https://drive.google.com/file/d/abc'
		});
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID });
		const r = (await GET(ev)) as Response;
		expect(r.status).toBe(303);
		expect(r.headers.get('Location')).toBe('https://drive.google.com/file/d/abc');
		expect(createSignedUrl).not.toHaveBeenCalled();
		expect(tableFrom).not.toHaveBeenCalled();
	});

	it('Drive dont l’URL n’est pas en https → 404', async () => {
		resolveDocument.mockResolvedValue({
			storage_path: null,
			file_name: null,
			mime_type: null,
			source_type: 'google_drive',
			google_drive_url: 'javascript:alert(1)'
		});
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID });
		expect(await statutDe(GET(ev))).toBe(404);
	});

	it('fichier sans chemin de stockage → 404', async () => {
		resolveDocument.mockResolvedValue({ ...FICHIER, storage_path: null });
		const { ev } = evenement<DocEvent>({ token: JETON, id: ID });
		expect(await statutDe(GET(ev))).toBe(404);
	});
});
