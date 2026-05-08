import {
	pythonExampleSchema,
	type ExampleCategory,
	type ExampleTag,
	type PythonExample
} from './types';

export function filterExamples(
	examples: PythonExample[],
	query: string,
	selectedTags: ExampleTag[]
): PythonExample[] {
	const q = query.trim().toLowerCase();
	return examples.filter((ex) => {
		const matchesQuery =
			!q || ex.title.toLowerCase().includes(q) || ex.description.toLowerCase().includes(q);
		const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => ex.tags.includes(t));
		return matchesQuery && matchesTags;
	});
}

export function getAllTagsFromExamples(examples: PythonExample[]): ExampleTag[] {
	const set = new Set<ExampleTag>();
	for (const ex of examples) {
		for (const t of ex.tags) set.add(t);
	}
	return [...set].sort();
}

export function validateExamples(examples: PythonExample[]): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	const seenIds = new Set<string>();
	for (const ex of examples) {
		const result = pythonExampleSchema.safeParse(ex);
		if (!result.success) {
			const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
			errors.push(`${ex.id ?? '?'}: ${issues}`);
			continue;
		}
		if (seenIds.has(ex.id)) {
			errors.push(`Duplicate id: ${ex.id}`);
		} else {
			seenIds.add(ex.id);
		}
	}
	return { valid: errors.length === 0, errors };
}

export function groupByCategory(
	examples: PythonExample[]
): Partial<Record<ExampleCategory, PythonExample[]>> {
	const groups: Partial<Record<ExampleCategory, PythonExample[]>> = {};
	for (const ex of examples) {
		(groups[ex.category] ??= []).push(ex);
	}
	return groups;
}
