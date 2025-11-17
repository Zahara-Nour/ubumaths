<!--
	D20 Dice Model (Icosahedron)

	Renders a 20-sided die using Threlte.
	Icosahedron shape - the iconic RPG die.
-->
<script lang="ts">
	import { T } from '@threlte/core';
	import { Text } from '@threlte/extras';
	import { RigidBody, AutoColliders } from '@threlte/rapier';
	import { getDiceGeometry, getFaceTransform } from '../utils/dice-geometry';
	import type { DiceStyleConfig } from '../types';
	import type { Vector3Tuple } from 'three';
	import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
	import * as THREE from 'three';

	// Props
	let {
		style,
		size = 1,
		position = [0, 0, 0] as Vector3Tuple,
		rotation: _rotation = [0, 0, 0] as Vector3Tuple,
		rigidBodyRef = $bindable(undefined)
	}: {
		style: DiceStyleConfig;
		size?: number;
		position?: Vector3Tuple;
		rotation?: Vector3Tuple;
		rigidBodyRef?: RapierRigidBody | undefined;
	} = $props();

	// Internal rigid body reference (use .raw() for 3D objects to avoid proxy overhead)
	let rbRef: RapierRigidBody | undefined = $state.raw(undefined);

	// Sync internal ref with bindable prop
	$effect(() => {
		rigidBodyRef = rbRef;
	});

	// Use Three.js IcosahedronGeometry (D20)
	const geometry = new THREE.IcosahedronGeometry(1);

	// Get geometry data for face normals and scale
	const geometryData = getDiceGeometry('d20');
	const scaledSize = size * geometryData.scale;

	// Face numbers for D20 - must match faceValueMappings.d20 from dice-geometry.ts
	// Standard icosahedron mapping where opposite faces sum to 21
	const faceNumbers = [17, 3, 7, 1, 19, 16, 10, 15, 13, 9, 8, 12, 5, 11, 6, 20, 2, 18, 4, 14];

	// Calculate font size based on die size (smaller for many faces)
	const fontSize = scaledSize * 0.3;
</script>

<!-- RigidBody for physics simulation -->
<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.1}
	angularDamping={0.1}
>
	<!-- AutoColliders with convexHull shape for complex polyhedron -->
	<AutoColliders shape="convexHull" restitution={0.3} friction={0.8}>
		<!-- Die body -->
		<T.Mesh {geometry} scale={scaledSize} castShadow receiveShadow>
			<T.MeshStandardMaterial
				color={style.baseColor}
				metalness={style.metalness ?? 0.1}
				roughness={style.roughness ?? 0.6}
				emissive={style.emissive ?? '#000000'}
				emissiveIntensity={style.emissiveIntensity ?? 0}
				side={THREE.DoubleSide}
			/>
		</T.Mesh>
	</AutoColliders>

	<!-- Numbers on each face (outside AutoColliders but inside RigidBody) -->
	{#each geometryData.faceNormals as faceNormal, index (index)}
		{@const transform = getFaceTransform(faceNormal, scaledSize, geometryData.inradius, 0.005)}
		<Text
			text={String(faceNumbers[index])}
			position={transform.position}
			rotation={transform.rotation}
			{fontSize}
			color={style.numberColor}
			anchorX="center"
			anchorY="middle"
		/>
	{/each}
</RigidBody>
