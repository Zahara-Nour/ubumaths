/**
 * Script to list all users in the database
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   2. Run: npx tsx scripts/list-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   - PUBLIC_SUPABASE_URL');
	console.error('   - SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

async function listUsers() {
	// Create Supabase client with service role key (bypasses RLS)
	const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	console.log('🔍 Fetching all users from profiles table...\n');

	// Get all profiles
	const { data: profiles, error } = await supabase
		.from('profiles')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('❌ Error fetching users:', error.message);
		process.exit(1);
	}

	if (!profiles || profiles.length === 0) {
		console.log('📝 No users found in the database.');
		console.log('\nℹ️  This could mean:');
		console.log('   1. No users have signed up yet');
		console.log('   2. The handle_new_user() trigger is not working');
		console.log('   3. There was an issue with the signup process');
		console.log('\n💡 Try signing up at: http://localhost:5173/signup');
		process.exit(0);
	}

	console.log(`✅ Found ${profiles.length} user(s):\n`);

	profiles.forEach((profile, index) => {
		console.log(`${index + 1}. ${profile.email}`);
		console.log(`   Name: ${profile.full_name || 'Not set'}`);
		console.log(`   Role: ${profile.role}`);
		console.log(`   ID: ${profile.id}`);
		console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
		console.log('');
	});
}

listUsers().catch((error) => {
	console.error('❌ Error:', error.message);
	process.exit(1);
});
