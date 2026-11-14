/**
 * Affichage d'un badge de point du programme (icône, couleur, libellé),
 * partagé par la grille A de la classe et la page de suivi d'un élève.
 */
import { AlertCircle, RefreshCw, Clock, CheckCircle, Circle } from '@lucide/svelte';
import type { CurriculumPointBadge } from '$lib/server/srs/curriculum-point-badge';

const BADGE_META = {
	a_remedier: { icon: AlertCircle, color: 'text-red-600', label: 'À remédier' },
	a_renforcer: { icon: RefreshCw, color: 'text-amber-600', label: 'À renforcer' },
	en_apprentissage: { icon: Clock, color: 'text-blue-600', label: 'En apprentissage' },
	acquise_en_memoire: { icon: CheckCircle, color: 'text-emerald-600', label: 'Acquise' },
	non_commencee: { icon: Circle, color: 'text-muted-foreground', label: 'Non commencée' }
} as const;

export function badgeMeta(badge: CurriculumPointBadge) {
	return BADGE_META[badge];
}
