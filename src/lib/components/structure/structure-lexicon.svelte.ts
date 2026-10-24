/**
 * Structure d'une expression — mots cliquables des pages
 * ========================================================
 *
 * Les mots de la lecture (somme, produit, carré…) ouvrent la même fiche que
 * dans un énoncé (Q12), au niveau de l'élève connecté (`readReaderGrade`, posé
 * par le layout racine). Un visiteur n'a pas de niveau, et la page pas de
 * niveau de question : la fiche est lue au niveau 5e, où arrivent la somme
 * algébrique et les relatifs (choix de lecture seulement, rien n'est enregistré).
 *
 * À appeler pendant l'initialisation du composant (contexte + effet).
 */
import { provideLexicon, readLexicon } from '$lib/components/markdown/lexicon-context';
import { lexiconGrade } from '$lib/lexicon/grade';
import { readReaderGrade } from '$lib/lexicon/reader-grade';
import { loadLexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
import type { GradeCode } from '$lib/types/grades';

// Constantes
/** Niveau de lecture des fiches pour un visiteur */
const VISITOR_LEXICON_GRADE: GradeCode = '5';

// Fonctions
export function provideStructureLexicon(): void {
	const reader = readReaderGrade();
	provideLexicon(() => lexiconGrade(reader(), [VISITOR_LEXICON_GRADE]));
	const lexicon = readLexicon();
	// Le dictionnaire est chargé à la demande, côté navigateur (comme MarkdownRenderer)
	$effect(() => {
		if (lexicon()) loadLexiconRuntime();
	});
}
