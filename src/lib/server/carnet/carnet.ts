/**
 * Carnet de liaison — les portes du serveur (ADR 0040)
 * ====================================================
 *
 * Le carnet est la page d'UN parent sur UN élève, lue par un lien qui lui est
 * propre, sans compte. Les fonctions SQL qui reçoivent un lien sont réservées
 * au service role : ce module est le seul à les appeler, APRÈS les gardes des
 * routes (forme du jeton, limite de débit).
 *
 * Jetons : 32 octets aléatoires (CSPRNG) en base64url, jamais stockés en clair
 * — la base ne garde que leur empreinte sha256 (Q22). Un lien perdu ne se
 * renvoie pas : on en émet un neuf. Confirmer une adresse, émettre et envoyer
 * les liens : `./envois`.
 *
 * Ce que le carnet montre (question d'accès Q16) : le prénom, le palier de
 * régularité de 5 semaines, le nombre de révisions en retard, les évaluations
 * (faites ou non, SANS note), les liens du cahier et du cours. Le schéma Zod
 * (`#lib/validation/carnet.ts`) RETIRE toute autre clé : une colonne ajoutée par
 * erreur côté SQL ne descend pas jusqu'à la page.
 */

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import {
	parentCarnetSchema,
	studentCarnetSchema,
	type ParentCarnet,
	type StudentCarnet
} from '#lib/validation/carnet.ts';

// Types

type SB = SupabaseClient<Database>;

// Constantes

const logger = createServerLogger('server/carnet/carnet');

/** B4 : la même phrase pour tous les échecs (révoqué, expiré, inexistant, fermé). */
export const INVALID_CARNET_LINK =
	"Ce lien n'est plus valide. Demandez-en un nouveau au professeur.";

/** 32 octets en base64url = 43 caractères (la base accepte 32 à 128). */
export const carnetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

// Functions

export function generateCarnetToken(): string {
	return randomBytes(32).toString('base64url');
}

/** Même empreinte que la base : `encode(digest(token, 'sha256'), 'hex')`. */
export function hashCarnetToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, where: string): T {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		logger.error(`[${where}] carnet mal formé`, parsed.error.issues);
		throw new Error('Carnet de liaison illisible');
	}
	return parsed.data;
}

/** Porte du parent. `null` = lien mort ou carnet fermé, sans distinguer (B4). */
export async function readCarnetByToken(token: string): Promise<ParentCarnet | null> {
	if (!carnetTokenSchema.safeParse(token).success) return null;

	const { data, error } = await createServiceRoleClient().rpc('get_carnet_by_token', {
		p_token: token
	});
	if (error) {
		logger.error('[get_carnet_by_token]', error);
		throw new Error('Carnet de liaison indisponible');
	}
	if (data === null) return null;
	return parseOrThrow(parentCarnetSchema, data, 'get_carnet_by_token');
}

/** Porte de l'élève (C1) : son propre carnet, par SON client. `null` = pas un élève. */
export async function readMyCarnet(supabase: SB): Promise<StudentCarnet | null> {
	const { data, error } = await supabase.rpc('get_my_carnet');
	if (error) {
		logger.error('[get_my_carnet]', error);
		throw new Error('Carnet de liaison indisponible');
	}
	if (data === null) return null;
	return parseOrThrow(studentCarnetSchema, data, 'get_my_carnet');
}

/** « Je ne suis pas le parent de cet élève » (A5). `false` = jeton inconnu ou déjà traité. */
export async function refuseParentContact(token: string): Promise<boolean> {
	if (!carnetTokenSchema.safeParse(token).success) return false;

	const { data, error } = await createServiceRoleClient().rpc('refuse_parent_contact', {
		p_token: token
	});
	if (error) {
		logger.error('[refuse_parent_contact]', error);
		throw new Error('Refus indisponible');
	}
	return data !== null;
}

/** Arrêter (true) ou reprendre (false) les courriels, par le lien du carnet (Q9, E5). */
export async function setParentEmailsStopped(token: string, stopped: boolean): Promise<boolean> {
	if (!carnetTokenSchema.safeParse(token).success) return false;

	const { data, error } = await createServiceRoleClient().rpc('set_parent_emails_stopped', {
		p_token: token,
		p_stopped: stopped
	});
	if (error) {
		logger.error('[set_parent_emails_stopped]', error);
		throw new Error('Réglage des courriels indisponible');
	}
	return data === true;
}
