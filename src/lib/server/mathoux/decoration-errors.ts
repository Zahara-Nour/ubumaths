/**
 * Refus d'achat ou de pose d'une décoration de panse → statut HTTP et phrase
 * pour l'élève. Partagé par les deux routes `api/student/mathoux/decorations/*`.
 */

import type { DecorationRefusal } from './decorations';

// Functions
export function refusalStatus(reason: DecorationRefusal): 400 | 404 | 409 {
	if (reason === 'unknown_decoration') return 400;
	if (reason === 'mathou_not_found') return 404;
	return 409;
}

export function refusalMessage(reason: DecorationRefusal, missing?: number): string {
	switch (reason) {
		case 'insufficient_funds': {
			const n = missing ?? 0;
			return `Il te manque ${n} gidouille${n > 1 ? 's' : ''}.`;
		}
		case 'already_owned':
			return 'Tu as déjà cette décoration.';
		case 'not_owned':
			return 'Tu n’as pas encore cette décoration.';
		case 'mathou_not_found':
			return 'Ce Mathou n’est pas encore né.';
		case 'unknown_decoration':
			return 'Décoration inconnue.';
	}
}
