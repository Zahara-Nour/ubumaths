<script lang="ts">
	import '#lib/utils/mathlive-styles.ts';
	import 'mathlive';
	import type { MathfieldElement, MathfieldElementAttributes } from 'mathlive';
	import { on } from 'svelte/events';

	type Props = {
		value?: string;
		/** The underlying element, for callers needing its imperative API (insert, focus…). */
		element?: MathfieldElement;
	} & Partial<MathfieldElementAttributes>;

	let { value = $bindable(), element = $bindable(), ...rest }: Props = $props();

	const init = (node: MathfieldElement) => {
		element = node;

		// Le champ suit la valeur liée, vidée comprise (L116) ; rien à écrire
		// quand elle revient de la saisie même (le curseur ne bouge pas).
		$effect(() => {
			const next = value ?? '';
			if (node.value !== next) node.value = next;
		});

		//reacts to
		$effect(() =>
			on(node, 'input', () => {
				value = node.value;
			})
		);
	};
</script>

<math-field use:init {...rest}></math-field>
