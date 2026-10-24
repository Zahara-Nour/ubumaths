<!--
  Blockly Playground Page

  Interactive visual programming environment for learning JavaScript and Python.
  Page de dev, réservée à l'administration (`/dev/blockly`).
-->
<script lang="ts">
	import { BlocklyPlayground } from '$lib/components/blockly';
</script>

<svelte:head>
	<title>Blockly Playground - Chiphre</title>
	<meta
		name="description"
		content="Environnement de programmation visuelle avec Blockly pour apprendre JavaScript et Python"
	/>
</svelte:head>

<div class="h-screen w-full">
	<h1 class="sr-only">Blockly Playground</h1>
	<BlocklyPlayground />
</div>
