<!--
	Riddle Navigation Component
	===========================
	Quick navigation links for riddle system pages
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		Sparkles,
		History,
		Trophy,
		BookOpen,
		FileCheck,
		BarChart3,
		Calendar,
		Plus
	} from 'lucide-svelte';
	import { page } from '$app/stores';

	interface Props {
		role: 'teacher' | 'student';
		currentPath?: string;
	}

	let { role, currentPath = $page.url.pathname }: Props = $props();

	const teacherLinks = [
		{
			href: '/dashboard/teacher/riddles',
			label: 'Mes énigmes',
			icon: BookOpen,
			description: 'Gérer mes énigmes'
		},
		{
			href: '/dashboard/teacher/riddles/new',
			label: 'Nouvelle énigme',
			icon: Plus,
			description: 'Créer une énigme'
		},
		{
			href: '/dashboard/teacher/riddles/of-the-day',
			label: 'Énigme du jour',
			icon: Sparkles,
			description: "Gérer l'énigme quotidienne"
		},
		{
			href: '/dashboard/teacher/riddles/validations',
			label: 'Validations',
			icon: FileCheck,
			description: 'Valider les réponses'
		},
		{
			href: '/dashboard/teacher/riddles/stats',
			label: 'Statistiques',
			icon: BarChart3,
			description: 'Voir les stats'
		}
	];

	const studentLinks = [
		{
			href: '/dashboard/student/riddles',
			label: 'Énigme du jour',
			icon: Sparkles,
			description: "Tenter l'énigme"
		},
		{
			href: '/dashboard/student/riddles/archive',
			label: 'Archives',
			icon: Calendar,
			description: 'Énigmes passées'
		},
		{
			href: '/dashboard/student/riddles/leaderboard',
			label: 'Classement',
			icon: Trophy,
			description: 'Voir le leaderboard'
		},
		{
			href: '/dashboard/student/riddles/history',
			label: 'Mon historique',
			icon: History,
			description: 'Mes réussites et badges'
		}
	];

	const links = $derived(role === 'teacher' ? teacherLinks : studentLinks);

	function isActive(href: string): boolean {
		return currentPath === href || currentPath.startsWith(href + '/');
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">Navigation rapide</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each links as link (link.href)}
				{@const Icon = link.icon}
				<Button
					href={link.href}
					variant={isActive(link.href) ? 'default' : 'outline'}
					class="h-auto justify-start p-3"
				>
					<div class="flex items-start gap-2">
						<Icon class="mt-0.5 h-4 w-4 flex-shrink-0" />
						<div class="text-left">
							<div class="text-sm font-medium">{link.label}</div>
							<div class="text-xs opacity-70">{link.description}</div>
						</div>
					</div>
				</Button>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
