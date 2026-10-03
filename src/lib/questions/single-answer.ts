/**
 * QCM à une seule bonne réponse
 * =============================
 *
 * « Plusieurs réponses » (`multipleAnswers`) est un réglage du MODÈLE : quand il
 * est coupé (case décochée, préréglage « Vrai / Faux »), chaque liste de choix —
 * celle de chaque variation et la partagée — ne garde que sa première bonne
 * réponse. Sinon l'enregistrement est refusé pour une variation que l'auteur
 * n'a pas sous les yeux (`choiceAnswerCountErrors`).
 *
 * @module questions/single-answer
 */

// Types
interface ChoiceLike {
	isCorrect?: boolean;
}

// Functions
/** Ne garde que la première bonne réponse ; aucune cochée → aucune */
export function keepFirstCorrectChoice<T extends ChoiceLike>(choices: T[]): T[] {
	const firstCorrectIndex = choices.findIndex((choice) => choice.isCorrect);
	return choices.map((choice, i) => ({
		...choice,
		isCorrect: firstCorrectIndex >= 0 && i === firstCorrectIndex
	}));
}

/** Bonne réponse déclarée par indice (choix partagés) : la première seulement */
export function keepFirstDeclaredChoice(
	index: string | string[] | undefined
): string | string[] | undefined {
	return Array.isArray(index) && index.length > 1 ? [index[0]] : index;
}
