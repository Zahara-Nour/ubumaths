/**
 * Cleanup script for expired rate limit entries
 *
 * Deletes all rate_limits entries where expires_at < NOW
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧹 Cleaning up expired rate limit entries...\n');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
	console.error('❌ Missing environment variables!');
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase
	.from('rate_limits')
	.delete()
	.lt('expires_at', new Date().toISOString())
	.select();

if (error) {
	console.error('❌ Cleanup failed:', error);
	process.exit(1);
}

const count = data ? data.length : 0;
console.log(`✅ Deleted ${count} expired entries`);

if (data && data.length > 0) {
	console.log('\nDeleted keys:');
	data.forEach((entry) => console.log(`  - ${entry.key} (expired: ${entry.expires_at})`));
}

process.exit(0);
