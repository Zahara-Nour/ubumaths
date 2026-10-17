<!--
@component
Une touche de calculatrice dessinée, dans le texte d'une étape.
-->
<script lang="ts">
	let { label }: { label: string } = $props();
</script>

<kbd
	class="mx-0.5 inline-flex min-w-7 items-center justify-center rounded-md border border-b-[3px] border-border bg-muted px-1.5 py-0.5 font-sans text-sm leading-none font-semibold whitespace-nowrap text-foreground"
	>{label}</kbd
>
