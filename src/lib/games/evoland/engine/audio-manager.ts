/**
 * Evoland Audio Manager
 *
 * Handles sound effects and music using Web Audio API.
 * Based on the original sound system from Evoland.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base path for sound files */
export const SOUND_BASE_PATH = '/games/evoland/sounds';

/** Available sound effects in Evoland */
export const SoundEffect = {
	FIREBALL: 'fireball',
	FIREHIT: 'firehit',
	GAMEOVER: 'gameover',
	HIT: 'hit',
	KILL: 'kill',
	LEVELUP: 'levelup',
	NOTSURE: 'notsure',
	NPC: 'npc',
	PII: 'pii',
	PRINCESS: 'princess',
	PUZZLE: 'puzzle',
	SAVE: 'save',
	SWORD: 'sword',
	WALK: 'walk',
	WORLD_REMOVE: 'world_remove'
} as const;

export type SoundEffect = (typeof SoundEffect)[keyof typeof SoundEffect];

/** All sound effect names for preloading */
export const ALL_SOUNDS: readonly SoundEffect[] = Object.values(SoundEffect);

// ============================================================================
// TYPES
// ============================================================================

/**
 * Audio manager configuration options.
 */
export interface AudioManagerOptions {
	/** Base path for sound files (default: /games/evoland/sounds) */
	readonly basePath?: string;
	/** Master volume (0-1, default: 1) */
	readonly masterVolume?: number;
	/** Sound effects volume (0-1, default: 1) */
	readonly sfxVolume?: number;
	/** Music volume (0-1, default: 0.7) */
	readonly musicVolume?: number;
	/** Whether to prefer OGG over MP3 (default: auto-detect) */
	readonly preferOgg?: boolean;
}

/**
 * Cached audio buffer for a sound.
 */
interface CachedSound {
	readonly buffer: AudioBuffer;
	readonly name: string;
}

// ============================================================================
// AUDIO MANAGER CLASS
// ============================================================================

/**
 * Audio manager for sound effects and music.
 *
 * Features:
 * - Web Audio API for low-latency playback
 * - Preloading of all sounds
 * - Volume control (master, sfx, music)
 * - Polyphonic sound effects (multiple simultaneous)
 * - Music looping with crossfade support
 * - Fallback to MP3 if OGG not supported
 *
 * @example
 * ```typescript
 * const audio = new AudioManager();
 * await audio.preloadAll();
 *
 * // Play sound effect
 * audio.play(SoundEffect.SWORD);
 *
 * // Adjust volume
 * audio.setMasterVolume(0.5);
 * ```
 */
export class AudioManager {
	private context: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private sfxGain: GainNode | null = null;
	private musicGain: GainNode | null = null;

	private sounds: Map<string, CachedSound> = new Map();
	private currentMusic: AudioBufferSourceNode | null = null;

	private basePath: string;
	private masterVolume: number;
	private sfxVolume: number;
	private musicVolume: number;
	private preferOgg: boolean;

	private initialized: boolean = false;
	private muted: boolean = false;

	/**
	 * Create a new audio manager.
	 * @param options - Configuration options
	 */
	constructor(options: AudioManagerOptions = {}) {
		this.basePath = options.basePath ?? SOUND_BASE_PATH;
		this.masterVolume = options.masterVolume ?? 1;
		this.sfxVolume = options.sfxVolume ?? 1;
		this.musicVolume = options.musicVolume ?? 0.7;
		this.preferOgg = options.preferOgg ?? this.detectOggSupport();
	}

