import { describe, expect, it } from 'vitest';
import { getNavLinks, getZoneTitle } from './dashboard-nav';

describe('getZoneTitle', () => {
	it('retourne "Mon espace" pour student', () => {
		expect(getZoneTitle('student')).toBe('Mon espace');
	});

	it('retourne "Espace enseignant" pour teacher', () => {
		expect(getZoneTitle('teacher')).toBe('Espace enseignant');
	});

	it('retourne "Administration" pour admin', () => {
		expect(getZoneTitle('admin')).toBe('Administration');
	});

	it('fallback "Mon espace" pour rôle inconnu', () => {
		expect(getZoneTitle('unknown')).toBe('Mon espace');
	});
});

describe('getNavLinks', () => {
	function labels(links: ReturnType<typeof getNavLinks>): string[] {
		return links.map((l) => l.label);
	}

	describe('student', () => {
		it('inclut "Tableau de bord" en premier (jamais "Dashboard")', () => {
			const links = getNavLinks('student');
			expect(links[0].label).toBe('Tableau de bord');
			expect(labels(links)).not.toContain('Dashboard');
		});

		it('renomme Cours en "Mes cours"', () => {
			const links = getNavLinks('student');
			expect(labels(links)).toContain('Mes cours');
			expect(labels(links)).not.toContain('Cours');
		});

		it('ajoute "Cahier de textes" pointant vers /dashboard/student/cahier-texte', () => {
			const links = getNavLinks('student');
			const cahier = links.find((l) => l.label === 'Cahier de textes');
			expect(cahier).toBeDefined();
			expect(cahier?.href).toBe('/dashboard/student/cahier-texte');
		});

		it('expose Boutique uniquement quand marketplaceEnabled=true', () => {
			expect(labels(getNavLinks('student', 0, false))).not.toContain('Boutique');
			expect(labels(getNavLinks('student', 0, true))).toContain('Boutique');
		});

		it('inclut Mon profil et Déconnexion en footer', () => {
			const links = getNavLinks('student');
			const profil = links.find((l) => l.label === 'Mon profil');
			const logout = links.find((l) => l.label === 'Déconnexion');
			expect(profil?.footer).toBe(true);
			expect(logout?.footer).toBe(true);
			expect(logout?.logout).toBe(true);
		});

		it('footer items sont les deux derniers de la liste', () => {
			const links = getNavLinks('student');
			expect(links[links.length - 2].label).toBe('Mon profil');
			expect(links[links.length - 1].label).toBe('Déconnexion');
		});
	});

	describe('teacher', () => {
		it('renomme Contenu → "Mes contenus", Python → "Mes exercices Python", Gamification → "Récompenses"', () => {
			const lbls = labels(getNavLinks('teacher'));
			expect(lbls).toContain('Mes contenus');
			expect(lbls).not.toContain('Contenu');
			expect(lbls).toContain('Mes exercices Python');
			expect(lbls).toContain('Récompenses');
			expect(lbls).not.toContain('Gamification');
		});

		it('ajoute "Cahier de textes" pointant vers /dashboard/teacher/cahier-texte', () => {
			const links = getNavLinks('teacher');
			const cahier = links.find((l) => l.label === 'Cahier de textes');
			expect(cahier).toBeDefined();
			expect(cahier?.href).toBe('/dashboard/teacher/cahier-texte');
		});

		it('expose le badge "Récompenses" quand pendingVipRequestsCount > 0', () => {
			const recompenses = getNavLinks('teacher', 3).find((l) => l.label === 'Récompenses');
			expect(recompenses?.badge).toBe(3);
		});

		it("n'expose pas de badge quand pendingVipRequestsCount = 0", () => {
			const recompenses = getNavLinks('teacher', 0).find((l) => l.label === 'Récompenses');
			expect(recompenses?.badge).toBeUndefined();
		});

		it('footer items présents en fin de liste', () => {
			const links = getNavLinks('teacher');
			expect(links[links.length - 2].label).toBe('Mon profil');
			expect(links[links.length - 1].label).toBe('Déconnexion');
		});
	});

	describe('admin', () => {
		it('ne touche pas aux items techniques (Schools, Users, etc.)', () => {
			const lbls = labels(getNavLinks('admin'));
			['Schools', 'Users', 'Classes', 'VIP Cards', 'CRON Jobs', 'Debug', 'Settings'].forEach(
				(label) => {
					expect(lbls).toContain(label);
				}
			);
		});

		it('inclut Tableau de bord en premier et footer en dernier', () => {
			const links = getNavLinks('admin');
			expect(links[0].label).toBe('Tableau de bord');
			expect(links[links.length - 1].label).toBe('Déconnexion');
		});
	});

	describe('rôle inconnu', () => {
		it('retourne seulement Tableau de bord + footer', () => {
			const links = getNavLinks('unknown');
			expect(labels(links)).toEqual(['Tableau de bord', 'Mon profil', 'Déconnexion']);
		});
	});
});
