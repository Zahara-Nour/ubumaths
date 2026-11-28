/**
 * Préparations d'une réponse avant sa validation
 * ==============================================
 *
 * `validateAnswer` est synchrone ; certaines cases doivent d'abord calculer quelque chose de
 * façon asynchrone (case « programme Python », outil 49 : le programme tourne dans Pyodide).
 * La carte (QuestionCard, FlashCard) pose un registre par contexte ; chaque case de ce genre
 * y inscrit sa préparation au montage ; « Valider » attend `prepareAll()` puis valide les
 * valeurs, que les préparations ont mises à jour.
 *
 * Le chemin synchrone (temps écoulé, `submitPendingAnswer`) ne prépare rien : il valide la
 * dernière valeur, sans verdict (case fausse).
 *
 * @module components/question-inputs/answer-preparations
 */

import { getContext, hasContext, setContext } from 'svelte';

/** Une préparation : met à jour la valeur de sa case ; ne lève jamais */
export type AnswerPreparation = () => Promise<void>;

export interface AnswerPreparations {
	/** Inscrit une préparation ; rend de quoi la retirer (démontage de la case) */
	register(prepare: AnswerPreparation): () => void;
	/** Lance les préparations inscrites, l'une après l'autre (un seul worker Python) */
	prepareAll(): Promise<void>;
	/**
	 * Aucune préparation inscrite : la carte valide tout de suite, sans attente (le « Valider »
	 * des questions ordinaires reste synchrone)
	 */
	isEmpty(): boolean;
}

export const ANSWER_PREPARATIONS_KEY = Symbol('answer-preparations');

/** Un registre vide */
export function createAnswerPreparations(): AnswerPreparations {
	const preparations = new Set<AnswerPreparation>();
	return {
		register(prepare) {
			preparations.add(prepare);
			return () => preparations.delete(prepare);
		},
		isEmpty() {
			return preparations.size === 0;
		},
		async prepareAll() {
			for (const prepare of [...preparations]) {
				try {
					await prepare();
				} catch (error) {
					// Une préparation en panne laisse sa case sans verdict (fausse), jamais la carte bloquée
					console.error('[answer-preparations] Préparation en échec :', error);
				}
			}
		}
	};
}

/** Poser un registre pour les cases de la carte (à l'initialisation du composant) */
export function provideAnswerPreparations(): AnswerPreparations {
	const preparations = createAnswerPreparations();
	setContext(ANSWER_PREPARATIONS_KEY, preparations);
	return preparations;
}

/** Le registre de la carte ; absent hors d'une carte qui valide (aperçu, corrigé) */
export function readAnswerPreparations(): AnswerPreparations | undefined {
	return hasContext(ANSWER_PREPARATIONS_KEY)
		? getContext<AnswerPreparations>(ANSWER_PREPARATIONS_KEY)
		: undefined;
}
