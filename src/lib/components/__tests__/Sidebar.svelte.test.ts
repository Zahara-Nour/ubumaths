import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Home } from '@lucide/svelte';
import Sidebar from '../Sidebar.svelte';
import type { Tables } from '$lib/types/database';

// Test fixture — only `role` is read by Sidebar's filter logic.
// Other required columns of `profiles` are omitted intentionally.
function profile(role: 'student' | 'teacher' | 'admin'): Tables<'profiles'> {
	const partial: Partial<Tables<'profiles'>> = { id: 'test', role, email: 't@t.t' };
	return partial as Tables<'profiles'>;
}

describe('Sidebar (Outils libres)', () => {
	describe('items toujours visibles (sans profil ou tout rôle)', () => {
		it('affiche Accueil, Jeux, Upsilon, Zygomatics quand profile est null', async () => {
			render(Sidebar, { profile: null });
			await expect.element(page.getByText('Accueil', { exact: true })).toBeInTheDocument();
			await expect.element(page.getByText('Jeux', { exact: true })).toBeInTheDocument();
			await expect.element(page.getByText('Upsilon', { exact: true })).toBeInTheDocument();
			await expect.element(page.getByText('Zygomatics', { exact: true })).toBeInTheDocument();
		});
	});

	describe('items role-restricted', () => {
		it('affiche Python pour un élève (role student+teacher)', async () => {
			render(Sidebar, { profile: profile('student') });
			await expect.element(page.getByText('Python', { exact: true })).toBeInTheDocument();
		});

		it('affiche Python et Whiteboard pour un prof', async () => {
			render(Sidebar, { profile: profile('teacher') });
			await expect.element(page.getByText('Python', { exact: true })).toBeInTheDocument();
			await expect.element(page.getByText('Whiteboard', { exact: true })).toBeInTheDocument();
		});

		it("n'affiche pas Whiteboard pour un élève", async () => {
			render(Sidebar, { profile: profile('student') });
			expect(page.getByText('Whiteboard', { exact: true }).elements()).toHaveLength(0);
		});

		it("n'affiche pas Python sans profile (role-restricted)", async () => {
			render(Sidebar, { profile: null });
			expect(page.getByText('Python', { exact: true }).elements()).toHaveLength(0);
		});
	});

	describe('séparation serious / fun', () => {
		it('rend Zygomatics après le séparateur <hr> (section fun)', async () => {
			const { container } = render(Sidebar, { profile: null });
			const hr = container.querySelector('hr');
			expect(hr).not.toBeNull();
			const zygo = await page.getByText('Zygomatics', { exact: true }).element();
			// Le hr doit précéder Zygomatics dans le DOM
			expect(hr!.compareDocumentPosition(zygo)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it("ne rend pas de <hr> si aucun item n'est en section fun", async () => {
			const { container } = render(Sidebar, {
				profile: null,
				items: [{ label: 'Accueil', href: '/', icon: Home }]
			});
			expect(container.querySelector('hr')).toBeNull();
		});
	});

	describe('items retirés (doublons / mal placés)', () => {
		const cases = [
			{ role: null, label: 'sans profile' },
			{ role: 'student' as const, label: 'élève' },
			{ role: 'teacher' as const, label: 'prof' }
		];

		for (const { role, label } of cases) {
			it(`n'affiche pas Mon travail (${label})`, async () => {
				render(Sidebar, { profile: role ? profile(role) : null });
				expect(page.getByText('Mon travail', { exact: true }).elements()).toHaveLength(0);
			});

			it(`n'affiche pas Cahier (${label})`, async () => {
				render(Sidebar, { profile: role ? profile(role) : null });
				expect(page.getByText('Cahier', { exact: true }).elements()).toHaveLength(0);
			});

			it(`n'affiche pas Worksheets (${label})`, async () => {
				render(Sidebar, { profile: role ? profile(role) : null });
				expect(page.getByText('Worksheets', { exact: true }).elements()).toHaveLength(0);
			});
		}
	});
});
