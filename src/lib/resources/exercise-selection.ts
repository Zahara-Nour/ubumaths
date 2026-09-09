/**
 * Sélection d'exercices dans une référence de fiche : `#3,5-7`.
 * ============================================================
 *
 * Une référence de fiche peut désigner tout ou partie de ses exercices :
 *
 *   [[worksheet:<uuid>|Fiche X]]         la fiche entière, aucun point de programme
 *   [[worksheet:<uuid>#3|Fiche X]]       l'exercice 3
 *   [[worksheet:<uuid>#3,5-7|Fiche X]]   les exercices 3, 5, 6 et 7
 *
 * LES NUMÉROS, PAS DES IDENTIFIANTS. C'est un choix, et il a une conséquence
 * assumée : réordonner la fiche change ce que la référence désigne. C'est voulu
 * — « les exercices 3 et 4 de la fiche » est une consigne qui parle du
 * DOCUMENT que l'élève a sous les yeux, pas d'exercices en particulier. La
 * fiche fait foi.
 *
 * En échange, la référence reste courte et MODIFIABLE À LA MAIN : corriger
 * `#3,4` en `#3,4,5` dans le texte suffit, sans repasser par le sélecteur.
 *
 * @module resources/exercise-selection
 */

/** Un numéro seul, ou une plage `a-b`, séparés par des virgules. */
const SELECTION_SYNTAX = /^\d{1,3}(?:-\d{1,3})?(?:,\d{1,3}(?:-\d{1,3})?)*$/;

/** Borne de sûreté : aucune fiche réelle n'a mille exercices. */
const MAX_NUMBER = 999;

/**
 * Les numéros désignés, dédoublonnés et triés.
 *
 * Tolérant par construction : la fonction lit ce que le professeur a tapé à la
 * main, pas une donnée validée. Une syntaxe qu'on ne comprend pas ne vaut pas
 * « aucun exercice » — elle vaut « pas de sélection », donc la fiche entière.
 *
 * @returns les numéros, ou `[]` si la sélection est absente ou incompréhensible
 */
export function parseExerciseSelection(selection: string | null | undefined): number[] {
	if (!selection) return [];

	const nettoye = selection.trim();
	if (!SELECTION_SYNTAX.test(nettoye)) return [];

	const numeros = new Set<number>();
	for (const morceau of nettoye.split(',')) {
		const [debut, fin] = morceau.split('-').map(Number);

		if (fin === undefined) {
			if (debut >= 1 && debut <= MAX_NUMBER) numeros.add(debut);
			continue;
		}

		// Une plage à l'envers (`7-3`) est très probablement une faute de frappe :
		// on la lit dans le bon sens plutôt que de ne rien renvoyer.
		const [bas, haut] = debut <= fin ? [debut, fin] : [fin, debut];
		for (let n = Math.max(bas, 1); n <= Math.min(haut, MAX_NUMBER); n++) {
			numeros.add(n);
		}
	}

	return [...numeros].sort((a, b) => a - b);
}

/**
 * Réécrit une sélection sous sa forme la plus courte : `3,4,5,7` → `3-5,7`.
 *
 * Sert au libellé et au texte inséré : citer huit exercices consécutifs ne doit
 * pas produire huit numéros.
 */
export function formatExerciseSelection(numeros: readonly number[]): string {
	const tries = [...new Set(numeros)].filter((n) => n >= 1).sort((a, b) => a - b);
	if (tries.length === 0) return '';

	const morceaux: string[] = [];
	let debut = tries[0];
	let precedent = tries[0];

	const fermer = () => {
		// Une paire (`3-4`) s'écrit aussi bien `3,4` : on ne groupe qu'à partir de
		// trois, sinon la forme « courte » est plus longue à lire.
		if (precedent - debut >= 2) morceaux.push(`${debut}-${precedent}`);
		else for (let n = debut; n <= precedent; n++) morceaux.push(String(n));
	};

	for (const n of tries.slice(1)) {
		if (n === precedent + 1) {
			precedent = n;
			continue;
		}
		fermer();
		debut = n;
		precedent = n;
	}
	fermer();

	return morceaux.join(',');
}

/**
 * Libellé lisible d'une sélection : « ex. 3 », « ex. 3 et 4 », « ex. 3, 5 à 7 ».
 */
export function describeExerciseSelection(numeros: readonly number[]): string {
	const forme = formatExerciseSelection(numeros);
	if (!forme) return '';

	const morceaux = forme.split(',').map((m) => m.replace('-', ' à '));
	if (morceaux.length === 1) return `ex. ${morceaux[0]}`;

	const debut = morceaux.slice(0, -1).join(', ');
	return `ex. ${debut} et ${morceaux[morceaux.length - 1]}`;
}
