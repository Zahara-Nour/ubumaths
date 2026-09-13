import { describe, expect, it } from 'vitest';
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
