// Game challenge store with Svelte 5 runes
// Author: Claude Code
// Date: 2025-10-15

import type { GameChallenge, ChallengeInstance } from '$lib/types/game';

class ChallengeStore {
	private _currentChallenge = $state<GameChallenge | null>(null);
	private _challengeInstance = $state<ChallengeInstance | null>(null);
	private _timeRemaining = $state<number>(0);
	private _timerActive = $state<boolean>(false);
	private _answerSubmitted = $state<boolean>(false);
	private _success = $state<boolean | null>(null);

	get currentChallenge() {
		return this._currentChallenge;
	}

	set currentChallenge(challenge: GameChallenge | null) {
		this._currentChallenge = challenge;
		if (challenge) {
			this._timeRemaining = challenge.timer;
		}
	}

	get challengeInstance() {
		return this._challengeInstance;
	}

	set challengeInstance(instance: ChallengeInstance | null) {
		this._challengeInstance = instance;
	}

	get timeRemaining() {
		return this._timeRemaining;
	}

	set timeRemaining(value: number) {
		this._timeRemaining = value;
	}

	get timerActive() {
		return this._timerActive;
	}

	set timerActive(value: boolean) {
		this._timerActive = value;
	}

	get answerSubmitted() {
		return this._answerSubmitted;
	}

	get success() {
		return this._success;
	}

	get timeElapsed() {
		if (!this._currentChallenge) return 0;
		return this._currentChallenge.timer - this._timeRemaining;
	}

	// Methods
	startTimer() {
		this._timerActive = true;
	}

	stopTimer() {
		this._timerActive = false;
	}

	tick() {
		if (this._timerActive && this._timeRemaining > 0) {
			this._timeRemaining -= 100; // Tick every 100ms
		}
	}

	submitAnswer(answer: unknown, correct: boolean) {
		this._answerSubmitted = true;
		this._success = correct;
		this.stopTimer();
	}

	reset() {
		this._currentChallenge = null;
		this._challengeInstance = null;
		this._timeRemaining = 0;
		this._timerActive = false;
		this._answerSubmitted = false;
		this._success = null;
	}
}

export const challengeStore = new ChallengeStore();
