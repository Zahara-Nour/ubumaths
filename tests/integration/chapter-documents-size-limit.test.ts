/**
 * Plafond d'un document de chapitre — 25 Mo (needs a running DB + storage)
 * ========================================================================
 * Le plafond vit à quatre endroits : le composant qui prévient, l'action qui
 * refuse, le bucket `chapter-documents`, et la contrainte `valid_file_size`
 * de la table. Les deux derniers ont le dernier mot, et ils doivent tomber
 * ensemble : relever le seul bucket faisait monter le fichier puis échouer son
 * enregistrement, si bien que le professeur attendait la fin d'un envoi de
 * 15 Mo pour récolter une erreur générique — le fichier étant effacé derrière
 * lui.
 *
 * Les buckets ne font pas partie du dump de schéma — ils sont de l'état de
 * tableau de bord — d'où la remise en état de départ explicite avant de
 * rejouer la migration.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';

const BUCKET = 'chapter-documents';
const ANCIEN_PLAFOND = 10 * 1024 * 1024;
const NOUVEAU_PLAFOND = 25 * 1024 * 1024;
const MIGRATION = 'supabase/migrations/20260915200000_chapter_documents_25mb.sql';

/** Un PDF minimal, rembourré jusqu'à la taille voulue. */
function pdfDeTaille(octets: number): Blob {
	const entete = '%PDF-1.4\n';
	const remplissage = 'a'.repeat(Math.max(0, octets - entete.length));
	return new Blob([entete + remplissage], { type: 'application/pdf' });
}

describe('Plafond des documents de chapitre', () => {
	const chemins: string[] = [];
	let chapitre: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		await svc.storage.createBucket(BUCKET, { public: false }).catch(() => {});

		const pg = await getPostgresClient();

		// État d'avant la migration : le bucket ET la contrainte refusent au-delà
		// de 10 Mo.
		await pg.query(`update storage.buckets set file_size_limit = $1 where id = $2`, [
			ANCIEN_PLAFOND,
			BUCKET
		]);
		await pg.query(`
			alter table public.chapter_documents
				drop constraint if exists valid_file_size,
				add constraint valid_file_size
					check (file_size is null or (file_size > 0 and file_size <= ${ANCIEN_PLAFOND}));
		`);

		// Puis la migration, telle qu'elle sera jouée en production.
		await pg.query(await readFile(MIGRATION, 'utf8'));

		// Un chapitre d'accueil, pour éprouver l'enregistrement du document. La
		// création d'une classe déclenche celle de sa conversation, qui cherche
		// l'unique professeur : sans lui, elle naît sans auteur et viole sa
		// contrainte.
		await TestData.profile().withRole('teacher').create();
		const ecole = await svc
			.from('schools')
			.insert({ name: 'Lycée plafond YY', city: 'Testville', country: 'France' })
			.select('id')
			.single();
		if (ecole.error) throw new Error(ecole.error.message);

		const annee = await svc
			.from('school_years')
			.insert({
				school_id: ecole.data.id,
				name: 'Année plafond YY',
				start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
				end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
				is_active: true
			})
			.select('id')
			.single();
		if (annee.error) throw new Error(annee.error.message);

		const classe = await svc
			.from('classes')
			.insert({
				name: 'Classe plafond YY',
				join_code: 'YYPL01',
				is_active: true,
				school_id: ecole.data.id,
				school_year_id: annee.data.id
			})
			.select('id')
			.single();
		if (classe.error) throw new Error(classe.error.message);

		const chap = await svc
			.from('class_chapters')
			.insert({ class_id: classe.data.id, title: 'Chapitre plafond YY', display_order: 1 })
			.select('id')
			.single();
		if (chap.error) throw new Error(chap.error.message);
		chapitre = chap.data.id;
	});

	afterAll(async () => {
		const svc = createServiceRoleClient();
		if (chemins.length > 0) await svc.storage.from(BUCKET).remove(chemins);
		if (chapitre) {
			await svc.from('class_chapters').delete().eq('id', chapitre);
			await svc.from('classes').delete().eq('name', 'Classe plafond YY');
			await svc.from('schools').delete().eq('name', 'Lycée plafond YY');
		}
		await cleanupAllTestData();
	});

	it('porte le plafond du bucket à 25 Mo', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(`select file_size_limit from storage.buckets where id = $1`, [
			BUCKET
		]);

		expect(Number(rows[0].file_size_limit)).toBe(NOUVEAU_PLAFOND);
	});

	// 15 Mo : refusé avant la migration, accepté après. C'est tout l'objet du
	// changement — un scan de cours passe enfin.
	it('accepte un document de 15 Mo', async () => {
		const svc = createServiceRoleClient();
		const chemin = `test-taille/${Date.now()}-15mo.pdf`;

		const { error } = await svc.storage
			.from(BUCKET)
			.upload(chemin, pdfDeTaille(15 * 1024 * 1024), { contentType: 'application/pdf' });

		expect(error).toBeNull();
		chemins.push(chemin);
	});

	// Le dépôt du fichier ne suffit pas : c'est la ligne `chapter_documents` qui
	// a fait échouer le parcours réel, la contrainte de la table étant restée à
	// 10 Mo. Sans elle, l'envoi montait puis était effacé, erreur générique à la
	// clé.
	it('enregistre un document de 15 Mo dans le chapitre', async () => {
		const svc = createServiceRoleClient();
		const taille = 15 * 1024 * 1024;

		const { error } = await svc.from('chapter_documents').insert({
			chapter_id: chapitre,
			title: 'Polycopié de 15 Mo',
			source_type: 'upload',
			storage_path: `chapters/${chapitre}/polycopie.pdf`,
			file_name: 'polycopie.pdf',
			file_size: taille,
			mime_type: 'application/pdf',
			display_order: 1
		});

		expect(error).toBeNull();
	});

	it('refuse encore d’enregistrer un document de 30 Mo', async () => {
		const svc = createServiceRoleClient();

		const { error } = await svc.from('chapter_documents').insert({
			chapter_id: chapitre,
			title: 'Scan de 30 Mo',
			source_type: 'upload',
			storage_path: `chapters/${chapitre}/scan.pdf`,
			file_name: 'scan.pdf',
			file_size: 30 * 1024 * 1024,
			mime_type: 'application/pdf',
			display_order: 2
		});

		expect(error).not.toBeNull();
	});

	// Le plafond reste un plafond : desserré, pas supprimé.
	it('refuse encore un document de 30 Mo', async () => {
		const svc = createServiceRoleClient();
		const chemin = `test-taille/${Date.now()}-30mo.pdf`;

		const { error } = await svc.storage
			.from(BUCKET)
			.upload(chemin, pdfDeTaille(30 * 1024 * 1024), { contentType: 'application/pdf' });

		expect(error).not.toBeNull();
	});
});
