/**
 * Script to assign all non-admin users to Lycée Franco-Qatari Voltaire school
 *
 * This script:
 * 1. Finds the Voltaire school ID
 * 2. Updates all users (except admins) to belong to this school
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

async function assignVoltaireSchool() {
	console.log('🔍 Finding Voltaire school...\n');

	// Find Voltaire school
	const { data: schools, error: schoolError } = await supabase
		.from('schools')
		.select('id, name, city, country')
		.ilike('name', '%voltaire%');

	if (schoolError) {
		console.error('❌ Error fetching schools:', schoolError);
		process.exit(1);
	}

	if (!schools || schools.length === 0) {
		console.error('❌ Voltaire school not found in database');
		process.exit(1);
	}

	const voltaireSchool = schools[0];
	console.log(`✅ Found school: ${voltaireSchool.name} (${voltaireSchool.city}, ${voltaireSchool.country})`);
	console.log(`   School ID: ${voltaireSchool.id}\n`);

	console.log('═══════════════════════════════════════════════════════════════\n');

	// Get all users who are not admins
	console.log('🔍 Fetching all non-admin users...\n');

	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, email, firstname, lastname, role, school_id')
		.neq('role', 'admin')
		.order('role', { ascending: true })
		.order('email', { ascending: true });

	if (profilesError) {
		console.error('❌ Error fetching profiles:', profilesError);
		process.exit(1);
	}

	if (!profiles || profiles.length === 0) {
		console.log('No non-admin profiles found.');
		return;
	}

	console.log(`Found ${profiles.length} non-admin profiles\n`);

	let updatedCount = 0;
	let skippedCount = 0;

	for (const profile of profiles) {
		const name = profile.firstname && profile.lastname
			? `${profile.firstname} ${profile.lastname}`
			: profile.email;

		console.log(`📧 ${name} (${profile.role})`);

		// Check if already assigned to Voltaire
		if (profile.school_id === voltaireSchool.id) {
			console.log(`   ⏭️  Already assigned to Voltaire school\n`);
			skippedCount++;
			continue;
		}

		// Update the profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update({ school_id: voltaireSchool.id })
			.eq('id', profile.id);

		if (updateError) {
			console.error(`   ❌ Error updating profile:`, updateError);
		} else {
			const previousSchool = profile.school_id ? `from another school` : `(was unassigned)`;
			console.log(`   ✅ Assigned to Voltaire school ${previousSchool}\n`);
			updatedCount++;
		}
	}

	console.log('═══════════════════════════════════════════════════════════════');
	console.log(`\n✨ Done!`);
	console.log(`   - Updated: ${updatedCount} users`);
	console.log(`   - Already assigned: ${skippedCount} users`);
	console.log(`   - Total non-admin users: ${profiles.length}\n`);
}

// Run the script
assignVoltaireSchool().catch(console.error);
