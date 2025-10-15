<script lang="ts">
	import { tick } from 'svelte';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import RichTextDisplay from '$lib/components/rich-text/RichTextDisplay.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';

	interface Message {
		id: number;
		author: string;
		content: any;
		timestamp: Date;
	}

	// Demo messages with math formulas
	const demoMessages: Message[] = [
		{
			id: 1,
			author: 'Alice',
			timestamp: new Date('2025-10-14T10:30:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Salut ! Pour résoudre cette équation du second degré, on utilise : '
							},
							{
								type: 'mathInline',
								attrs: { latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' }
							}
						]
					}
				]
			}
		},
		{
			id: 2,
			author: 'Bob',
			timestamp: new Date('2025-10-14T10:32:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Excellent ! Et voici une intégrale célèbre :' }]
					},
					{
						type: 'mathBlock',
						attrs: {
							latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'
						}
					}
				]
			}
		},
		{
			id: 3,
			author: 'Charlie',
			timestamp: new Date('2025-10-14T10:35:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Pour le théorème de Pythagore, on a simplement : ' },
							{
								type: 'mathInline',
								attrs: { latex: 'a^2 + b^2 = c^2' }
							},
							{ type: 'text', text: ' 🎯' }
						]
					}
				]
			}
		}
	];

	let messages = $state<Message[]>(demoMessages);
	let messagesContainer = $state<HTMLElement | null>(null);

	async function handleSendMessage(content: any) {
		const newMessage: Message = {
			id: messages.length + 1,
			author: 'Vous',
			content: content,
			timestamp: new Date()
		};

		messages = [...messages, newMessage];

		// Scroll to bottom after adding message
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	function getInitials(name: string): string {
		return name[0].toUpperCase();
	}
</script>

<svelte:head>
	<title>Démo - Éditeur de texte enrichi avec mathématiques</title>
</svelte:head>

<div class="container mx-auto max-w-5xl p-4">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-foreground mb-2">Éditeur de texte enrichi</h1>
		<p class="text-muted-foreground">
			Démo d'un éditeur avec support des formules mathématiques interactives (MathLive + TipTap)
		</p>
	</div>

	<Separator class="mb-6" />

	<!-- Instructions -->
	<div class="mb-6 p-4 bg-card border border-border rounded-lg">
		<h2 class="font-semibold text-lg mb-2">Comment utiliser :</h2>
		<ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
			<li>Utilisez les boutons <strong>Gras</strong> et <strong>Italique</strong> pour formater le texte</li>
			<li>Cliquez sur <strong>Formule</strong> pour insérer des formules mathématiques</li>
			<li><strong>Nouveau :</strong> Tapez <code class="px-1 py-0.5 bg-muted rounded">$$formule$$</code> pour créer automatiquement une formule (ex: <code class="px-1 py-0.5 bg-muted rounded">$$x^2+y^2$$</code>)</li>
			<li>Les formules en ligne s'insèrent dans le texte</li>
			<li>Les blocs de formule sont centrés et plus grands</li>
			<li>Cliquez sur une formule pour l'éditer avec MathLive</li>
		</ul>
	</div>

	<!-- Chat container -->
	<div class="flex flex-col h-[600px] border border-border rounded-lg bg-card overflow-hidden">
		<!-- Messages area -->
		<div
			bind:this={messagesContainer}
			class="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30"
		>
			{#if messages.length === 0}
				<div class="text-center text-muted-foreground py-12">
					<p class="text-lg">Aucun message pour le moment</p>
					<p class="text-sm mt-2">Envoyez votre premier message avec des formules mathématiques !</p>
				</div>
			{:else}
				{#each messages as message (message.id)}
					<div class="flex gap-3">
						<!-- Avatar -->
						<div class="flex-shrink-0">
							<Avatar.Root class="h-10 w-10">
								<Avatar.Fallback
									class="bg-gradient-to-br from-primary to-purple-500 text-primary-foreground"
								>
									{getInitials(message.author)}
								</Avatar.Fallback>
							</Avatar.Root>
						</div>

						<!-- Message content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-baseline gap-2 mb-1">
								<span class="font-semibold text-foreground">{message.author}</span>
								<span class="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
							</div>

							<div class="bg-card rounded-lg p-3 border border-border shadow-sm">
								<RichTextDisplay content={message.content} />
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Editor area -->
		<div class="border-t border-border p-4 bg-background">
			<RichTextEditor onSend={handleSendMessage} />
			<p class="text-xs text-muted-foreground mt-2 text-center">
				💡 Tapez <code class="px-1 py-0.5 bg-muted rounded">$$x^2$$</code> ou utilisez le bouton "Formule" pour insérer des mathématiques
			</p>
		</div>
	</div>

	<!-- Features showcase -->
	<div class="mt-8 grid md:grid-cols-2 gap-4">
		<div class="p-4 bg-card border border-border rounded-lg">
			<h3 class="font-semibold mb-2">✨ Fonctionnalités</h3>
			<ul class="text-sm text-muted-foreground space-y-1">
				<li>• Édition de texte enrichi (gras, italique)</li>
				<li>• Formules mathématiques interactives</li>
				<li>• Support LaTeX complet via MathLive</li>
				<li>• Affichage en temps réel</li>
				<li>• Mode lecture seule pour les messages</li>
			</ul>
		</div>

		<div class="p-4 bg-card border border-border rounded-lg">
			<h3 class="font-semibold mb-2">🔧 Technologies</h3>
			<ul class="text-sm text-muted-foreground space-y-1">
				<li>• <strong>Svelte 5</strong> - Framework réactif</li>
				<li>• <strong>TipTap</strong> - Éditeur de texte riche</li>
				<li>• <strong>MathLive</strong> - Éditeur mathématique</li>
				<li>• <strong>Shadcn-svelte</strong> - Composants UI</li>
				<li>• <strong>Tailwind CSS</strong> - Styling</li>
			</ul>
		</div>
	</div>
</div>
