<!--
	D6 Dice Model (Cube)

	Renders a 6-sided die using Threlte.
	Most common dice type (standard cube).
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
		rotation = [0, 0, 0] as Vector3Tuple,
		rigidBodyRef = $bindable(undefined)
	}: {
		style: DiceStyleConfig;
		size?: number;
		position?: Vector3Tuple;
		rotation?: Vector3Tuple;
		rigidBodyRef?: RapierRigidBody | undefined;
	} = $props();

	// Internal rigid body reference
	let rbRef: RapierRigidBody | undefined = $state(undefined);

	// Sync internal ref with bindable prop
	$effect(() => {
		rigidBodyRef = rbRef;
	});

	// Get D6 geometry data
	const geometryData = getDiceGeometry('d6');

	// Create Three.js geometry from vertices and indices
	const geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array(geometryData.vertices);
	const indices = new Uint16Array(geometryData.indices);

	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	// Scale geometry
	const scaledSize = size * geometryData.scale;

	// Face numbers for D6
	const faceNumbers = [1, 6, 2, 5, 3, 4];

	// Calculate font size based on die size
	const fontSize = scaledSize * 0.6;
</script>

<!-- RigidBody for physics simulation -->
<RigidBody
	bind:rigidBody={rbRef}
	type="dynamic"
	{position}
	linearDamping={0.5}
	angularDamping={0.5}
>
	<!-- AutoColliders with cuboid shape for D6 (most efficient for cubes) -->
	<AutoColliders shape="cuboid" restitution={0.3} friction={0.8}>
		<!-- Die body -->
		<T.Mesh {geometry} scale={scaledSize} castShadow receiveShadow>
			<T.MeshStandardMaterial
				color={style.baseColor}
				metalness={style.metalness ?? 0.1}
				roughness={style.roughness ?? 0.6}
				emissive={style.emissive ?? '#000000'}
				emissiveIntensity={style.emissiveIntensity ?? 0}
			/>
		</T.Mesh>
	</AutoColliders>

	<!-- Numbers on each face (outside AutoColliders but inside RigidBody) -->
	{#each geometryData.faceNormals as faceNormal, index (index)}
		{@const transform = getFaceTransform(faceNormal, scaledSize, 0.02)}
		<Text
			text={String(faceNumbers[index])}
			position={transform.position}
			rotation={transform.rotation}
			fontSize={fontSize}
			color={style.numberColor}
			anchorX="center"
			anchorY="middle"
		/>
	{/each}
</RigidBody>
