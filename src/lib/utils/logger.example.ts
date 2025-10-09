/**
 * Example usage of the logger utility
 *
 * This file demonstrates how to use the logger in different scenarios.
 * You can run this file or copy the patterns into your own code.
 */

import { createLogger } from './logger';

// Example 1: Basic usage with default threshold (info)
// Trace messages will be suppressed
const logger = createLogger('logger.example.ts');

export function demonstrateLogger() {
	logger.trace('This is a trace message - WILL NOT BE DISPLAYED (below info threshold)');
	logger.info('This is an info message - for general information');
	logger.warn('This is a warning message - for potential issues');
	logger.error('This is an error message - for actual errors');

	// With additional data
	logger.info('User logged in', { userId: 123, timestamp: new Date() });

	// Multiple arguments
	logger.warn('Invalid input detected:', 'value', { expected: 'number', got: 'string' });

	// Error objects
	try {
		throw new Error('Something went wrong');
	} catch (err) {
		logger.error('Caught an error:', err);
	}
}

// Example 1b: Debug mode with trace threshold
// All messages including trace will be displayed
const debugLogger = createLogger('logger.example.ts', 'trace');

export function demonstrateDebugLogger() {
	debugLogger.trace('This trace message WILL BE DISPLAYED');
	debugLogger.info('Debug mode enabled');
	debugLogger.warn('Detailed debugging active');
}

// Example 1c: Production-like mode with error threshold
// Only errors will be displayed
const errorOnlyLogger = createLogger('logger.example.ts', 'error');

export function demonstrateErrorOnlyLogger() {
	errorOnlyLogger.trace('Suppressed - below error threshold');
	errorOnlyLogger.info('Suppressed - below error threshold');
	errorOnlyLogger.warn('Suppressed - below error threshold');
	errorOnlyLogger.error('This error WILL BE DISPLAYED');
}

// Example 2: Usage in a server-side module with custom threshold
const serverLogger = createLogger('api-handler.ts', 'trace');

export async function fetchData(url: string) {
	serverLogger.info('Fetching data from:', url);

	try {
		const response = await fetch(url);
		serverLogger.trace('Response status:', response.status);
		return await response.json();
	} catch (err) {
		serverLogger.error('Failed to fetch data:', err);
		throw err;
	}
}

// Example 3: Usage in a class with warn threshold
// Only warnings and errors will be displayed
export class DataService {
	private logger = createLogger('DataService.ts', 'warn');

	async loadData(id: string) {
		this.logger.info('Loading data for id:', id); // Suppressed (below warn)

		if (!id) {
			this.logger.warn('No id provided, using default'); // Displayed
			id = 'default';
		}

		try {
			// ... data loading logic
			this.logger.trace('Data loaded successfully'); // Suppressed (below warn)
		} catch (err) {
			this.logger.error('Failed to load data:', err); // Displayed
			throw err;
		}
	}
}