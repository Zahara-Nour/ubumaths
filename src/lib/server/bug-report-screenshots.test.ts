/**
 * Bug Report Screenshots helper - Unit Tests
 * ==========================================
 *
 * Verifies signed-URL generation for the private `bug-report-screenshots`
 * bucket. Uses a mocked Supabase storage client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	signBugReportScreenshots,
	signBugReportScreenshot,
	DISPLAY_SIGNED_URL_TTL
} from './bug-report-screenshots';

// ----------------------------------------------------------------------------
// Mock setup
// ----------------------------------------------------------------------------

const createSignedUrl = vi.fn();
const from = vi.fn(() => ({ createSignedUrl }));

const supabase = {
	storage: { from }
} as unknown as SupabaseClient<Database>;

beforeEach(() => {
	vi.clearAllMocks();
	createSignedUrl.mockResolvedValue({
		data: { signedUrl: 'https://signed.example/img?token=abc' },
		error: null
	});
});

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('signBugReportScreenshots', () => {
	it('replaces screenshot_url with a fresh signed URL when a path exists', async () => {
		const reports = [
			{ screenshot_path: 'uid/report/1.png', screenshot_url: 'https://stale/old.png' }
		];

		await signBugReportScreenshots(supabase, reports);

		expect(from).toHaveBeenCalledWith('bug-report-screenshots');
		expect(createSignedUrl).toHaveBeenCalledWith('uid/report/1.png', DISPLAY_SIGNED_URL_TTL);
		expect(reports[0].screenshot_url).toBe('https://signed.example/img?token=abc');
	});

	it('leaves reports without a screenshot_path untouched', async () => {
		const reports = [{ screenshot_path: null, screenshot_url: null }];

		await signBugReportScreenshots(supabase, reports);

		expect(createSignedUrl).not.toHaveBeenCalled();
		expect(reports[0].screenshot_url).toBeNull();
	});

	it('sets screenshot_url to null (no broken URL) when signing fails', async () => {
		createSignedUrl.mockResolvedValue({
			data: null,
			error: { message: 'Object not found' }
		});
		const reports = [
			{ screenshot_path: 'uid/report/1.png', screenshot_url: 'https://stale/old.png' }
		];

		await signBugReportScreenshots(supabase, reports);

		expect(reports[0].screenshot_url).toBeNull();
	});

	it('signs only the reports that have a path in a mixed batch', async () => {
		const reports = [
			{ screenshot_path: 'uid/a/1.png', screenshot_url: null },
			{ screenshot_path: null, screenshot_url: null },
			{ screenshot_path: 'uid/b/2.png', screenshot_url: null }
		];

		await signBugReportScreenshots(supabase, reports);

		expect(createSignedUrl).toHaveBeenCalledTimes(2);
		expect(reports[0].screenshot_url).toBe('https://signed.example/img?token=abc');
		expect(reports[1].screenshot_url).toBeNull();
		expect(reports[2].screenshot_url).toBe('https://signed.example/img?token=abc');
	});

	it('honors a custom expiry (e.g. export TTL)', async () => {
		const reports = [{ screenshot_path: 'uid/report/1.png', screenshot_url: null }];

		await signBugReportScreenshots(supabase, reports, 604800);

		expect(createSignedUrl).toHaveBeenCalledWith('uid/report/1.png', 604800);
	});
});

describe('signBugReportScreenshot (single)', () => {
	it('signs a single report and returns it', async () => {
		const report = { screenshot_path: 'uid/report/1.png', screenshot_url: null };

		const result = await signBugReportScreenshot(supabase, report);

		expect(result).toBe(report);
		expect(report.screenshot_url).toBe('https://signed.example/img?token=abc');
	});
});
