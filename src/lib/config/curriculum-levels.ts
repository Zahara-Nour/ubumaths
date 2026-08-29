/**
 * Les trois niveaux du référentiel et leur route d'API.
 *
 * Cette table existait dupliquée dans la page Programme, sous forme d'un
 * ternaire. La fusion du 2026-08-29 a renommé la route `items` en `objectives`
 * sans le mettre à jour : renommer, réordonner et supprimer un objectif ont
 * échoué en 404 sans que rien ne le signale. Les tests d'intégration importent
 * les handlers directement — ils ne passent pas par cette table et ne pouvaient
 * donc pas voir la rupture.
 *
 * Un test vérifie désormais que chaque chemin correspond à une route réelle.
 */

export const CURRICULUM_LEVELS = ['theme', 'objective', 'point'] as const;

export type CurriculumLevel = (typeof CURRICULUM_LEVELS)[number];

/** Segment de `/api/teacher/curriculum/<segment>` pour chaque niveau. */
export const CURRICULUM_LEVEL_PATHS: Record<CurriculumLevel, string> = {
	theme: 'themes',
	objective: 'objectives',
	point: 'points'
};

/** Nom français du niveau, pour les titres de dialogue et les messages. */
export const CURRICULUM_LEVEL_NOUNS: Record<CurriculumLevel, string> = {
	theme: 'thème',
	objective: 'objectif',
	point: 'point'
};
