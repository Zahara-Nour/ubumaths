/**
 * Les deux structures de travail de `tidy`.
 *
 * `tidy` ne fabrique pas de forme normale : il met une expression au propre en
 * la relisant comme une **somme de termes**, chaque terme étant un
 * **coefficient rationnel** multiplié par des **facteurs** (base opaque +
 * exposant). Aucune de ces structures ne quitte le module : l'entrée et la
 * sortie de `tidy` restent des `MathNode`.
 *
 * @module mathAST/tidy/types
 */

import type { MathNode } from '../types';
import type { Unit } from '../units/types';
import type { Rational } from '../normal/types';

/**
 * Un facteur d'un terme : une base laissée telle quelle (variable, fonction,
 * somme, …) et son exposant rationnel. Un exposant négatif place le facteur au
 * dénominateur.
 *
 * `key` est le `hashMathNode` de la base, calculé une seule fois au moment de
 * l'accumulation : c'est lui qui sert à fusionner les facteurs semblables
 * (étape 6) puis à bâtir la clé du terme (étape 5).
 */
export type TidyFactor = {
	readonly base: MathNode;
	readonly exponent: Rational;
	readonly key: string;
};

/**
 * Un terme d'une somme : coefficient rationnel exact, facteurs triés
 * canoniquement, et l'unité éventuelle de la grandeur portée par le terme.
 *
 * `verbatim` marque un terme rendu **tel quel** : il contient un nœud opaque
 * (infini, zéro signé) et ne doit être ni regroupé ni simplifié.
 */
export type TidyTerm = {
	readonly coefficient: Rational;
	readonly factors: readonly TidyFactor[];
	readonly unit: Unit | null;
	readonly verbatim: boolean;
};
