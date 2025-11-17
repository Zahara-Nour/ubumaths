<!--
	D4 Dice Model (Tetrahedron)

	Renders a 4-sided die using Threlte.
	Uses custom geometry with physics-enabled mesh.
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

	// Use Three.js TetrahedronGeometry (D4)
	const geometry = new THREE.TetrahedronGeometry(1);

	// Get geometry data for face normals and scale
	const geometryData = getDiceGeometry('d4');
	const scaledSize = size * geometryData.scale;

	// Face numbers for D4
	const faceNumbers = [1, 2, 3, 4];

	// Calculate font size based on die size
	const fontSize = scaledSize * 0.5;
</script>

<!-- RigidBody for physics simulation -->
<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.4}
	angularDamping={0.4}
>
	<!-- AutoColliders with convexHull shape for complex polyhedron -->
	<AutoColliders shape="convexHull" restitution={0.15} friction={1.2}>
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
