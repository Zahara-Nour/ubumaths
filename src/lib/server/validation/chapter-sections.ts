/**
 * Sections d'un chapitre — schémas de validation
 *
 * Une section range les ressources d'un chapitre par MOMENT du cours plutôt
 * que par type. Elle est propre à son chapitre : renommable, réordonnable,
 * supprimable sans effet sur les autres chapitres.
 *
 * ⚠️ Le rattachement d'une ressource à une section est vérifié DEUX fois, et
 * c'est voulu : ici pour rendre un 400 lisible, et par la clé étrangère
 * composite `(section_id, chapter_id)` en base, qui est la seule garantie
 * qu'une route future ne pourra pas contourner.
 */

import { z } from 'zod';
import { uuidSchema } from './common';
import { displayOrderSchema } from './chapters';

/**
 * Les six sections semées à la création d'un chapitre.
 *
 * ⚠️ Cette liste est un MIROIR de `seed_default_chapter_sections()` (migration
 * `20260915260000`), qui fait foi : le trigger sème, ce tableau ne sert qu'à
 * l'affichage et aux tests. Les deux doivent bouger ensemble.
 */
export const DEFAULT_SECTION_TITLES = [
	'Préparation',
	'Le cours',
	'Les exercices',
	'Méthodes',
	'Résumé',
	'Bilan'
] as const;

export const sectionTitleSchema = z
	.string()
	.trim()
	.min(1, 'Le titre de la section est requis')
	.max(100, 'Le titre ne peut pas dépasser 100 caractères');

export const createSectionSchema = z.object({
	chapterId: uuidSchema,
	title: sectionTitleSchema,
	displayOrder: displayOrderSchema.optional()
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
	title: sectionTitleSchema
});

export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
	sections: z
		.array(
			z.object({
				id: uuidSchema,
				displayOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins une section requise')
		.max(50, 'Trop de sections (max 50)')
});

export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;

/** Les cinq types de contenu qu'une section peut ranger. */
export const sectionContentKindSchema = z.enum([
	'document',
	'exercise',
	'checklistItem',
	'worksheet'
]);

export type SectionContentKind = z.infer<typeof sectionContentKindSchema>;

/**
 * Ranger des ressources dans une section, et fixer leur ordre à l'intérieur.
 *
 * `sectionId` nullable : `null` renvoie la ressource en « Non classé », la zone
 * de fin de chapitre. C'est aussi ce que fait la base quand une section est
 * supprimée — jamais une suppression de ressource.
 */
export const assignToSectionSchema = z.object({
	sectionId: uuidSchema.nullable(),
	items: z
		.array(
			z.object({
				kind: sectionContentKindSchema,
				id: uuidSchema,
				sectionOrder: displayOrderSchema
			})
		)
		.min(1, 'Au moins une ressource requise')
		.max(200, 'Trop de ressources (max 200)')
});

export type AssignToSectionInput = z.infer<typeof assignToSectionSchema>;
