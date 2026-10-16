<!--
  Menu « Taille du texte » des PDF de fiche (accessibilité, élèves malvoyants) :
  Normale, Grande, Très grande. Le parent décide de ce que fait le choix
  (enregistrer le réglage de l'élève, ou seulement régénérer l'aperçu).
-->
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { TEXT_SIZE_OPTIONS, textSizeOf, type TextSize } from '$lib/typst/text-size';

	interface Props {
		value: TextSize;
		onchange: (size: TextSize) => void;
		disabled?: boolean;
		id?: string;
	}

	let { value, onchange, disabled = false, id }: Props = $props();

	let currentLabel = $derived(
		TEXT_SIZE_OPTIONS.find((option) => option.value === value)?.label ?? 'Normale'
	);

	function handleChange(next: string) {
		onchange(textSizeOf(next));
	}
</script>

<div class="flex items-center gap-2">
	<span class="text-sm whitespace-nowrap text-muted-foreground">Taille du texte</span>
	<MySelect
		type="single"
		{id}
		{value}
		items={TEXT_SIZE_OPTIONS}
		onValueChange={handleChange}
		{disabled}
		fitContent
		triggerAriaLabel="Taille du texte, {currentLabel}"
	/>
</div>
