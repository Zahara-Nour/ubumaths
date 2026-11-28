/**
 * Carnet de liaison — la forme du carnet (ADR 0040, question d'accès Q16).
 *
 * Lu par le serveur sur ce que rendent `get_carnet_by_token` (parent) et
 * `get_my_carnet` (élève) ; les composants n'en importent que les types.
 * Zod RETIRE toute clé absente d'ici : une colonne ajoutée par erreur côté SQL
 * (une note, un nom de famille) ne descend pas jusqu'à la page.
 */

import { z } from 'zod';

// Types

export type Carnet = z.infer<typeof carnetSchema>;
export type ParentCarnet = z.infer<typeof parentCarnetSchema>;
export type StudentCarnet = z.infer<typeof studentCarnetSchema>;
export type CarnetWeek = Carnet['weeks'][number];
export type CarnetEvaluation = Carnet['evaluations'][number];
export type CarnetLevel = CarnetWeek['level'];

// Constantes

/** Palier de jours de travail dans la semaine, jamais le nombre exact (Q25). */
export const CARNET_LEVELS = ['0', '1', '2-3', '4+'] as const;

export const carnetSchema = z.object({
	firstname: z.string().nullable(),
	/**
	 * Une semaine par entrée, de la rentrée (ou de l'arrivée de l'élève, Q43) à
	 * la semaine en cours. 53 au plus : une année scolaire, même mal saisie.
	 * (Le SQL rendait 5 semaines ; chantier `carnet-heatmap`.)
	 */
	weeks: z
		.array(
			z.object({
				week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				level: z.enum(CARNET_LEVELS),
				holiday: z.boolean()
			})
		)
		.max(53),
	revisions: z.object({ overdue: z.number().int().min(0) }),
	/** Faite ou non, échéance — JAMAIS la note */
	evaluations: z
		.array(
			z.object({
				title: z.string().nullable(),
				deadline: z.string().nullable(),
				done: z.boolean()
			})
		)
		.max(200),
	classes: z
		.array(
			z.object({
				name: z.string(),
				journal_token: z.string().nullable(),
				course_token: z.string().nullable()
			})
		)
		.max(20)
});

export const parentCarnetSchema = carnetSchema.extend({ emails_stopped: z.boolean() });

export const studentCarnetSchema = carnetSchema.extend({
	/** Partage ouvert : non coupé, et une classe au carnet activé */
	shared: z.boolean(),
	/** Partage coupé par le professeur (élève majeur, Q4) */
	opted_out: z.boolean(),
	/** Nombre d'adresses confirmées, jamais les adresses */
	parents: z.number().int().min(0)
});
