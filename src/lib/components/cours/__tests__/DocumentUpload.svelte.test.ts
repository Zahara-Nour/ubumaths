import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DocumentUpload from '../teacher/DocumentUpload.svelte';

/**
 * Le sélecteur de fichier doit rester monté — il vivait dans le bloc affiché
 * tant qu'aucun fichier n'était choisi, si bien que le sélectionner le faisait
 * disparaître du DOM — mais il ne doit plus appartenir au formulaire : le
 * fichier part directement au stockage, et l'y laisser le renverrait dans le
 * corps de la requête, avec le 413 au bout.
 */
describe('DocumentUpload — le sélecteur de fichier', () => {
	const chapterId = '22222222-2222-4222-8222-222222222222';

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	/** Un PDF minimal, de la taille demandée. */
	function pdf(nom: string, octets = 1024): File {
		return new File(['%PDF-1.4\n' + 'a'.repeat(octets)], nom, { type: 'application/pdf' });
	}

	/** Pose un fichier dans l'input comme le ferait la boîte de dialogue. */
	function choisir(input: HTMLInputElement, file: File) {
		const transfert = new DataTransfer();
		transfert.items.add(file);
		input.files = transfert.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	it('reste monté après la sélection', async () => {
		const { container } = render(DocumentUpload, { chapterId, supabase: {} as never });

		const input = container.querySelector<HTMLInputElement>('#file-input');
		expect(input).not.toBeNull();

		choisir(input!, pdf('cours.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		// Le nom du fichier s'affiche — et le sélecteur est toujours là, avec lui.
		expect(container.textContent).toContain('cours.pdf');
		const apres = container.querySelector<HTMLInputElement>('#file-input');
		expect(apres).not.toBeNull();
		expect(apres!.files?.length).toBe(1);
	});

	// Le formulaire ne porte plus le fichier : il ne poste que des métadonnées.
	// L'y remettre ramènerait le 413 — et SvelteKit refuserait le formulaire,
	// faute d'`enctype`.
	it('ne met pas le fichier dans le formulaire', async () => {
		const { container } = render(DocumentUpload, { chapterId, supabase: {} as never });

		choisir(container.querySelector<HTMLInputElement>('#file-input')!, pdf('polycopie.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		const form = container.querySelector<HTMLFormElement>('[data-testid="upload-form"]');
		expect(form).not.toBeNull();
		expect(form!.querySelector('input[type="file"]')).toBeNull();

		const envoi = new FormData(form!).get('file');
		expect(envoi).toBeNull();
	});

	it('oublie le fichier quand on le retire', async () => {
		const { container } = render(DocumentUpload, { chapterId, supabase: {} as never });

		const input = container.querySelector<HTMLInputElement>('#file-input');
		choisir(input!, pdf('a-retirer.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		const retirer = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Retirer le fichier"]'
		);
		expect(retirer).not.toBeNull();

		retirer!.click();
		await new Promise((resolve) => setTimeout(resolve, 0));

		// L'input doit être vidé lui aussi, sinon le fichier repartirait avec
		// l'envoi suivant.
		const apres = container.querySelector<HTMLInputElement>('#file-input');
		expect(apres!.files?.length ?? 0).toBe(0);
	});
});

/**
 * Le fichier ne traverse plus le serveur : la plateforme refusait la requête
 * d'un 413 au-delà de quelques mégaoctets, avant même que le code ne
 * s'exécute. Le navigateur demande une autorisation, dépose le fichier dans le
 * stockage, puis le formulaire poste les seules métadonnées.
 */
describe('DocumentUpload — envoi direct au stockage', () => {
	const chapterId = '22222222-2222-4222-8222-222222222222';

	afterEach(async () => {
		// La soumission des métadonnées peut encore être en vol : retirer le
		// stub maintenant l'enverrait vers un vrai `fetch`, et l'erreur
		// remonterait hors de tout test.
		await new Promise((resolve) => setTimeout(resolve, 50));
		vi.unstubAllGlobals();
	});

	function pdf(nom: string): File {
		return new File(['%PDF-1.4\n' + 'a'.repeat(2048)], nom, { type: 'application/pdf' });
	}

	function choisir(input: HTMLInputElement, file: File) {
		const transfert = new DataTransfer();
		transfert.items.add(file);
		input.files = transfert.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
	}

	it('demande une autorisation puis dépose le fichier dans le stockage', async () => {
		const envois: { path: string; token: string; file: File }[] = [];
		const appels: string[] = [];

		const supabase = {
			storage: {
				from: () => ({
					uploadToSignedUrl: async (path: string, token: string, file: File) => {
						envois.push({ path, token, file });
						return { data: { path }, error: null };
					}
				})
			}
		} as never;

		const corps: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init?: RequestInit) => {
				appels.push(String(url));
				if (init?.body) corps.push(String(init.body));
				return new Response(
					JSON.stringify({
						storagePath: `chapters/${chapterId}/123.pdf`,
						token: 'jeton-unique'
					}),
					{ status: 201, headers: { 'content-type': 'application/json' } }
				);
			})
		);

		const { container } = render(DocumentUpload, { chapterId, supabase });

		choisir(container.querySelector<HTMLInputElement>('#file-input')!, pdf('cours.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		container.querySelector<HTMLFormElement>('[data-testid="upload-form"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 200));

		// L'autorisation d'abord, l'enregistrement des métadonnées ensuite.
		expect(appels[0]).toContain('document-upload-url');
		expect(appels[1]).toContain(`/api/teacher/chapters/${chapterId}/documents`);

		// Puis le fichier part directement au stockage, jamais par la fonction.
		expect(envois).toHaveLength(1);
		expect(envois[0].path).toBe(`chapters/${chapterId}/123.pdf`);
		expect(envois[0].token).toBe('jeton-unique');
		expect(envois[0].file.name).toBe('cours.pdf');

		// L'enregistrement porte le chemin choisi par le serveur, et la taille.
		const metadonnees = JSON.parse(corps[1]);
		expect(metadonnees.storagePath).toBe(`chapters/${chapterId}/123.pdf`);
		expect(metadonnees.fileName).toBe('cours.pdf');
		expect(metadonnees.fileSize).toBeGreaterThan(0);
	});

	it('signale l’échec du dépôt, et n’enregistre rien', async () => {
		const appels: string[] = [];
		const supabase = {
			storage: {
				from: () => ({
					uploadToSignedUrl: async () => ({
						data: null,
						error: { message: 'The object exceeded the maximum allowed size' }
					})
				})
			}
		} as never;

		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ storagePath: `chapters/${chapterId}/1.pdf`, token: 't' }), {
						status: 201,
						headers: { 'content-type': 'application/json' }
					})
			)
		);

		const { container } = render(DocumentUpload, { chapterId, supabase });

		choisir(container.querySelector<HTMLInputElement>('#file-input')!, pdf('trop-gros.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		container.querySelector<HTMLFormElement>('[data-testid="upload-form"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(container.textContent).toContain("Erreur lors de l'upload");

		// Rien n'est enregistré d'un fichier qui n'est pas arrivé.
		expect(appels.filter((u) => u.endsWith('/documents'))).toHaveLength(0);
	});

	it('refuse de partir sans fichier', async () => {
		const appels: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				appels.push(String(url));
				return new Response('{}', { status: 201 });
			})
		);

		const { container } = render(DocumentUpload, { chapterId, supabase: {} as never });

		container.querySelector<HTMLFormElement>('[data-testid="upload-form"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 40));

		expect(appels).toHaveLength(0);
	});
});
