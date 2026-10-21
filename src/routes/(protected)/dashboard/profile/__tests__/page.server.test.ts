/**
 * Mon profil — « Changer mon mot de passe » (revue de la PR 3, n° 2)
 *
 * Un compte ouvert par Google n'a pas de mot de passe : la page de changement exigerait
 * l'ancien, sans issue. Le bouton n'est montré qu'aux comptes du fournisseur `email`.
 */
import { describe, expect, it } from 'vitest';

const { load } = await import('../+page.server');

function charger(providers: unknown) {
	return load({ locals: { user: { app_metadata: { providers } } } } as never);
}

describe('/dashboard/profile — load', () => {
	it('compte à mot de passe → bouton montré', async () => {
		expect(await charger(['email'])).toEqual({ canChangePassword: true });
	});

	it('compte Google seul → bouton masqué', async () => {
		expect(await charger(['google'])).toEqual({ canChangePassword: false });
	});

	it('sans utilisateur → bouton masqué', async () => {
		expect(await load({ locals: { user: null } } as never)).toEqual({ canChangePassword: false });
	});
});
