/**
 * Adresses visitées retenues par l'onglet pour les rapports de bug (`chiphre_freeze_data`,
 * `sessionStorage`) : sur une tablette partagée, l'élève suivant ne doit pas envoyer celles
 * du précédent. Elles partent avec les données de travail (`work-data.ts`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupFreezeDetection, getRecentActions, initFreezeDetection } from '../freezeDetection';
import { claimWorkData, clearWorkData } from '../work-data';

const FREEZE_KEY = 'chiphre_freeze_data';
const OWNER_KEY = 'chiphre:work-data-owner';
const VISITE_DE_A = {
	type: 'navigation',
	target: 'https://chiph.re/messages/conversation-de-a',
	timestamp: new Date().toISOString()
};

function onglet(owner: string) {
	localStorage.clear();
	localStorage.setItem(OWNER_KEY, owner);
	sessionStorage.setItem(
		FREEZE_KEY,
		JSON.stringify({ freezeEvents: [], actions: [VISITE_DE_A], webVitals: {} })
	);
	initFreezeDetection();
}

describe("traces de l'onglet jointes aux rapports de bug", () => {
	beforeEach(() => sessionStorage.clear());
	afterEach(() => {
		cleanupFreezeDetection();
		localStorage.clear();
		sessionStorage.clear();
	});

	it('la déconnexion efface les adresses visitées, en mémoire et dans sessionStorage', () => {
		onglet('eleve-a');
		expect(getRecentActions()).toEqual([VISITE_DE_A]);

		clearWorkData(localStorage);

		expect(getRecentActions()).toEqual([]);
		expect(sessionStorage.getItem(FREEZE_KEY)).toBeNull();
	});

	it("un autre compte qui prend l'onglet ne reçoit pas les adresses du précédent", () => {
		onglet('eleve-a');

		claimWorkData(localStorage, 'eleve-b');

		expect(getRecentActions()).toEqual([]);
		expect(sessionStorage.getItem(FREEZE_KEY)).toBeNull();
	});

	it('le même compte garde ses adresses', () => {
		onglet('eleve-a');

		claimWorkData(localStorage, 'eleve-a');

		expect(getRecentActions()).toEqual([VISITE_DE_A]);
	});

	it('un visiteur sans compte qui se connecte garde les siennes', () => {
		onglet('anonymous');

		claimWorkData(localStorage, 'eleve-a');

		expect(getRecentActions()).toEqual([VISITE_DE_A]);
	});
});
