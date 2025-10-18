/**
 * Script to promote a user to teacher role
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   2. Run: npx tsx scripts/create-teacher.ts <email>
 *
 * Or manually promote via Supabase dashboard SQL editor:
 *   UPDATE profiles SET role = 'teacher' WHERE email = 'user@example.com';
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

const email = process.argv[2];

if (!email) {
	console.error('❌ Please provide an email address');
	console.error('   Usage: npx tsx scripts/create-teacher.ts <email>');
	process.exit(1);
}

async function createTeacher() {
	// Create Supabase client with service role key (bypasses RLS)
	const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	console.log(`🔍 Looking for user: ${email}`);

	// Check if user exists
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('*')
		.eq('email', email)
		.single();

	if (fetchError || !profile) {
		console.error('❌ User not found. Make sure the user has signed up first.');
		process.exit(1);
	}

	console.log(`✅ Found user: ${profile.full_name || email}`);
	console.log(`   Current role: ${profile.role}`);

	if (profile.role === 'teacher') {
		console.log('ℹ️  User is already a teacher');
		process.exit(0);
	}

	if (profile.role === 'admin') {
		console.log('ℹ️  User is an admin (which has all teacher permissions)');
		console.log('   To demote to teacher, run:');
		console.log(`   UPDATE profiles SET role = 'teacher' WHERE email = '${email}';`);
		process.exit(0);
	}

	// Promote to teacher
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ role: 'teacher' })
		.eq('email', email);

	if (updateError) {
		console.error('❌ Failed to promote user:', updateError.message);
		process.exit(1);
	}

	console.log('✅ User promoted to teacher successfully!');
}

createTeacher().catch((error) => {
	console.error('❌ Error:', error.message);
	process.exit(1);
});
