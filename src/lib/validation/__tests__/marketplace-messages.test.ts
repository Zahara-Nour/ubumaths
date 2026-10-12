/**
 * Messages des schémas du marché affichés DANS LE NAVIGATEUR
 * ===========================================================
 *
 * `stores/marketplace.svelte.ts` et `MarketplaceSettings.svelte` affichent
 * `issues[0].message` dans une notification. Côté navigateur, Zod parle anglais
 * (`src/lib/zod-locale.ts` ne règle que le serveur) : chaque refus doit donc
 * porter un message écrit dans le schéma, y compris les refus de TYPE (nombre
 * vide → NaN, choix hors liste). Le test remet Zod en anglais, comme dans le
 * navigateur, et refuse tout message par défaut.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import {
	createListingSchema,
	createProposalSchema,
	updateProposalSchema,
	createTradeSchema,
	marketplaceSettingsSchema
} from '../marketplace';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

/** Tous les messages d'un refus. */
function messagesOf(schema: z.ZodType, data: unknown): string[] {
	const result = schema.safeParse(data);
	expect(result.success).toBe(false);
	return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

/** Un message par défaut de Zod en anglais (« Invalid input: expected number… »). */
const ZOD_DEFAULT = /\b(?:Invalid|expected|received|Too (?:big|small))\b/;

beforeAll(() => {
	z.config(z.locales.en());
});

afterAll(() => {
	z.config(z.locales.fr());
});

describe('schémas du marché : jamais le texte anglais par défaut de Zod', () => {
	it('annonce : type inconnu, gidouilles vides (NaN) ou infinies', () => {
		const messages = [
			...messagesOf(createListingSchema, { listing_type: 'donner', offered_card_ids: [UUID] }),
			...messagesOf(createListingSchema, { listing_type: 'sell', offered_gidouilles: NaN }),
			...messagesOf(createListingSchema, { listing_type: 'sell', offered_gidouilles: Infinity }),
			...messagesOf(createListingSchema, { listing_type: 'buy', wanted_gidouilles: 'dix' })
		];
		expect(messages.filter((message) => ZOD_DEFAULT.test(message))).toEqual([]);
	});

	it('proposition : annonce manquante, gidouilles vides, cartes au mauvais format', () => {
		const messages = [
			...messagesOf(createProposalSchema, { offered_gidouilles: 5 }),
			...messagesOf(createProposalSchema, { listing_id: UUID, offered_gidouilles: NaN }),
			...messagesOf(createProposalSchema, { listing_id: UUID, offered_card_ids: 'carte' })
		];
		expect(messages.filter((message) => ZOD_DEFAULT.test(message))).toEqual([]);
	});

	it('réponse à une proposition : statut hors liste', () => {
		const messages = messagesOf(updateProposalSchema, { status: 'peut-être' });
		expect(messages.filter((message) => ZOD_DEFAULT.test(message))).toEqual([]);
	});

	it('échange : partenaire manquant, offre absente, gidouilles vides', () => {
		const messages = [
			...messagesOf(createTradeSchema, {}),
			...messagesOf(createTradeSchema, { partner_id: UUID, initial_offer: { gidouilles: NaN } })
		];
		expect(messages.filter((message) => ZOD_DEFAULT.test(message))).toEqual([]);
	});

	it('réglages du marché : champs vides (NaN) ou interrupteur absent', () => {
		const messages = [
			...messagesOf(marketplaceSettingsSchema, {
				enabled_for_class: true,
				max_listings_per_student: NaN,
				max_trades_per_day: 5
			}),
			...messagesOf(marketplaceSettingsSchema, {
				max_listings_per_student: 3,
				max_trades_per_day: NaN
			})
		];
		expect(messages.filter((message) => ZOD_DEFAULT.test(message))).toEqual([]);
	});

	it('les messages écrits restent ceux du schéma', () => {
		expect(
			messagesOf(createListingSchema, { listing_type: 'sell', offered_gidouilles: -1 })
		).toContain('Les gidouilles ne peuvent pas être négatives');
	});
});
