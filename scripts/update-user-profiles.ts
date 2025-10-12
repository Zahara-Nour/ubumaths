/**
 * Script to update user profiles with guessed firstname, lastname, and gender
 *
 * This script:
 * 1. Fetches all users from the database
 * 2. For users missing firstname/lastname, guesses from full_name or email
 * 3. Guesses gender based on French first names
 * 4. Updates the profiles in the database
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

/**
 * Common French boy names for gender guessing
 */
const boyNames = new Set([
	'jean', 'pierre', 'louis', 'jacques', 'claude', 'michel', 'paul', 'andré',
	'marc', 'nicolas', 'thomas', 'david', 'julien', 'antoine', 'maxime', 'alexandre',
	'françois', 'laurent', 'olivier', 'vincent', 'stéphane', 'benjamin', 'lucas',
	'gabriel', 'mathis', 'hugo', 'théo', 'léo', 'raphael', 'nathan', 'arthur',
	'baptiste', 'clément', 'romain', 'simon', 'matthieu', 'adrien', 'florian',
	'quentin', 'jordan', 'yann', 'loïc', 'anthony', 'kévin', 'dylan', 'enzo',
	'yanis', 'maxence', 'morgan', 'evan', 'tom', 'adam', 'noah', 'liam', 'victor',
	'd', 'prof', 'monsieur', 'm'
]);

/**
 * Common French girl names for gender guessing
 */
const girlNames = new Set([
	'marie', 'jeanne', 'louise', 'sophie', 'catherine', 'isabelle', 'nathalie',
	'sylvie', 'christine', 'françoise', 'martine', 'monique', 'jacqueline', 'claire',
	'valérie', 'sandrine', 'céline', 'laurence', 'caroline', 'stéphanie', 'émilie',
	'julie', 'laura', 'sarah', 'chloé', 'camille', 'léa', 'manon', 'océane',
	'mathilde', 'clara', 'emma', 'jade', 'alice', 'lola', 'zoé', 'inès', 'lisa',
	'lucie', 'anaïs', 'pauline', 'marine', 'elisa', 'margaux', 'amélie', 'charlotte',
	'juliette', 'morgane', 'marion', 'clémence', 'mélanie', 'aurélie', 'laure',
	'mme', 'madame', 'prof', 'professeur'
]);

/**
 * Parse full name into firstname and lastname
 */
function parseFullName(fullName: string): { firstname: string; lastname: string } {
	const parts = fullName.trim().split(/\s+/);

	if (parts.length === 0) {
		return { firstname: '', lastname: '' };
	}

	if (parts.length === 1) {
		return { firstname: parts[0], lastname: '' };
	}

	// First part is firstname, rest is lastname
	const firstname = parts[0];
	const lastname = parts.slice(1).join(' ');

	return { firstname, lastname };
}

/**
 * Extract name from email (e.g., "jean.dupont@example.com" -> "Jean Dupont")
 */
function parseEmail(email: string): { firstname: string; lastname: string } {
	const localPart = email.split('@')[0];

	// Remove numbers and special chars except dots and hyphens
	const cleaned = localPart.replace(/[0-9_]/g, '');

	// Split by dots or hyphens
	const parts = cleaned.split(/[.-]+/).filter(p => p.length > 0);

	if (parts.length === 0) {
		return { firstname: '', lastname: '' };
	}

	if (parts.length === 1) {
		return { firstname: capitalize(parts[0]), lastname: '' };
	}

	// First part is firstname, second is lastname
	const firstname = capitalize(parts[0]);
	const lastname = capitalize(parts[1]);

	return { firstname, lastname };
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Guess gender based on first name
 */
function guessGender(firstname: string): 'boy' | 'girl' | null {
	if (!firstname) return null;

	const normalized = firstname.toLowerCase().trim();

	// Check against known names
	if (boyNames.has(normalized)) return 'boy';
	if (girlNames.has(normalized)) return 'girl';

	// French name patterns
	// Names ending in -e, -ie, -ine, -elle, -ette are often feminine
	if (normalized.match(/(elle|ette|ine|ie)$/)) return 'girl';

	// Names ending in common masculine patterns
	if (normalized.match(/(ier|ain|ois|bert|andre)$/)) return 'boy';

	return null;
}

/**
 * Main function to update profiles
 */
async function updateProfiles() {
	console.log('🔍 Fetching all profiles from database...\n');

	// Fetch all profiles
	const { data: profiles, error } = await supabase
		.from('profiles')
		.select('id, email, full_name, firstname, lastname, role, gender')
		.order('role', { ascending: true })
		.order('email', { ascending: true });

	if (error) {
		console.error('❌ Error fetching profiles:', error);
		process.exit(1);
	}

	if (!profiles || profiles.length === 0) {
		console.log('No profiles found.');
		return;
	}

	console.log(`Found ${profiles.length} profiles\n`);
	console.log('═══════════════════════════════════════════════════════════════\n');

	let updatedCount = 0;

	for (const profile of profiles) {
		const updates: any = {};
		let needsUpdate = false;

		console.log(`\n📧 ${profile.email} (${profile.role})`);
		console.log(`   Current: firstname="${profile.firstname}", lastname="${profile.lastname}", gender="${profile.gender}"`);

		// Guess firstname/lastname if missing
		if (!profile.firstname || !profile.lastname) {
			let guessedName = { firstname: '', lastname: '' };

			if (profile.full_name) {
				guessedName = parseFullName(profile.full_name);
				console.log(`   → Parsed from full_name: "${profile.full_name}"`);
			} else if (profile.email) {
				guessedName = parseEmail(profile.email);
				console.log(`   → Parsed from email: "${profile.email}"`);
			}

			if (!profile.firstname && guessedName.firstname) {
				updates.firstname = guessedName.firstname;
				needsUpdate = true;
			}

			if (!profile.lastname && guessedName.lastname) {
				updates.lastname = guessedName.lastname;
				needsUpdate = true;
			}
		}

		// Guess gender if missing
		if (!profile.gender) {
			const firstnameToUse = updates.firstname || profile.firstname;
			const guessedGender = guessGender(firstnameToUse);

			if (guessedGender) {
				updates.gender = guessedGender;
				needsUpdate = true;
				console.log(`   → Guessed gender: ${guessedGender}`);
			} else {
				console.log(`   → Could not guess gender from "${firstnameToUse}"`);
			}
		}

		// Update the profile if needed
		if (needsUpdate) {
			console.log(`   ✏️  Updating:`, updates);

			const { error: updateError } = await supabase
				.from('profiles')
				.update(updates)
				.eq('id', profile.id);

			if (updateError) {
				console.error(`   ❌ Error updating profile:`, updateError);
			} else {
				console.log(`   ✅ Updated successfully`);
				updatedCount++;
			}
		} else {
			console.log(`   ⏭️  No updates needed`);
		}
	}

	console.log('\n═══════════════════════════════════════════════════════════════');
	console.log(`\n✨ Done! Updated ${updatedCount} out of ${profiles.length} profiles.\n`);
}

// Run the script
updateProfiles().catch(console.error);
