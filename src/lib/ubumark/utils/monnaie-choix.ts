/**
 * Bloc ```monnaie — taille commune aux choix d'un QCM
 * ===================================================
 *
 * Dans un choix de QCM, un ensemble « pleine largeur » mesure
 * `MONNAIE_SIZE_CM.choice` (10 cm). Au téléphone, la colonne d'un choix est
 * plus étroite (≈ 5 cm à 390 px) : un ensemble large serait ramené à la
 * colonne, seul, et les choix ne seraient plus à la même échelle (B et C 15 %
 * plus petits que A, décision de David du 2026-10-26). On réduit donc TOUS les
 * choix ensemble, d'après le plus large : `min(10cm, 100cqw / r)`, où r est la
 * part de la pleine largeur qu'occupe l'ensemble le plus large et `cqw` la
 * largeur de la colonne (le conteneur doit déclarer `container-type:
 * inline-size`). Au PDF, rien à faire : la page tient 10 cm.
 *
 * @module ubumark/utils/monnaie-choix
 */

import { findMonnaieBlocks, parseMonnaieContent } from '../parser/monnaie-parser';
import { MONNAIE_SIZE_CM } from '../types/monnaie';
import { buildMonnaieScene, MONNAIE_VIEW } from './monnaie-scene';

// Constantes

const FENCE_REGEX = /^\s*```/;

// Fonctions

/** Part de la pleine largeur qu'occupe l'ensemble le plus large des blocs du texte (0 : aucun) */
function widestRatio(markdown: string): number {
	const lines = markdown.split('\n');
	let widest = 0;
	for (const { startIndex, endIndex } of findMonnaieBlocks(lines)) {
		const body = lines.slice(startIndex + 1, endIndex + 1).filter((l) => !FENCE_REGEX.test(l));
		const node = parseMonnaieContent(body.join('\n'));
		const spec = node.spec;
		// `taille:` donnée par l'auteur : le bloc garde sa taille, il ne compte pas
		if (spec === null || spec.sizeCm !== null) continue;
		for (let i = 0; i < spec.sets.length; i++) {
			widest = Math.max(widest, buildMonnaieScene(spec, i).width / MONNAIE_VIEW.fullWidth);
		}
	}
	return widest;
}

/**
 * Valeur de `--monnaie-taille` pour les choix d'un QCM : `10cm` s'il n'y a pas
 * de pièces ni de billets, sinon `min(10cm, 100cqw / r)` (r : ensemble le plus
 * large de TOUS les choix), pour que chaque choix soit à la même échelle.
 */
export function monnaieChoiceSize(contents: readonly string[]): string {
	const size = `${MONNAIE_SIZE_CM.choice}cm`;
	const r = Math.max(0, ...contents.map(widestRatio));
	if (r === 0) return size;
	return `min(${size}, calc(100cqw / ${Number(r.toFixed(4))}))`;
}
