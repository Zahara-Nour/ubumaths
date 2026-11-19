<!--
  Case « Lecture facilitée » des PDF de fiche (accessibilité, élèves dys) : le
  PDF sort en Luciole, formules en Luciole Math. Posée à côté du menu « Taille
  du texte » ; le parent décide de ce que fait le choix (enregistrer le réglage
  de l'élève, ou seulement régénérer l'aperçu).
-->
<script lang="ts">
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';

	interface Props {
		checked: boolean;
		onchange: (checked: boolean) => void;
		disabled?: boolean;
	}

	let { checked, onchange, disabled = false }: Props = $props();
</script>

<span title="PDF en police Luciole, plus facile à lire">
	<MyCheckbox
		{checked}
		{onchange}
		{disabled}
		label="Lecture facilitée"
		labelClass="whitespace-nowrap text-muted-foreground"
	/>
</span>
