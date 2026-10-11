import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BackLink from '../BackLink.svelte';

describe('BackLink', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// La destination est écrite dans le lien : clic molette, nouvel onglet et
	// rechargement mènent au même endroit, et le libellé l'annonce avant le clic.
	it('est un vrai lien vers la page parente, nommé par son libellé', async () => {
		const screen = await render(BackLink, {
			props: { href: '/dashboard/teacher/series', label: 'Retour aux séries' }
		});
		const link = screen.getByRole('link', { name: 'Retour aux séries' });
		await expect.element(link).toBeVisible();
		await expect.element(link).toHaveAttribute('href', '/dashboard/teacher/series');
	});

	it('« Quitter » mène aussi à la page parente', async () => {
		const screen = await render(BackLink, {
			props: { href: '/automaths/panier', label: 'Quitter', kind: 'quit' }
		});
		await expect
			.element(screen.getByRole('link', { name: 'Quitter' }))
			.toHaveAttribute('href', '/automaths/panier');
	});

	it("l'icône est décorative : seul le libellé est lu", async () => {
		const screen = await render(BackLink, {
			props: { href: '/dashboard/student/riddles', label: 'Retour aux énigmes' }
		});
		const svg = screen.container.querySelector('svg');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	describe('confirmLeave (modifications non enregistrées)', () => {
		/** Clic réel sur le lien ; rend true si la navigation a été annulée */
		function clickIsCancelled(link: HTMLElement): boolean {
			const event = new MouseEvent('click', { bubbles: true, cancelable: true });
			// Empêche la vraie navigation du navigateur de test, après le gestionnaire du lien
			let cancelledByLink = false;
			link.ownerDocument.addEventListener(
				'click',
				(e) => {
					cancelledByLink = e.defaultPrevented;
					e.preventDefault();
				},
				{ once: true }
			);
			link.dispatchEvent(event);
			return cancelledByLink;
		}

		it('refus de confirmer : la navigation est annulée', async () => {
			const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
			const screen = await render(BackLink, {
				props: {
					href: '/dashboard/teacher/srs/decks',
					label: 'Retour aux decks',
					confirmLeave: 'Modifications non enregistrées. Quitter ?'
				}
			});
			const link = screen.getByRole('link', { name: 'Retour aux decks' }).element() as HTMLElement;
			expect(clickIsCancelled(link)).toBe(true);
			expect(confirmSpy).toHaveBeenCalledWith('Modifications non enregistrées. Quitter ?');
		});

		it('confirmation acceptée : la navigation a lieu', async () => {
			vi.spyOn(window, 'confirm').mockReturnValue(true);
			const screen = await render(BackLink, {
				props: {
					href: '/dashboard/teacher/srs/decks',
					label: 'Retour aux decks',
					confirmLeave: 'Modifications non enregistrées. Quitter ?'
				}
			});
			const link = screen.getByRole('link', { name: 'Retour aux decks' }).element() as HTMLElement;
			expect(clickIsCancelled(link)).toBe(false);
		});

		it("clic avec Ctrl/Cmd (nouvel onglet) : aucune question, le lien s'ouvre", async () => {
			const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
			const screen = await render(BackLink, {
				props: {
					href: '/dashboard/teacher/srs/decks',
					label: 'Retour aux decks',
					confirmLeave: 'Modifications non enregistrées. Quitter ?'
				}
			});
			const link = screen.getByRole('link', { name: 'Retour aux decks' }).element() as HTMLElement;
			let cancelledByLink = false;
			link.ownerDocument.addEventListener(
				'click',
				(e) => {
					cancelledByLink = e.defaultPrevented;
					e.preventDefault();
				},
				{ once: true }
			);
			link.dispatchEvent(
				new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, metaKey: true })
			);
			expect(cancelledByLink).toBe(false);
			expect(confirmSpy).not.toHaveBeenCalled();
		});

		it('sans confirmLeave : aucune question posée', async () => {
			const confirmSpy = vi.spyOn(window, 'confirm');
			const screen = await render(BackLink, {
				props: { href: '/dashboard/teacher/srs/decks', label: 'Retour aux decks' }
			});
			const link = screen.getByRole('link', { name: 'Retour aux decks' }).element() as HTMLElement;
			expect(clickIsCancelled(link)).toBe(false);
			expect(confirmSpy).not.toHaveBeenCalled();
		});
	});
});
