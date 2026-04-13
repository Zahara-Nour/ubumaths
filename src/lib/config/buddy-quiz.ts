/**
 * Buddy Quiz — Palotin personality quiz data
 * =============================================
 *
 * 4 questions to suggest a Palotin based on student personality.
 * Each answer maps to one Palotin. Highest score wins.
 */

import type { PalotinType } from '$lib/config/buddy-messages';

export interface QuizQuestion {
	question: string;
	answers: { text: string; palotin: PalotinType }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
	{
		question: 'Un exercice te resiste. Tu fais quoi ?',
		answers: [
			{ text: "Je fonce, je teste des trucs jusqu'a ce que ca passe", palotin: 'giron' },
			{ text: "Je prends du recul, j'essaie de comprendre pourquoi ca coince", palotin: 'pile' },
			{ text: 'Je demande un coup de main ou je regarde un exemple', palotin: 'cotice' }
		]
	},
	{
		question: "Qu'est-ce qui te donne le plus envie de continuer ?",
		answers: [
			{ text: 'Battre mon record ou aller plus vite que la derniere fois', palotin: 'giron' },
			{ text: 'Comprendre un truc que je comprenais pas avant', palotin: 'pile' },
			{ text: 'Voir que je progresse avec les autres', palotin: 'cotice' }
		]
	},
	{
		question: 'Tes potes diraient que tu es plutot...',
		answers: [
			{ text: 'Celui/celle qui fonce en premier', palotin: 'giron' },
			{ text: 'Celui/celle qui pose les questions bizarres', palotin: 'pile' },
			{ text: "Celui/celle qui met l'ambiance", palotin: 'cotice' }
		]
	},
	{
		question: "Les maths pour toi c'est...",
		answers: [
			{ text: 'Un defi a relever', palotin: 'giron' },
			{ text: 'Un mystere a explorer', palotin: 'pile' },
			{ text: 'Plus sympa quand on est bien accompagne', palotin: 'cotice' }
		]
	}
];

export const PALOTIN_INFO: Record<
	PalotinType,
	{ name: string; subtitle: string; description: string }
> = {
	giron: {
		name: 'Giron',
		subtitle: 'Le triangle qui fonce',
		description: 'Fonceur et enthousiaste, il voit les maths comme un defi !'
	},
	pile: {
		name: 'Pile',
		subtitle: 'La pointe qui observe',
		description: 'Calme et contemplatif, il aime comprendre le pourquoi.'
	},
	cotice: {
		name: 'Cotice',
		subtitle: 'La diagonale qui relie',
		description: 'Chaleureux et motivant, il est toujours la pour toi !'
	}
};