	/**
	 * Initialize the audio context.
	 * Must be called after a user interaction (click/touch) due to browser autoplay policies.
	 */
	async init(): Promise<void> {
		if (this.initialized) return;

		try {
			// Create audio context
			this.context = new (window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

			// Create gain nodes for volume control
			this.masterGain = this.context.createGain();
			this.sfxGain = this.context.createGain();
			this.musicGain = this.context.createGain();

			// Connect: sfx/music -> master -> destination
			this.sfxGain.connect(this.masterGain);
			this.musicGain.connect(this.masterGain);
			this.masterGain.connect(this.context.destination);

			// Apply initial volumes
			this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
			this.sfxGain.gain.value = this.sfxVolume;
			this.musicGain.gain.value = this.musicVolume;

			this.initialized = true;
		} catch (error) {
			console.warn('AudioManager: Failed to initialize Web Audio API', error);
		}
	}

	/**
	 * Preload all sound effects.
	 * @returns Promise that resolves when all sounds are loaded
	 */
	async preloadAll(): Promise<void> {
		if (!this.initialized) {
			await this.init();
		}

		const loadPromises = ALL_SOUNDS.map((name) => this.loadSound(name));
		await Promise.all(loadPromises);
	}

	/**
	 * Preload specific sounds.
	 * @param names - Array of sound names to preload
	 */
	async preload(names: readonly SoundEffect[]): Promise<void> {
		if (!this.initialized) {
			await this.init();
		}

		const loadPromises = names.map((name) => this.loadSound(name));
		await Promise.all(loadPromises);
	}

	/**
	 * Load a single sound file.
	 * @param name - Sound name (without extension)
	 */
	private async loadSound(name: string): Promise<void> {
		if (this.sounds.has(name) || !this.context) return;

		const ext = this.preferOgg ? 'ogg' : 'mp3';
		const url = `${this.basePath}/${name}.${ext}`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const arrayBuffer = await response.arrayBuffer();
			const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

			this.sounds.set(name, {
				buffer: audioBuffer,
				name
			});
		} catch (error) {
			// Try fallback format
			if (this.preferOgg) {
				try {
					const fallbackUrl = `${this.basePath}/${name}.mp3`;
					const response = await fetch(fallbackUrl);
					if (response.ok) {
						const arrayBuffer = await response.arrayBuffer();
						const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
						this.sounds.set(name, { buffer: audioBuffer, name });
						return;
					}
				} catch {
					// Ignore fallback failure
				}
			}
			console.warn(`AudioManager: Failed to load sound "${name}"`, error);
		}
	}

	/**
	 * Play a sound effect.
	 * @param name - Sound name to play
	 * @param volume - Optional volume multiplier (0-1)
	 * @returns AudioBufferSourceNode or null if sound not loaded
	 */
	play(name: SoundEffect, volume: number = 1): AudioBufferSourceNode | null {
		if (!this.context || !this.sfxGain || this.muted) return null;

		const cached = this.sounds.get(name);
		if (!cached) {
			console.warn(`AudioManager: Sound "${name}" not loaded`);
			return null;
		}

		// Create source node
		const source = this.context.createBufferSource();
		source.buffer = cached.buffer;

		// Create individual gain for this sound
		const gainNode = this.context.createGain();
		gainNode.gain.value = volume;

		// Connect: source -> gain -> sfxGain
		source.connect(gainNode);
		gainNode.connect(this.sfxGain);

		// Play
		source.start(0);

		return source;
	}

	/**
	 * Play a sound as music (with looping).
	 * @param name - Sound name to play
	 * @param loop - Whether to loop (default: true)
	 */
	playMusic(name: SoundEffect, loop: boolean = true): void {
		if (!this.context || !this.musicGain) return;

		// Stop current music
		this.stopMusic();

		const cached = this.sounds.get(name);
		if (!cached) {
			console.warn(`AudioManager: Music "${name}" not loaded`);
			return;
		}

		// Create source node
		this.currentMusic = this.context.createBufferSource();
		this.currentMusic.buffer = cached.buffer;
		this.currentMusic.loop = loop;

		// Connect to music gain
		this.currentMusic.connect(this.musicGain);

		// Play
		this.currentMusic.start(0);
	}

	/**
	 * Stop currently playing music.
	 */
	stopMusic(): void {
		if (this.currentMusic) {
			try {
				this.currentMusic.stop();
			} catch {
				// Ignore if already stopped
			}
			this.currentMusic.disconnect();
			this.currentMusic = null;
		}
	}

