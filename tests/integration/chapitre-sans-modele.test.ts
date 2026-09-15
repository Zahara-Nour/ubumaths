/**
 * Un chapitre sans modèle n'est pas une panne (base locale requise)
 * =================================================================
 *
 * `checkForTemplateUpdates` cherche l'instanciation d'un chapitre pour savoir
 * si son modèle a une version plus récente à proposer. Un chapitre **créé de
 * zéro** n'en a aucune — c'est le cas normal, pas une anomalie.
 *
 * La requête utilisait `.single()`, qui rend `PGRST116` sur zéro ligne. Le code
 * traitait ce code comme une erreur, et la page de chapitre du professeur
 * journalisait « Enrichissement illisible » à chaque visite.
 *
 * ⚠️ Ce n'est pas une hypothèse : 14 remontées en production entre le
 * 2026-09-13 et le 2026-09-15, sur 2 utilisateurs, trouvées en lisant les
 * erreurs d'exécution Vercel. Aucun test ne les voyait.
 *
 * `PGRST116` veut dire ABSENCE, pas panne.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { checkForTemplateUpdates } from '$lib/server/chapter-templates';

const service = createServiceRoleClient();

describe('checkForTemplateUpdates sur un chapitre sans modèle', () => {
	let chapterId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		await TestData.profile().withRole('teacher').create();

		const klass = await TestData.class().withName('5e D sans modèle ZZ').create();

		// Un chapitre créé À LA MAIN : aucune ligne dans
		// `chapter_template_instantiations`.
		const { data: chapitre, error } = await service
			.from('class_chapters')
			.insert({ class_id: klass.id, title: 'Chapitre sans modèle ZZ' })
			.select('id')
			.single();
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
		chapterId = chapitre!.id;
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** ⚠️ LE cas. Avant `maybeSingle`, il rendait une erreur PGRST116. */
	it('ne rend pas d’erreur, et annonce simplement qu’il n’y a rien à mettre à jour', async () => {
		const result = await checkForTemplateUpdates(chapterId, service);

		expect(result.error, 'une absence de modèle est traitée comme une panne').toBeNull();
		expect(result.data).toEqual({ hasUpdate: false, latestVersion: null });
	});

	/**
	 * Le contre-témoin : un chapitre qui n'existe pas donne le MÊME résultat.
	 * C'est voulu — la fonction ne répond qu'à « ce chapitre a-t-il une mise à
	 * jour de modèle », et la réponse est non dans les deux cas.
	 */
	it('et pas davantage pour un chapitre inexistant', async () => {
		const result = await checkForTemplateUpdates(crypto.randomUUID(), service);

		expect(result.error).toBeNull();
		expect(result.data).toEqual({ hasUpdate: false, latestVersion: null });
	});
});
