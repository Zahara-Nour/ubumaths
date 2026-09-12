/**
 * L'année courante se déduit des dates, pas d'un drapeau (base locale requise)
 * ===========================================================================
 *
 * `school_years.is_active` était censé désigner « l'année en cours ». Mais rien
 * ne le pose jamais : il n'existe aucun geste « démarrer l'année », seulement
 * une case à cocher dans le formulaire de création. Personne ne pense à la
 * décocher en juin, ni à cocher la suivante en septembre.
 *
 * Pire, il ne peut pas dire la vérité en juillet : l'année écoulée est finie,
 * la suivante n'a pas commencé, et un drapeau oui/non ne sait pas exprimer ça.
 * Soit on laisse l'ancienne active alors qu'elle est terminée, soit on n'a plus
 * AUCUNE année active — et `getActiveSchoolYear` ne trouve rien, silencieusement,
 * ses deux appelants avalant l'erreur par un `.catch(() => null)`.
 *
 * La règle retenue : l'année qui CONTIENT aujourd'hui ; à défaut, la plus
 * récente déjà commencée. Elle est déterministe, ne demande aucun entretien, et
 * donne en juillet la dernière année vécue plutôt que rien.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';

const service = createServiceRoleClient();

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('année courante d’une école', () => {
	const ecoles: string[] = [];

	async function ecoleAvecAnnees(
		nom: string,
		annees: { nom: string; debut: string; fin: string; actif?: boolean }[]
	): Promise<{ ecole: string; ids: Record<string, string> }> {
		const ecole = await insert('schools', { name: nom, city: 'Testville', country: 'France' });
		ecoles.push(ecole);
		const ids: Record<string, string> = {};
		for (const a of annees) {
			ids[a.nom] = await insert('school_years', {
				school_id: ecole,
				name: a.nom,
				start_date: a.debut,
				end_date: a.fin,
				is_active: a.actif ?? false
			});
		}
		return { ecole, ids };
	}

	async function anneeCourante(ecole: string): Promise<string | null> {
		const pg = await getPostgresClient();
		const { rows } = await pg.query('select id from public.current_school_year($1)', [ecole]);
		return rows.length > 0 ? (rows[0] as { id: string }).id : null;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
	});

	afterAll(async () => {
		if (ecoles.length > 0) await service.from('schools').delete().in('id', ecoles);
		await cleanupAllTestData();
	});

	it('rend l’année qui contient aujourd’hui', async () => {
		const { ecole, ids } = await ecoleAvecAnnees('EnCoursZZ', [
			{ nom: 'passee', debut: '2020-09-01', fin: '2021-06-30' },
			{ nom: 'courante', debut: '2020-09-01', fin: '2099-06-30' }
		]);
		expect(await anneeCourante(ecole)).toBe(ids.courante);
	});

	it('le drapeau `is_active` n’a plus aucune influence', async () => {
		// Le cœur du changement : une année marquée active mais terminée ne doit
		// plus l'emporter sur celle où l'on se trouve vraiment.
		const { ecole, ids } = await ecoleAvecAnnees('DrapeauMenteurZZ', [
			{ nom: 'terminee_mais_cochee', debut: '2020-09-01', fin: '2021-06-30', actif: true },
			{ nom: 'vraiment_courante', debut: '2020-09-01', fin: '2099-06-30', actif: false }
		]);
		expect(await anneeCourante(ecole)).toBe(ids.vraiment_courante);
	});

	it('entre deux années, rend la plus récente commencée', async () => {
		// Le cas de juillet, que le drapeau ne savait pas exprimer : plutôt que
		// rien, on rend la dernière année vécue.
		const { ecole, ids } = await ecoleAvecAnnees('EntreDeuxZZ', [
			{ nom: 'avant_derniere', debut: '2019-09-01', fin: '2020-06-30' },
			{ nom: 'derniere', debut: '2020-09-01', fin: '2021-06-30' }
		]);
		expect(await anneeCourante(ecole)).toBe(ids.derniere);
	});

	it('une année pas encore commencée n’est jamais rendue', async () => {
		const { ecole } = await ecoleAvecAnnees('FutureZZ', [
			{ nom: 'a_venir', debut: '2090-09-01', fin: '2091-06-30', actif: true }
		]);
		expect(await anneeCourante(ecole)).toBeNull();
	});

	it('une école sans année ne rend rien', async () => {
		const { ecole } = await ecoleAvecAnnees('SansAnneeZZ', []);
		expect(await anneeCourante(ecole)).toBeNull();
	});

	it('chaque école a la sienne', async () => {
		// Le garde-fou : la fonction ne doit jamais rendre l'année d'une autre
		// école, même si elle est plus récente.
		const a = await ecoleAvecAnnees('EcoleAZZ', [
			{ nom: 'a', debut: '2020-09-01', fin: '2099-06-30' }
		]);
		const b = await ecoleAvecAnnees('EcoleBZZ', [
			{ nom: 'b', debut: '2021-09-01', fin: '2099-06-30' }
		]);
		expect(await anneeCourante(a.ecole)).toBe(a.ids.a);
		expect(await anneeCourante(b.ecole)).toBe(b.ids.b);
	});
});
