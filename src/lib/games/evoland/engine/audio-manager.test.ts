/**
 * Tests for Evoland Audio Manager
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	AudioManager,
	SoundEffect,
	ALL_SOUNDS,
	SOUND_BASE_PATH,
	createAudioManager,
	initAudioOnInteraction
} from './audio-manager';

// Mock AudioContext
class MockAudioContext {
	state: 'running' | 'suspended' = 'running';
	destination = {};

	createGain(): MockGainNode {
		return new MockGainNode();
	}

	createBufferSource(): MockBufferSourceNode {
		return new MockBufferSourceNode();
	}

	async decodeAudioData(): Promise<MockAudioBuffer> {
		return new MockAudioBuffer();
	}

	async resume(): Promise<void> {
		this.state = 'running';
	}

	async suspend(): Promise<void> {
		this.state = 'suspended';
	}

	close(): void {
		// no-op
	}
}

class MockGainNode {
	gain = { value: 1 };
	connect(): void {}
	disconnect(): void {}
}

class MockBufferSourceNode {
	buffer: MockAudioBuffer | null = null;
	loop = false;

	connect(): void {}
	disconnect(): void {}
	start(): void {}
	stop(): void {}
}

class MockAudioBuffer {
	duration = 1;
	length = 44100;
	numberOfChannels = 2;
	sampleRate = 44100;
}

describe('SoundEffect constants', () => {
	it('should have all expected sound effects', () => {
		expect(SoundEffect.FIREBALL).toBe('fireball');
		expect(SoundEffect.HIT).toBe('hit');
		expect(SoundEffect.SWORD).toBe('sword');
		expect(SoundEffect.WALK).toBe('walk');
		expect(SoundEffect.LEVELUP).toBe('levelup');
		expect(SoundEffect.GAMEOVER).toBe('gameover');
		expect(SoundEffect.SAVE).toBe('save');
	});

	it('should have 15 sound effects in ALL_SOUNDS', () => {
		expect(ALL_SOUNDS).toHaveLength(15);
	});

	it('should have correct base path', () => {
		expect(SOUND_BASE_PATH).toBe('/games/evoland/sounds');
	});
});

describe('AudioManager', () => {
	let audio: AudioManager;
	let originalAudioContext: typeof AudioContext;
	let originalAudio: typeof Audio;

	beforeEach(() => {
		// Save originals
		originalAudioContext = window.AudioContext;
		originalAudio = window.Audio;

		// Mock AudioContext
		window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

		// Mock Audio for OGG detection
		window.Audio = vi.fn().mockImplementation(() => ({
			canPlayType: vi.fn().mockReturnValue('maybe')
		})) as unknown as typeof Audio;

		// Mock fetch
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
		});

		audio = new AudioManager();
	});

	afterEach(() => {
		audio.destroy();
		window.AudioContext = originalAudioContext;
		window.Audio = originalAudio;
		vi.restoreAllMocks();
	});

	describe('initialization', () => {
		it('should not be initialized on creation', () => {
			expect(audio.isInitialized()).toBe(false);
		});

		it('should initialize on init()', async () => {
			await audio.init();
			expect(audio.isInitialized()).toBe(true);
		});

		it('should not initialize twice', async () => {
			await audio.init();
			await audio.init();
			// No error thrown
			expect(audio.isInitialized()).toBe(true);
		});
	});

	describe('volume control', () => {
		it('should set and get master volume', () => {
			audio.setMasterVolume(0.5);
			expect(audio.getMasterVolume()).toBe(0.5);
		});

		it('should clamp master volume to 0-1', () => {
			audio.setMasterVolume(-0.5);
			expect(audio.getMasterVolume()).toBe(0);

			audio.setMasterVolume(1.5);
			expect(audio.getMasterVolume()).toBe(1);
		});

		it('should set and get SFX volume', () => {
			audio.setSfxVolume(0.8);
			expect(audio.getSfxVolume()).toBe(0.8);
		});

		it('should set and get music volume', () => {
			audio.setMusicVolume(0.3);
			expect(audio.getMusicVolume()).toBe(0.3);
		});
	});

	describe('mute/unmute', () => {
		it('should mute audio', async () => {
			await audio.init();
			expect(audio.isMuted()).toBe(false);

			audio.mute();
			expect(audio.isMuted()).toBe(true);
		});

		it('should unmute audio', async () => {
			await audio.init();
			audio.mute();
			audio.unmute();
			expect(audio.isMuted()).toBe(false);
		});

		it('should toggle mute', async () => {
			await audio.init();
			audio.toggleMute();
			expect(audio.isMuted()).toBe(true);
			audio.toggleMute();
			expect(audio.isMuted()).toBe(false);
		});
	});

	describe('sound loading', () => {
		it('should not be loaded initially', () => {
			expect(audio.isLoaded(SoundEffect.SWORD)).toBe(false);
		});

		it('should load sounds on preload', async () => {
			await audio.preload([SoundEffect.SWORD]);
			expect(audio.isLoaded(SoundEffect.SWORD)).toBe(true);
		});

		it('should preload all sounds', async () => {
			await audio.preloadAll();
			expect(audio.isLoaded(SoundEffect.SWORD)).toBe(true);
			expect(audio.isLoaded(SoundEffect.HIT)).toBe(true);
		});
	});

	describe('play()', () => {
		it('should return null when not initialized', async () => {
			const result = audio.play(SoundEffect.SWORD);
			expect(result).toBeNull();
		});

		it('should return null when muted', async () => {
			await audio.init();
			await audio.preload([SoundEffect.SWORD]);
			audio.mute();

			const result = audio.play(SoundEffect.SWORD);
			expect(result).toBeNull();
		});

		it('should return null when sound not loaded', async () => {
			await audio.init();
			// Don't preload

			// Mock console.warn
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = audio.play(SoundEffect.SWORD);
			expect(result).toBeNull();

			warnSpy.mockRestore();
		});

		it('should play sound when loaded', async () => {
			await audio.init();
			await audio.preload([SoundEffect.SWORD]);

			const result = audio.play(SoundEffect.SWORD);
			expect(result).not.toBeNull();
		});
	});

	describe('music control', () => {
		it('should stop music without error', async () => {
			await audio.init();
			await audio.preload([SoundEffect.PRINCESS]);

			audio.playMusic(SoundEffect.PRINCESS);
			audio.stopMusic();
			// Verify no crash occurred
			expect(audio.isInitialized()).toBe(true);
		});
	});

	describe('context state', () => {
		it('should resume suspended context without error', async () => {
			await audio.init();
			await audio.suspend();
			await audio.resume();
			// Verify no crash occurred
			expect(audio.isInitialized()).toBe(true);
		});
	});

	describe('destroy()', () => {
		it('should clean up resources', async () => {
			await audio.init();
			await audio.preload([SoundEffect.SWORD]);

			audio.destroy();

			expect(audio.isInitialized()).toBe(false);
			expect(audio.isLoaded(SoundEffect.SWORD)).toBe(false);
		});
	});

	describe('options', () => {
		it('should accept custom base path', () => {
			const customAudio = new AudioManager({ basePath: '/custom/sounds' });
			// AudioManager should be created with custom path
			expect(customAudio).toBeInstanceOf(AudioManager);
			customAudio.destroy();
		});

		it('should respect initial volumes', () => {
			const customAudio = new AudioManager({
				masterVolume: 0.5,
				sfxVolume: 0.8,
				musicVolume: 0.3
			});

			expect(customAudio.getMasterVolume()).toBe(0.5);
			expect(customAudio.getSfxVolume()).toBe(0.8);
			expect(customAudio.getMusicVolume()).toBe(0.3);

			customAudio.destroy();
		});
	});
});

describe('createAudioManager', () => {
	it('should create an audio manager with default settings', () => {
		const audio = createAudioManager();
		expect(audio).toBeInstanceOf(AudioManager);
		expect(audio.getMasterVolume()).toBe(1);
		expect(audio.getSfxVolume()).toBe(1);
		expect(audio.getMusicVolume()).toBe(0.7);
		audio.destroy();
	});
});

describe('initAudioOnInteraction', () => {
	let audio: AudioManager;
	let originalAudioContext: typeof AudioContext;

	beforeEach(() => {
		originalAudioContext = window.AudioContext;
		window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
		audio = new AudioManager();
	});

	afterEach(() => {
		audio.destroy();
		window.AudioContext = originalAudioContext;
	});

	it('should attach click handler', () => {
		const element = document.createElement('div');
		const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

		initAudioOnInteraction(audio, element);

		expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), { once: true });
	});

	it('should attach touchstart handler', () => {
		const element = document.createElement('div');
		const addEventListenerSpy = vi.spyOn(element, 'addEventListener');

		initAudioOnInteraction(audio, element);

		expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), {
			once: true
		});
	});

	it('should return cleanup function', () => {
		const element = document.createElement('div');
		const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');

		const cleanup = initAudioOnInteraction(audio, element);
		cleanup();

		expect(removeEventListenerSpy).toHaveBeenCalled();
	});
});
