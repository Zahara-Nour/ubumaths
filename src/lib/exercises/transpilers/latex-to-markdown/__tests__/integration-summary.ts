/**
 * Integration Test Summary Module
 * ================================
 *
 * Exports a function to run and summarize all integration tests
 * for the LaTeX to Markdown transpiler.
 */

import { getTestSummary } from './integration.test';

/**
 * Run integration tests and return a summary.
 *
 * @returns Test statistics including pass rate and performance metrics
 */
export async function runIntegrationTests() {
	console.log('Running LaTeX to Markdown Integration Tests...\n');

	// Import to trigger test execution
	await import('./integration.test');

	// Get and return the summary
	const summary = getTestSummary();

	console.log('\n' + '='.repeat(60));
	console.log('INTEGRATION TEST RESULTS');
	console.log('='.repeat(60));
	console.log(`✅ Tests Passed: ${summary.passed}/${summary.totalTests}`);
	console.log(`❌ Tests Failed: ${summary.failed}/${summary.totalTests}`);
	console.log(`📊 Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
	console.log('\n⚡ Performance Benchmarks:');
	console.log(`   Small documents (<100 chars): ${summary.performanceMetrics.small.toFixed(2)}ms`);
	console.log(`   Medium documents (~1KB): ${summary.performanceMetrics.medium.toFixed(2)}ms`);
	console.log(`   Large documents (~10KB): ${summary.performanceMetrics.large.toFixed(2)}ms`);
	console.log('='.repeat(60));

	return summary;
}

// Allow running from command line
if (require.main === module) {
	runIntegrationTests().catch(console.error);
}
