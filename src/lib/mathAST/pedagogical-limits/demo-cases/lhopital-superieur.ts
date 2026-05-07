/**
 * Pedagogical Limits — L'Hôpital demo cases (sup uniquement).
 *
 * Application de la règle de L'Hôpital pour les formes 0/0 ou ∞/∞ :
 *   lim f/g = lim f'/g'
 *
 * Ces cas sont LOCKÉS au lycée (`STRATEGIES_LIMITS.lycee.enableLhopital
 * === false`) ; ils ne s'exécutent qu'au niveau supérieur. Les snapshots
 * lycée capturent l'erreur `PedagogicalLimitNotImplemented` (cohérent
 * avec le comportement Mode B silent fallback).
 */

import type { DemoCategory } from '../demo-helpers';

export const LHOPITAL_SUPERIEUR: DemoCategory = {
	name: 'lhopital-superieur',
	cases: [
		{
			label: 'sin(x²)/x à x=0 (sup) — pas de known-limit, lhopital nécessaire',
			expression: 'sin(x^2)/x',
			approach: '0',
			schoolLevels: ['superieur']
		},
		{
			label: '(eˣ − 1)/x à x=0 (sup, alternative à known-limit)',
			expression: '(exp(x)-1)/x',
			approach: '0',
			schoolLevels: ['superieur']
		},
		{
			label: 'sin(2x)/sin(3x) à x=0 (sup)',
			expression: 'sin(2*x)/sin(3*x)',
			approach: '0',
			schoolLevels: ['superieur']
		}
	]
};
