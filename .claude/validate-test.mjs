import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('🧪 Validating Phase 1 Test Questions...\n');

// Get Phase 1 template IDs
const { data: tracking } = await supabase
  .from('migration_tracking')
  .select('new_template_id')
  .eq('phase', 1)
  .not('new_template_id', 'is', null);

const templateIds = tracking?.map(t => t.new_template_id).filter(Boolean) || [];
console.log(`Found ${templateIds.length} Phase 1 templates to validate\n`);

let validated = 0;
let failed = 0;
const errors = [];

for (const id of templateIds) {
  try {
    // Fetch template
    const { data: template } = await supabase
      .from('question_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (!template) throw new Error('Template not found');

    // Basic validation
    if (!template.type) throw new Error('Missing type');
    if (!template.title) throw new Error('Missing title');
    if (!template.variations || template.variations.length === 0) {
      throw new Error('Missing variations');
    }

    // Validate first variation
    const variation = template.variations[0];
    if (!variation.statement || variation.statement.length === 0) {
      throw new Error('Variation missing statement');
    }
    if (!variation.answer) throw new Error('Variation missing answer');

    console.log(`✓ ${template.title}`);
    console.log(`  Type: ${template.type}`);
    console.log(`  Variations: ${template.variations.length}`);
    console.log(`  Statement: ${variation.statement[0].content}`);
    console.log(`  Answer: ${variation.answer}\n`);

    validated++;
  } catch (error) {
    console.log(`✗ Template ${id}: ${error.message}\n`);
    errors.push({ id, error: error.message });
    failed++;
  }
}

console.log('\n✨ Validation Complete!');
console.log(`   Validated: ${validated}/${templateIds.length}`);
console.log(`   Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(e => console.log(`  - ${e.id}: ${e.error}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 1 test questions validated successfully!');
}
