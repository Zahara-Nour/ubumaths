<!--
	D10 Dice Model (Pentagonal Trapezohedron)

	Renders a 10-sided die using Threlte.
	Pentagonal trapezohedron shape (numbered 0-9 or 1-10).
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

	// Get D10 geometry data
	const geometryData = getDiceGeometry('d10');

	// Create Three.js geometry from vertices and indices
	const geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array(geometryData.vertices);
	const indices = new Uint16Array(geometryData.indices);

	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	geometry.setIndex(new THREE.BufferAttribute(indices, 1));
	geometry.computeVertexNormals();

	// Scale geometry
	const scaledSize = size * geometryData.scale;

	// Face numbers for D10 - must match faceValueMappings.d10 from dice-geometry.ts
	// Standard RPG D10: face 9 shows "0" (can represent 10 in d100 rolls)
	const faceNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

	// Calculate font size based on die size
	const fontSize = scaledSize * 0.45;
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
		{@const transform = getFaceTransform(faceNormal, scaledSize, 0.02)}
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
