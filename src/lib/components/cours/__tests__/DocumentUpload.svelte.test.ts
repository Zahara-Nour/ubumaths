import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DocumentUpload from '../teacher/DocumentUpload.svelte';

/**
 * Le fichier ne part que s'il est dans le formulaire au moment de l'envoi.
 *
 * L'input qui le porte vivait dans le bloc affiché tant qu'aucun fichier
 * n'était choisi : le sélectionner le faisait disparaître du DOM, et avec lui
 * le fichier. Le serveur répondait « Fichier requis » sur un formulaire où
 * l'on voyait pourtant le document et sa taille.
 */
describe('DocumentUpload — le fichier reste dans le formulaire', () => {
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

	it('garde l’input de fichier monté après la sélection', async () => {
		const { container } = render(DocumentUpload, { chapterId });

		const input = container.querySelector<HTMLInputElement>('input[name="file"]');
		expect(input).not.toBeNull();

		choisir(input!, pdf('cours.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Le nom du fichier s'affiche — et l'input est toujours là, avec lui.
		expect(container.textContent).toContain('cours.pdf');
		const apres = container.querySelector<HTMLInputElement>('input[name="file"]');
		expect(apres).not.toBeNull();
		expect(apres!.files?.length).toBe(1);
	});

	it('envoie le fichier avec le formulaire', async () => {
		const { container } = render(DocumentUpload, { chapterId });

		const input = container.querySelector<HTMLInputElement>('input[name="file"]');
		choisir(input!, pdf('polycopie.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Ce que le serveur recevra vraiment.
		const form = container.querySelector<HTMLFormElement>('form[action="?/uploadDocument"]');
		expect(form).not.toBeNull();

		const envoi = new FormData(form!).get('file');
		expect(envoi).toBeInstanceOf(File);
		expect((envoi as File).name).toBe('polycopie.pdf');
	});

	it('oublie le fichier quand on le retire', async () => {
		const { container } = render(DocumentUpload, { chapterId });

		const input = container.querySelector<HTMLInputElement>('input[name="file"]');
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
		const apres = container.querySelector<HTMLInputElement>('input[name="file"]');
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

	afterEach(() => {
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

		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				appels.push(String(url));
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

		choisir(container.querySelector<HTMLInputElement>('input[name="file"]')!, pdf('cours.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		container.querySelector<HTMLFormElement>('form[action="?/uploadDocument"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 80));

		// L'autorisation est demandée au serveur, qui décide du chemin.
		expect(appels[0]).toContain('document-upload-url');

		// Puis le fichier part directement au stockage, jamais par la fonction.
		expect(envois).toHaveLength(1);
		expect(envois[0].path).toBe(`chapters/${chapterId}/123.pdf`);
		expect(envois[0].token).toBe('jeton-unique');
		expect(envois[0].file.name).toBe('cours.pdf');

		// Le chemin rejoint le formulaire, qui postera les métadonnées.
		const chemin = container.querySelector<HTMLInputElement>('input[name="storagePath"]');
		expect(chemin?.value).toBe(`chapters/${chapterId}/123.pdf`);
	});

	it('signale l’échec du dépôt, et ne retient aucun chemin', async () => {
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

		choisir(container.querySelector<HTMLInputElement>('input[name="file"]')!, pdf('trop-gros.pdf'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		container.querySelector<HTMLFormElement>('form[action="?/uploadDocument"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 80));

		expect(container.textContent).toContain("Erreur lors de l'upload");

		// Rien à enregistrer : le fichier n'est pas arrivé.
		const chemin = container.querySelector<HTMLInputElement>('input[name="storagePath"]');
		expect(chemin?.value).toBe('');
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

		container.querySelector<HTMLFormElement>('form[action="?/uploadDocument"]')!.requestSubmit();
		await new Promise((resolve) => setTimeout(resolve, 40));

		expect(appels).toHaveLength(0);
	});
});
