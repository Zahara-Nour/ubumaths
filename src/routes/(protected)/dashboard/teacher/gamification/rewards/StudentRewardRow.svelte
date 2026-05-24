<!--
	Student Reward Row Component
	============================

	Displays a single student row in the rewards management table.
	Shows gidouilles, bonus points, and VIP card actions.

	Features:
	- Avatar with fallback initials
	- Gidouilles counter with +/- buttons
	- Bonus counter with +/- buttons
	- VIP card view and award buttons
	- Grant specific VIP card (when in add mode)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { canAffordVipCard } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2, Plus, Star } from 'lucide-svelte';
	import { getTemplateById, vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	interface Student {
		id: string;
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
		avatar_url: string | null;
		role: string | null;
	}

	interface Props {
		student: Student;
		gidouilles: number;
		bonus: number;
		filterMode: 'filter' | 'add';
		selectedCardFilter: string | null;
		grantingCard: string | null;
		onUpdateGidouilles: (studentId: string, delta: number, studentName: string) => void;
		onUpdateBonus: (studentId: string, delta: number, studentName: string) => void;
		onAwardVipCard: (student: Student) => void;
		onViewVipCards: (student: Student) => void;
		onGrantVipCard: (studentId: string) => void;
	}

	let {
		student,
		gidouilles,
		bonus,
		filterMode,
		selectedCardFilter,
		grantingCard,
		onUpdateGidouilles,
		onUpdateBonus,
		onAwardVipCard,
		onViewVipCards,
		onGrantVipCard
	}: Props = $props();

	let amountInput = $state<number | string>(1);
	const amount = $derived.by(() => {
		const n = Math.floor(Number(amountInput));
		if (!Number.isFinite(n) || n < 1) return 1;
		return n;
	});

	/**
	 * Get full name or identifier for student
	 */
	function getFullName(
		firstname: string | null,
		lastname: string | null,
		fullname: string | null
	): string {
		const name = [firstname, lastname].filter(Boolean).join(' ');
		if (name) return name;
		if (fullname) return fullname;
		return 'Eleve sans nom';
	}

	/**
	 * Get student name for toast notifications
	 */
	function getStudentDisplayName(): string {
		return student.firstname || student.full_name || 'Eleve';
	}
</script>

<div class="flex items-center gap-3 px-4 py-3">
	<!-- AVATAR -->
	<UserAvatar
		avatar_url={student.avatar_url}
		role={student.role || 'student'}
		firstname={student.firstname}
		lastname={student.lastname}
		class="h-9 w-9 flex-shrink-0"
	/>

	<!-- STUDENT NAME -->
	<div class="min-w-[120px] flex-1">
		<p class="truncate text-sm font-medium text-foreground">
			{getFullName(student.firstname, student.lastname, student.full_name)}
		</p>
	</div>

	<!-- GIDOUILLES COUNTER -->
	<div class="flex items-center justify-end gap-1.5">
		<img src={gidouilleImg} alt="Gidouille" class="h-5 w-5 flex-shrink-0" />
		<span class="text-lg font-bold text-foreground tabular-nums">
			{gidouilles}
		</span>
	</div>

	<!-- GIDOUILLES +/- BUTTONS -->
	<div class="flex flex-shrink-0 items-center gap-1">
		<Button
			size="sm"
			variant="default"
			class="h-7 w-7 p-0 text-xs"
			disabled={gidouilles < amount}
			onclick={() => onUpdateGidouilles(student.id, -amount, getStudentDisplayName())}
		>
			-
		</Button>
		<input
			type="number"
			min="1"
			step="1"
			bind:value={amountInput}
			aria-label="Quantite de gidouilles a ajouter ou retirer"
			class="h-7 w-12 rounded-md border border-border bg-background px-1 text-center text-xs tabular-nums shadow-sm transition-all duration-200 outline-none [-moz-appearance:textfield] hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/30 dark:bg-card [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
		/>
		<Button
			size="sm"
			variant="default"
			class="h-7 w-7 p-0 text-xs"
			onclick={() => onUpdateGidouilles(student.id, amount, getStudentDisplayName())}
		>
			+
		</Button>
	</div>

	<!-- SEPARATOR -->
	<div class="mx-1 h-8 w-px bg-border"></div>

	<!-- BONUS COUNTER -->
	<div class="flex items-center justify-end gap-1.5">
		<Star class="h-5 w-5 flex-shrink-0 fill-amber-400 text-amber-400" />
		<span class="text-lg font-bold text-foreground tabular-nums">
			{bonus}
		</span>
	</div>

	<!-- BONUS +/- BUTTONS -->
	<div class="flex flex-shrink-0 items-center gap-1">
		<Button
			size="sm"
			variant="default"
			class="h-7 w-7 p-0 text-xs"
			disabled={bonus < 1}
			onclick={() => onUpdateBonus(student.id, -1, getStudentDisplayName())}
		>
			-
		</Button>
		<Button
			size="sm"
			variant="default"
			class="h-7 w-7 p-0 text-xs"
			onclick={() => onUpdateBonus(student.id, 1, getStudentDisplayName())}
		>
			+
		</Button>
	</div>

	<!-- SEPARATOR -->
	<div class="mx-1 h-8 w-px bg-border"></div>

	<!-- VIP CARD BUTTONS -->
	<div class="flex flex-shrink-0 items-center gap-1.5">
		<!-- View VIP Cards Button -->
		<Button size="sm" variant="outline" class="gap-1" onclick={() => onViewVipCards(student)}>
			<Eye class="h-4 w-4" />
			<span class="hidden sm:inline">Voir Cartes</span>
		</Button>

		<!-- Award VIP Card Button -->
		<Button
			onclick={() => onAwardVipCard(student)}
			size="sm"
			variant="default"
			class="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
			disabled={!canAffordVipCard(gidouilles)}
		>
			<Sparkles class="h-4 w-4" />
			<span class="hidden sm:inline">Carte VIP</span>
			<span class="text-xs opacity-80"
				>(3 <img src={gidouilleImg} alt="gidouille" class="inline h-3 w-3" />)</span
			>
		</Button>

		<!-- Grant Specific VIP Card Button (only in add mode) -->
		{#if filterMode === 'add' && selectedCardFilter}
			{@const card = getTemplateById(selectedCardFilter, $vipCardTemplates)}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						size="sm"
						variant="outline"
						class="h-7 w-7 p-0"
						onclick={() => onGrantVipCard(student.id)}
						disabled={grantingCard === student.id}
					>
						{#if grantingCard === student.id}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Plus class="h-4 w-4" />
						{/if}
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Offrir carte "{card?.name || selectedCardFilter}"</p>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	</div>
</div>