	/**
	 * Set master volume.
	 * @param volume - Volume level (0-1)
	 */
	setMasterVolume(volume: number): void {
		this.masterVolume = Math.max(0, Math.min(1, volume));
		if (this.masterGain && !this.muted) {
			this.masterGain.gain.value = this.masterVolume;
		}
	}

	/**
	 * Set sound effects volume.
	 * @param volume - Volume level (0-1)
	 */
	setSfxVolume(volume: number): void {
		this.sfxVolume = Math.max(0, Math.min(1, volume));
		if (this.sfxGain) {
			this.sfxGain.gain.value = this.sfxVolume;
		}
	}

	/**
	 * Set music volume.
	 * @param volume - Volume level (0-1)
	 */
	setMusicVolume(volume: number): void {
		this.musicVolume = Math.max(0, Math.min(1, volume));
		if (this.musicGain) {
			this.musicGain.gain.value = this.musicVolume;
		}
	}

	/**
	 * Get current master volume.
	 */
	getMasterVolume(): number {
		return this.masterVolume;
	}

	/**
	 * Get current SFX volume.
	 */
	getSfxVolume(): number {
		return this.sfxVolume;
	}

	/**
	 * Get current music volume.
	 */
	getMusicVolume(): number {
		return this.musicVolume;
	}

	/**
	 * Mute all audio.
	 */
	mute(): void {
		this.muted = true;
		if (this.masterGain) {
			this.masterGain.gain.value = 0;
		}
	}

	/**
	 * Unmute all audio.
	 */
	unmute(): void {
		this.muted = false;
		if (this.masterGain) {
			this.masterGain.gain.value = this.masterVolume;
		}
	}

	/**
	 * Toggle mute state.
	 */
	toggleMute(): void {
		if (this.muted) {
			this.unmute();
		} else {
			this.mute();
		}
	}

	/**
	 * Check if audio is muted.
	 */
	isMuted(): boolean {
		return this.muted;
	}

	/**
	 * Check if audio is initialized.
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Check if a sound is loaded.
	 * @param name - Sound name to check
	 */
	isLoaded(name: SoundEffect): boolean {
		return this.sounds.has(name);
	}

	/**
	 * Resume audio context if suspended (browser autoplay policy).
	 */
	async resume(): Promise<void> {
		if (this.context?.state === 'suspended') {
			await this.context.resume();
		}
	}

	/**
	 * Suspend audio context to save resources.
	 */
	async suspend(): Promise<void> {
		if (this.context?.state === 'running') {
			await this.context.suspend();
		}
	}

	/**
	 * Clean up and release resources.
	 */
	destroy(): void {
		this.stopMusic();

		if (this.context) {
			this.context.close();
			this.context = null;
		}

		this.masterGain = null;
		this.sfxGain = null;
		this.musicGain = null;
		this.sounds.clear();
		this.initialized = false;
	}

	/**
	 * Detect if browser supports OGG audio.
	 */
	private detectOggSupport(): boolean {
		if (typeof Audio === 'undefined') return false;

		const audio = new Audio();
		return audio.canPlayType('audio/ogg; codecs="vorbis"') !== '';
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create an audio manager for Evoland.
 * @returns AudioManager instance
 */
export function createAudioManager(): AudioManager {
	return new AudioManager({
		basePath: SOUND_BASE_PATH,
		masterVolume: 1,
		sfxVolume: 1,
		musicVolume: 0.7
	});
}

/**
 * Initialize audio on first user interaction.
 * Call this to ensure audio works with browser autoplay policies.
 *
 * @param audio - AudioManager instance
 * @param element - Element to attach click handler to (default: document)
 */
export function initAudioOnInteraction(
	audio: AudioManager,
	element: EventTarget = document
): () => void {
	const handler = async () => {
		if (!audio.isInitialized()) {
			await audio.init();
			await audio.resume();
		}
		element.removeEventListener('click', handler);
		element.removeEventListener('touchstart', handler);
	};

	element.addEventListener('click', handler, { once: true });
	element.addEventListener('touchstart', handler, { once: true });

	// Return cleanup function
	return () => {
		element.removeEventListener('click', handler);
		element.removeEventListener('touchstart', handler);
	};
}
