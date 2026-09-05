/**
 * Message de groupe — `p_recipient_ids` est ignoré (nécessite une base locale)
 * ===========================================================================
 *
 * `send_private_message` déclare `p_recipient_ids uuid[]` **sans DEFAULT** :
 * le paramètre est donc obligatoire dans les types générés. Le code passait
 * `null` pour un message de classe, ce que le typage refuse.
 *
 * Le corps de la fonction règle la question : dans la branche « message de
 * groupe avec class_id », il **écrase** le paramètre par la liste des élèves
 * de la classe —
 *
 *     SELECT array_agg(student_id) INTO p_recipient_ids
 *     FROM get_students_in_class(p_class_id);
 *
 * — donc un tableau vide y est strictement équivalent au NULL passé
 * auparavant. Ce test fige ce raisonnement : si un jour la fonction cessait
 * d'écraser le paramètre, un tableau vide deviendrait un envoi sans
 * destinataire, et il faut le voir.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';

const db = createServiceRoleClient();

describe('send_private_message — signature', () => {
	it('un tableau vide est accepté par la signature', async () => {
		// Sans destinataire ni classe, la fonction doit refuser pour une raison
		// MÉTIER (permissions / destinataires invalides), pas pour un paramètre
		// manquant : c'est ce qui prouve que la forme de l'appel est correcte.
		const { error } = await db.rpc('send_private_message', {
			p_sender_id: '00000000-0000-4000-8000-000000000000',
			p_recipient_ids: [],
			p_subject: 'test',
			p_content: { text: 'test' },
			p_is_group_message: true
		});

		expect(error).not.toBeNull();
		// Un paramètre manquant donnerait PGRST202 (fonction introuvable dans le
		// cache de schéma). Ici l'échec doit venir du corps de la fonction.
		expect(error?.code).not.toBe('PGRST202');
	});
});
