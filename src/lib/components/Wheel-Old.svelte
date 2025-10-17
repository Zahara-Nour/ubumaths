<script lang="ts">
	import marker from '$lib/images/marker.png';
	import { onMount } from 'svelte';
	import type { TeacherProfile } from '../../../types/type.js';
	const radius = 18;
	let winner = '';

	export let data;
	export let names = [
		'a',
		'b',
		'c',
		'd',
		'e',
		'f',
		'g',
		'h',
		'i',
		'j',
		'k',
		'l',
		'm',
		'n',
		'o',
		'p',
		'q',
		'r',
		's',
		'u',
		'v',
		'w',
		'x',
		'y'
	];

	const teacher = data.userProfile as TeacherProfile;
	const classe_ids = teacher.classe_ids;
	const classes = teacher.classes;
	const studentsByClasseId = teacher.students;

	let deg = 0;
	let spinning = false;
	let wheel: SVGElement;
	let selectedClass = classes[0];

	onMount(() => {
		wheel.style.transform = 'rotate(-90deg)';
	});

	$: {
		names = studentsByClasseId[selectedClass.id]
			.map((student) => student.firstname)
			.filter((name) => !name.includes('test'));
		if (names.length % 2 !== 0) {
			names.push('Joker');
		}
	}

	$: size = names.length;
	$: piece_angle = (2 * Math.PI) / size;

	function onTransitionEnd() {
		spinning = false;
		wheel.style.transition = 'none';
		deg = deg % 360;
		wheel.style.transform = `rotate(-${deg + 90}deg)`;
	}
</script>

<div class="flex items-end gap-2">
	<label class="label max-w-xs">
		<span>Classe</span>
		<select class="select" bind:value={selectedClass}>
			{#each classes as classe}
				<option value={classe}>{classe.name}</option>
			{/each}
		</select>
	</label>
	<button
		disabled={spinning}
		class="btn variant-filled-primary"
		on:click={() => {
			let number;
			do {
				number = Math.floor(Math.random() * 360) + 1;
			} while (number % Math.floor(360 / size) < 2);

			// const number = Math.floor(Math.random() * 360) + 1
			// const number = 45
			console.log('number', number);
			deg = 360 * 9 + number;
			winner = names[Math.floor((number * size) / 360)];
			console.log('winner', winner);
			wheel.style.transition = 'all 4s ease-out';
			wheel.style.transform = `rotate(-${deg + 90}deg)`;
			spinning = true;
		}}
	>
		spin
	</button>
</div>

<div class="mt-6 flex flex-col items-center">
	<div class="relative inline-block">
		{#if size % 2 === 0}
			<svg
				bind:this={wheel}
				on:transitionend={onTransitionEnd}
				class="spin"
				class:blur={spinning}
				height="{2 * radius + 3}em"
				width="{2 * radius + 3}em"
			>
				<defs>
					<filter id="shadow">
						<feDropShadow dx="0" dy="0" stdDeviation="10" />
					</filter>
					<filter id="shadow2">
						<feDropShadow dx="0" dy="0" stdDeviation="5" />
					</filter>
				</defs>
				<circle r="{radius}em" cx="50%" cy="50%" fill="#e7c9de" />
				<circle
					r="{radius / 2}em"
					cx="50%"
					cy="50%"
					fill="transparent"
					stroke="#3a507e"
					stroke-width="{radius}em"
					stroke-dasharray="{(piece_angle * radius) / 2}em {(piece_angle * radius) / 2}em"
				/>
				<circle
					r="{radius - 1}em"
					cx="50%"
					cy="50%"
					fill="transparent"
					stroke="#788bb2"
					stroke-width="2em"
					filter="url(#shadow)"
				/>
				<circle r="3em" cx="50%" cy="50%" fill="#788bb2" />
				<circle
					r="3em"
					cx="50%"
					cy="50%"
					fill="transparent"
					stroke="#f9ef69"
					stroke-width="0.5em"
					filter="url(#shadow2)"
				/>
				{#each Array(size * 3).fill(0) as _, i}
					<circle
						r="0.1em"
						cx="{2 * radius + 0.5}em"
						cy="50%"
						fill="#f9ef69"
						stroke="#f9ef69"
						stroke-width="0.5em"
						transform-origin="50% 50%"
						transform="rotate({(i * 360) / (size * 3)} )"
					/>
				{/each}
				{#each names as name, i}
					<text
						fill="white"
						font-weight="bold"
						font-size="1em"
						x="{(3 / 4) * (2 * radius + 3)}em"
						y="50%"
						text-anchor="middle"
						dominant-baseline="middle"
						transform-origin="50% 50%"
						transform="rotate({((i + 1 / 2) * 360) / size} )">{name}</text
					>
				{/each}
			</svg>
		{:else}
			ruie
		{/if}
		<span class="absolute top-0 left-1/2" style="translate:-50% 0;">
			<img alt="marker" src={marker} />
		</span>
	</div>
</div>

<style>
	.blur {
		animation: blur 4s;
	}

	@keyframes blur {
		0% {
			filter: blur(0px);
		}
		10% {
			filter: blur(1px);
		}
		90% {
			filter: blur(0px);
		}
		100% {
			filter: blur(0px);
		}
	}
</style>
