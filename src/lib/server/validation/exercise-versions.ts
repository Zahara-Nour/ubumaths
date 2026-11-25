/**
 * Validation des routes de versions d'un exercice (ADR 0044)
 * ===========================================================
 *
 * La note d'une version est facultative, bornée comme en base (1 à 500 caractères une fois les
 * espaces retirés ; vide = pas de note).
 *
 * @module server/validation/exercise-versions
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTES
// ============================================================================

export const VERSION_NOTE_MAX = 500;

const noteSchema = z
	.string()
	.trim()
	.max(VERSION_NOTE_MAX, `Note trop longue (${VERSION_NOTE_MAX} caractères au plus)`)
	.nullable()
	.optional()
	.transform((note) => (note ? note : null));

/** POST /api/exercises/[id]/versions */
export const createVersionSchema = z.object({ note: noteSchema }).strict();

/** PATCH /api/exercises/[id]/versions/[versionId] */
export const updateVersionNoteSchema = z.object({ note: noteSchema }).strict();
