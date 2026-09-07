import { beforeEach, describe, expect, it } from 'vitest';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { isSequence } from '$lib/grapheur/types';
import { computeSequenceTerms, toComputeSpec } from '$lib/grapheur/sequence';
import type { SequencePlottable } from '$lib/grapheur/types';

function sequenceById(id: string): SequencePlottable {
	const found = grapheurStore.functions.find((p) => p.id === id);
	if (!found || !isSequence(found)) throw new Error('suite introuvable');
	return found;
}

describe('paramètres — renommage', () => {
	beforeEach(() => grapheurStore.fullReset());

	it('renomme et rend null', () => {
		const id = grapheurStore.addParameter();

		expect(grapheurStore.renameParameter(id, 'k')).toBeNull();
		expect(grapheurStore.parameters[0].name).toBe('k');
	});

	it('refuse un nom de plus d’une lettre', () => {
		const id = grapheurStore.addParameter();

		expect(grapheurStore.renameParameter(id, 'ab')).toContain('une seule lettre');
		expect(grapheurStore.parameters[0].name).toBe('a');
	});

	it('refuse un nom réservé', () => {
		const id = grapheurStore.addParameter();

		expect(grapheurStore.renameParameter(id, 'x')).toContain('déjà pris');
	});

	it('refuse un nom déjà porté par un autre paramètre', () => {
		grapheurStore.addParameter();
		const second = grapheurStore.addParameter();

		expect(grapheurStore.renameParameter(second, 'a')).toContain('existe déjà');
	});

	it('refuse le nom d’une suite', () => {
		grapheurStore.addSequence('recurrence', '2u_n');
		const id = grapheurStore.addParameter();

		expect(grapheurStore.renameParameter(id, 'u')).toContain("nom d'une suite");
	});
});

/**
 * Une suite valide ses variables libres au moment où elle est analysée. Écrire
 * `a·u_n` avant de déclarer `a` la laissait donc en erreur, et rien ne levait
 * cette erreur ensuite : l'expression n'avait pas changé, seulement ce qui
 * compte comme un nom connu.
 */
describe('paramètres — les suites sont réanalysées', () => {
	beforeEach(() => grapheurStore.fullReset());

	it('lève l’erreur d’une suite écrite avant la déclaration du paramètre', () => {
		const id = grapheurStore.addSequence('recurrence', 'a*u_n');
		expect(sequenceById(id).parseError).toBeDefined();

		grapheurStore.addParameter();

		expect(sequenceById(id).parseError).toBeUndefined();
		expect(sequenceById(id).ast).toBeDefined();
	});

	it('remet la suite en erreur quand le paramètre est supprimé', () => {
		const seq = grapheurStore.addSequence('recurrence', 'a*u_n');
		const param = grapheurStore.addParameter();
		expect(sequenceById(seq).parseError).toBeUndefined();

		grapheurStore.removeParameter(param);

		expect(sequenceById(seq).parseError).toBeDefined();
	});

	it('suit un renommage', () => {
		const seq = grapheurStore.addSequence('recurrence', 'a*u_n');
		const param = grapheurStore.addParameter();

		grapheurStore.renameParameter(param, 'k');

		expect(sequenceById(seq).parseError).toBeDefined();
	});
});

describe('paramètres — premier terme piloté', () => {
	beforeEach(() => grapheurStore.fullReset());

	it('prend la valeur du paramètre plutôt que le nombre saisi', () => {
		const seq = grapheurStore.addSequence('recurrence', '2u_n');
		const param = grapheurStore.addParameter();
		grapheurStore.updateParameter(param, { value: 5 });
		grapheurStore.updateSequence(seq, { firstTerm: 1, firstTermParameter: 'a' });

		const spec = toComputeSpec(sequenceById(seq), grapheurStore.parameterBindings);
		const terms = computeSequenceTerms(spec!, 3).map((t) => t.value);

		expect(terms).toEqual([5, 10, 20, 40]);
	});

	it('suit le curseur du paramètre', () => {
		const seq = grapheurStore.addSequence('recurrence', '2u_n');
		const param = grapheurStore.addParameter();
		grapheurStore.updateSequence(seq, { firstTermParameter: 'a' });

		grapheurStore.updateParameter(param, { value: 3 });
		const spec = toComputeSpec(sequenceById(seq), grapheurStore.parameterBindings);

		expect(computeSequenceTerms(spec!, 1)[0].value).toBe(3);
	});

	it('n’itère plus si le paramètre disparaît, plutôt que de garder une valeur périmée', () => {
		const seq = grapheurStore.addSequence('recurrence', '2u_n');
		const param = grapheurStore.addParameter();
		grapheurStore.updateSequence(seq, { firstTerm: 1, firstTermParameter: 'a' });

		grapheurStore.removeParameter(param);
		const spec = toComputeSpec(sequenceById(seq), grapheurStore.parameterBindings);

		expect(computeSequenceTerms(spec!, 3)).toEqual([]);
	});
});
