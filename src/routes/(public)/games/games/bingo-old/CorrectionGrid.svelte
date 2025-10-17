<script lang="ts">
	import Tile from './Tile.svelte'
	export let availables: number[]

	type Cell = {
		n: number
		status: string
	}

	type Position = {
		i: number
		j: number
	}

	type Grid = Cell[][]

	const grid: Grid = []

	initGrid()
	function initGrid() {
		for (let i = 0; i < 10; i++) {
			// rows
			grid[i] = []
			for (let j = 0; j < 9; j++) {
				grid[i][j] = {
					status: '',
					n: 10 * j + i + 1,
				}
			}
		}
	}
	$: console.log('availables', availables)
</script>

<div class="flex flex-col items-center">
	<div class="my-6 grid w-max grid-cols-9 gap-4">
		{#each grid as row, i}
			{#each row as cell, j}
				<Tile n={cell.n} selected={!availables.includes(cell.n)} />
			{/each}
		{/each}
	</div>
</div>
