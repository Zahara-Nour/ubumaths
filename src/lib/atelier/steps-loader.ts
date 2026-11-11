/**
 * Le composant des étapes, chargé au premier « Comment ? »
 * =========================================================
 *
 * `GeneratedStepsCorrection` tire le rendu markdown (DOMPurify compris) : un
 * poids que la console n'a pas à payer à l'ouverture de l'atelier, puisque
 * les étapes n'apparaissent qu'une fois dépliées. Voir `StepsOnDemand.svelte`.
 *
 * Les tests qui déplient des étapes et lisent le rendu aussitôt appellent
 * `stepsCorrection.load()` avant : le composant déjà chargé s'affiche alors
 * sans passer par « Chargement des étapes… ».
 */

import { lazyLoader } from '$lib/utils/lazy-loader';

export const stepsCorrection = lazyLoader(
	async () => (await import('$lib/components/questions/GeneratedStepsCorrection.svelte')).default
);
