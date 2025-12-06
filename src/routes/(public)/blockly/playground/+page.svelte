<!--
  Blockly Playground Page

  Interactive visual programming environment for learning JavaScript and Python.
  Public route accessible to all users.
-->
<script lang="ts">
	import { BlocklyPlayground } from '$lib/components/blockly';
	import type { PageData } from './$types';

	// =============================================================================
	// Props
	// =============================================================================

	// User data available if logged in (for future features like workspace saving)
	let { data: _data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Blockly Playground - UbuMaths</title>
	<meta
		name="description"
		content="Environnement de programmation visuelle avec Blockly pour apprendre JavaScript et Python"
	/>
</svelte:head>

<div class="h-screen w-full">
	<BlocklyPlayground />
</div>
