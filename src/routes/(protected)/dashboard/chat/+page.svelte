<!--
	Chat Page
	==========

	Main chat interface for students and teachers.
	Full-screen chat window with conversations and messaging.
-->
<script lang="ts">
	import ChatWindow from '$lib/components/chat/ChatWindow.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Messages - UbuMaths</title>
</svelte:head>

<div class="h-screen">
	{#if data.user && data.profile && data.supabase}
		<ChatWindow
			userId={data.user.id}
			isTeacher={data.profile.role === 'teacher' || data.profile.role === 'admin'}
			supabase={data.supabase}
		/>
	{:else}
		<div class="flex items-center justify-center h-full">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	{/if}
</div>
