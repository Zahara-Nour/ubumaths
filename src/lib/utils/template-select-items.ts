import type { TemplateStatus } from '$lib/types/chapter-templates';

// Seul un modèle publié s'instancie (garde serveur de `instantiateTemplate`).
// Les autres restent visibles — le professeur sait qu'ils existent — mais
// grisés, et leur statut est dit dans le libellé.
const STATUS_SUFFIX: Record<TemplateStatus, string> = {
	published: '',
	draft: ' (brouillon)',
	archived: ' (archivé)'
};

export function templateSelectItems(
	templates: { id: string; title: string; status: TemplateStatus; isOwner: boolean }[]
): { value: string; label: string; disabled: boolean }[] {
	return templates.map((t) => ({
		value: t.id,
		label: t.title + (t.isOwner ? '' : ' (public)') + STATUS_SUFFIX[t.status],
		disabled: t.status !== 'published'
	}));
}
