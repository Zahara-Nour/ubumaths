/**
 * Script to check admin profile data
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
	process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

async function checkAdminProfile() {
	console.log('🔍 Checking admin profile...\n');

	// Find admin users
	const { data: admins, error } = await supabase.from('profiles').select('*').eq('role', 'admin');

	if (error) {
		console.error('❌ Error fetching admins:', error);
		process.exit(1);
	}

	if (!admins || admins.length === 0) {
		console.log('❌ No admin users found');
		return;
	}

	console.log(`Found ${admins.length} admin user(s):\n`);

	for (const admin of admins) {
		console.log('═══════════════════════════════════════════════════════════════');
		console.log('📧 Email:', admin.email);
		console.log('👤 ID:', admin.id);
		console.log('📛 First name:', admin.firstname);
		console.log('📛 Last name:', admin.lastname);
		console.log('📛 Full name:', admin.full_name);
		console.log('🎭 Role:', admin.role);
		console.log('🖼️  Avatar URL:', admin.avatar_url);
		console.log('🏫 School ID:', admin.school_id);
		console.log('═══════════════════════════════════════════════════════════════\n');
	}
}

// Run the script
checkAdminProfile().catch(console.error);
