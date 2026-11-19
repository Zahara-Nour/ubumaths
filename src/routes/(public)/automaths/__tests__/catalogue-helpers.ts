/**
 * Aides des tests du catalogue Automaths : liste des notions (grand écran)
 */
import { page } from 'vitest/browser';

/** Grand écran : la liste des notions est dans la colonne de gauche */
export async function useWideScreen() {
	await page.viewport(1280, 900);
}

/** Bouton d'une notion dans la liste (nom accessible « Fractions, 3 questions ») */
export function notionButton(name: string) {
	return page
		.getByRole('navigation', { name: 'Notions', exact: true })
		.getByRole('button', { name: new RegExp(`^${name}\\s*,`) });
}

/** Bouton d'une branche dans la liste (il l'ouvre ou la ferme) */
export function branchButton(name: string) {
	return page
		.getByRole('navigation', { name: 'Notions', exact: true })
		.getByRole('button', { name: new RegExp(`^${name}\\b`) });
}
