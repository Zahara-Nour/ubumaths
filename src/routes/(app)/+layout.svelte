<script>
	import { mdc_colors } from '$lib/colors'
	import links from '$lib/navlinks.js'
	import TopAppBar, { Row, Section, Title as TitleBar } from '@smui/top-app-bar'
	import IconButton from '@smui/icon-button'
	import { Icon, Svg } from '@smui/common'
	import List, { Item, Text } from '@smui/list'
	import Drawer, {
		AppContent,
		Content,
		Header,
		Title,
		Subtitle,
		Scrim,
	} from '@smui/drawer'
	import {
		mdiLogin,
		mdiLogout,
		mdiFormatFontSizeDecrease,
		mdiFormatFontSizeIncrease,
	} from '@mdi/js'
	import {
		darkmode,
		fontSize,
	} from '$lib/stores'
	import { getLogger } from '$lib/utils'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { get } from 'svelte/store'

	let { info, fail, warn } = getLogger('Layout', 'info')
	let active = links[0].text

	let prominent = false
	let dense = false
	let secondaryColor = false
	let miniWindow = false
	let showDrawer = false
	const setMiniWindow = () => (miniWindow = window.innerWidth < 720)
	const toggleDrawer = () => {
		showDrawer = !showDrawer
	}
	const switchTheme = () => darkmode.update((mode) => !mode)
	const setActive = (value) => {
		active = value
		showDrawer = false
	}


	onMount(() => {
		setMiniWindow()
	})

	function increase() {
		const newSize = get(fontSize) + 1
		fontSize.set(newSize)
		document.getElementsByTagName('html')[0].style.fontSize = `${newSize}px`
	}

	function decrease() {
		const newSize = get(fontSize) - 1
		fontSize.set(newSize)
		document.getElementsByTagName('html')[0].style.fontSize = `${newSize}px`
	}
</script>

<svelte:window on:resize="{setMiniWindow}" />
<!-- <svelte:window on:resize="{setMiniWindow}" on:keydown="{$handleKeydown}" /> -->
<svelte:head>
	{#if $darkmode}
	<!-- je ne comprends pas pourquoi il faut mettre les 2 -->
	<!-- problèmes de style sinon -->
		<!-- SMUI Styles -->
		<link rel="stylesheet" href="/smui-dark.css" />
		<!-- Site Styles -->
		<link rel="stylesheet" href="/site-dark.css" />
	{:else}
		<!-- SMUI Styles -->
		<link rel="stylesheet" href="/smui.css" />
		<!-- Site Styles -->
		<link rel="stylesheet" href="/site.css" />
	{/if}
</svelte:head>

<Drawer variant="modal" bind:open="{showDrawer}">
	<Header>
		<TitleBar>Ubumaths</TitleBar>
		<Subtitle>Les maths de la chandelle verte</Subtitle>
	</Header>
	<Content>
		<List>
			{#each links as link}
				<Item
					href="javascript:void(0)"
					on:click="{() => {
						setActive(link.text)
						goto(`${link.url}`)
					}}"
					activated="{active === link.text}"
				>
					<Text>{link.text}</Text>
				</Item>
			{/each}
		</List>
	</Content>
</Drawer>

<Scrim />
<AppContent class="app-content">
	<TopAppBar
		variant="static"
		prominent="{prominent}"
		dense="{dense}"
		color="{secondaryColor ? 'secondary' : 'primary'}"
	>
		<Row>
			<Section>
				<TitleBar>
					<a href="/">UbuMaths</a>
				</TitleBar>
			</Section>
			<Section>
				{#if !miniWindow}
					<div>
						{#each links as link}
							<a class="mx-2" href="{link.url}">{link.text}</a>
						{/each}
					</div>
				{/if}
			</Section>
			<Section align="end" toolbar>
				<IconButton on:click="{decrease}">
					<Icon component="{Svg}" viewBox="0 0 24 24">
						<path fill="currentColor" d="{mdiFormatFontSizeDecrease}"></path>
					</Icon>
				</IconButton>
				<IconButton on:click="{increase}">
					<Icon component="{Svg}" viewBox="0 0 24 24">
						<path fill="currentColor" d="{mdiFormatFontSizeIncrease}"></path>
					</Icon>
				</IconButton>

				{#if $darkmode}
					<IconButton
						class="material-icons"
						aria-label="Switch to light mode"
						on:click="{switchTheme}">light_mode</IconButton
					>
				{:else}
					<IconButton
						class="material-icons"
						aria-label="switch to dark mode"
						on:click="{switchTheme}">dark_mode</IconButton
					>
				{/if}
				<!-- {#if $connected}
					<IconButton on:click="{signOut}">
						<Icon component="{Svg}" viewBox="0 0 24 24">
							<path fill="currentColor" d="{mdiLogout}"></path>
						</Icon>
					</IconButton>
				{:else}
					<IconButton on:click="{signInWithGoogle}">
						<Icon component="{Svg}" viewBox="0 0 24 24">
							<path fill="currentColor" d="{mdiLogin}"></path>
						</Icon>
					</IconButton>
				{/if} -->
				{#if miniWindow}
					<IconButton on:click="{toggleDrawer}" class="material-icons"
						>menu
					</IconButton>
				{/if}
			</Section>
		</Row>
	</TopAppBar>
	<!-- <div p-2> -->
	<!-- <div style="overflow:auto;"> -->
	<div style="min-height: calc(100vh - 144px);">
		<!-- to remove extra margin from child -->
		<div style="height:1px"></div>
		<slot />
		<div style="height:1px"></div>
	</div>
	<div style="{`width:100vw;height:80px;background:${mdc_colors['grey-200']}`}">
		<div class="h-full p-2 flex items-center justify-between">
			<a
				rel="noreferrer"
				style="height:100%"
				target="_blank"
				href="https://www.lyceevoltaire.org/"
			>
				<img
					height="100%"
					alt="logo lycée voltaire"
					src="/images/logo-voltaire.png"
				/>
			</a>
			<span style="color:var(--mdc-theme-secondary)">D. Le Jolly</span>
		</div>
	</div>
</AppContent>

