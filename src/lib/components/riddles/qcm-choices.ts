/**
 * Choix d'un QCM tels qu'enregistrés : les choix vides sont retirés, et les indices des
 * bonnes réponses suivent ce retrait. Sans ce recalage, un choix vide placé avant la
 * bonne réponse la décalait sur le choix suivant.
 */
export function compactQcmChoices(
	choices: string[],
	correctIndices: number[]
): { choices: string[]; correct: number[] } {
	const kept: string[] = [];
	const newIndex = new Map<number, number>();
	choices.forEach((choice, i) => {
		if (choice.trim().length === 0) return;
		newIndex.set(i, kept.length);
		kept.push(choice);
	});
	const correct = correctIndices
		.map((i) => newIndex.get(i))
		.filter((i): i is number => i !== undefined);
	return { choices: kept, correct };
}
