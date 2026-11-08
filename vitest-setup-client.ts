/// <reference types="vitest/browser" />
// Styles de l'application (Tailwind + thème) : les composants testés ont le même rendu qu'en vrai
import './src/app.css';

// MESURE PROVISOIRE (chantier ci-navigateur-plante) : journal des navigations de la page et des
// iframes de test, lu dans le log CI (DEBUG=pw:browser). À retirer avant la PR.
type NavigateEvent = Event & { navigationType?: string; destination?: { url: string } };
type AvecNavigation = Window & { navigation?: EventTarget; __mesureNavigation?: boolean };
function suivreNavigations(cible: AvecNavigation, nom: string): void {
	cible.navigation?.addEventListener('navigate', (event) => {
		const e = event as NavigateEvent;
		console.log(
			`[mesure] navigate ${nom} ${e.navigationType} vers ${e.destination?.url} depuis ${location.href.slice(0, 200)}`
		);
	});
}
suivreNavigations(window, 'iframe');
try {
	const haut = window.top as AvecNavigation | null;
	if (haut && haut !== window && !haut.__mesureNavigation) {
		haut.__mesureNavigation = true;
		suivreNavigations(haut, 'top');
		haut.addEventListener('pagehide', () => console.log('[mesure] pagehide top'));
		haut.addEventListener('beforeunload', () => console.log('[mesure] beforeunload top'));
	}
} catch (erreur) {
	console.log('[mesure] top inaccessible', erreur);
}
