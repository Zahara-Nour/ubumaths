<script>
	import {
		mdiProjectorScreen,
		mdiRocketLaunchOutline,
		mdiHelp,
		mdiBasketPlus,
		mdiBasket,
		mdiLink,
		mdiTrashCanOutline,
		mdiRunFast,
		mdiFlash,
		mdiNewspaperVariantOutline
	} from '@mdi/js'
	import Fab from '@smui/fab'
	import Badge from '@smui-extra/badge'
	import { Icon, Svg } from '@smui/common'

	export let showBasket
	export let basket
	export let copyLink
	export let fillBasket
	export let launchTest
	export let classroom
	export let flash
	export let displayExemple
	export let flushBasket
	export let courseAuxNombres
	export let generateExoLatex

	const toggleExemple = () => (displayExemple = !displayExemple)
	const toggleBasket = () => (showBasket = !showBasket)
	const toggleClassroom = () => (classroom = !classroom)
	const toggleFlash = () => (flash = !flash)
	const toggleCourseAuxNombres = () => (courseAuxNombres = !courseAuxNombres)

	// $: isLoggedIn = $user.id != 'guest'
	// $: isTeacher = isLoggedIn && $user.roles.includes('teacher')
	// $: isStudent = isLoggedIn && $user.roles.includes('student')
</script>

<div class="py-3 flex" style="{'position:sticky;top:0px;z-index:10; background:var(--mdc-theme-background)'}">
	<div class="grow"></div>

		<Fab class="mx-1" color="secondary" on:click="{copyLink}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiLink}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="secondary" on:click="{generateExoLatex}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiNewspaperVariantOutline}"></path>
			</Icon>
		</Fab>

		
		<Fab class="mx-1" color="{courseAuxNombres ? 'primary' : 'secondary'}" on:click="{toggleCourseAuxNombres}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiRunFast}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="{classroom ? 'primary' : 'secondary'}" on:click="{toggleClassroom}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiProjectorScreen}"></path>
			</Icon>
		</Fab>
		<Fab class="mx-1" color="{flash ? 'primary' : 'secondary'}" on:click="{toggleFlash}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiFlash}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="{displayExemple ? 'primary' : 'secondary'}" on:click="{toggleExemple}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiHelp}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="secondary" on:click="{fillBasket}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiBasketPlus}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="secondary" on:click="{flushBasket}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiTrashCanOutline}"></path>
			</Icon>
		</Fab>

		<Fab class="mx-1" color="{showBasket ? 'primary' : 'secondary'}" on:click="{toggleBasket}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiBasket}"></path>
			</Icon>
      {#if basket.length}
				<Badge aria-label="items number in basket">
					{basket.reduce((acc, item) => acc + item.count, 0)}
				</Badge>
			{/if}
		</Fab>

		<Fab class="mx-1" color="secondary" on:click="{launchTest}" mini>
			<Icon component="{Svg}" viewBox="2 2 20 20">
				<path fill="currentColor" d="{mdiRocketLaunchOutline}"></path>
			</Icon>
		</Fab>

</div>
