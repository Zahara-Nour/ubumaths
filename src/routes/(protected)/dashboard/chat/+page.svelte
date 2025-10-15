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
	<ChatWindow
		userId={data.session.user.id}
		isTeacher={data.profile.role === 'teacher' || data.profile.role === 'admin'}
		supabase={data.supabase}
	/>
</div>
