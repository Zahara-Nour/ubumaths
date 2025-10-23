/**
 * Message Templates Store
 *
 * Manages message templates state and operations on the client side.
 * Provides methods for loading, creating, updating, and deleting templates.
 */

import type {
	MessageTemplate,
	MessageTemplateInput,
	TriggerType,
	TemplateContext,
	RenderedTemplate
} from '$lib/types/messageTemplates';
import { renderTemplate, buildGlobalContext } from '$lib/templates/templateEngine';
import { getSupabase } from '$lib/supabaseClient';

interface MessageTemplatesState {
	templates: MessageTemplate[];
	activeTemplate: MessageTemplate | null;
	renderedTemplate: RenderedTemplate | null;
	isLoading: boolean;
	error: string | null;
}

class MessageTemplatesStore {
	private state = $state<MessageTemplatesState>({
		templates: [],
		activeTemplate: null,
		renderedTemplate: null,
		isLoading: false,
		error: null
	});

	// Getters
	get templates() {
		return this.state.templates;
	}

	get activeTemplate() {
		return this.state.activeTemplate;
	}

	get renderedTemplate() {
		return this.state.renderedTemplate;
	}

	get isLoading() {
		return this.state.isLoading;
	}

	get error() {
		return this.state.error;
	}

	// =====================================================
	// Template Loading
	// =====================================================

	/**
	 * Load all templates (filtered by permissions on server)
	 */
	async loadTemplates(filters?: {
		scope?: 'system' | 'class';
		triggerType?: TriggerType;
		classId?: string;
		isActive?: boolean;
	}) {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const params = new URLSearchParams();
			if (filters?.scope) params.set('scope', filters.scope);
			if (filters?.triggerType) params.set('trigger_type', filters.triggerType);
			if (filters?.classId) params.set('class_id', filters.classId);
			if (filters?.isActive !== undefined) params.set('is_active', String(filters.isActive));

			const response = await fetch(`/api/messages/templates?${params.toString()}`);

			if (!response.ok) {
				throw new Error('Erreur lors du chargement des templates');
			}

			const data = await response.json();
			this.state.templates = data.templates;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error loading templates:', error);
		} finally {
			this.state.isLoading = false;
		}
	}

	/**
	 * Load a single template by ID
	 */
	async loadTemplate(id: string): Promise<MessageTemplate | null> {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const response = await fetch(`/api/messages/templates/${id}`);

			if (!response.ok) {
				throw new Error('Template non trouvé');
			}

			const data = await response.json();
			return data.template;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error loading template:', error);
			return null;
		} finally {
			this.state.isLoading = false;
		}
	}

	// =====================================================
	// Template Matching
	// =====================================================

	/**
	 * Find the best matching template for a context
	 */
	async findMatchingTemplate(
		triggerType: TriggerType,
		classId?: string
	): Promise<MessageTemplate | null> {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const params = new URLSearchParams();
			params.set('trigger_type', triggerType);
			if (classId) params.set('class_id', classId);

			const response = await fetch(`/api/messages/templates/match?${params.toString()}`);

			if (!response.ok) {
				// No matching template found
				return null;
			}

			const data = await response.json();
			return data.template;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error finding matching template:', error);
			return null;
		} finally {
			this.state.isLoading = false;
		}
	}

	// =====================================================
	// Template Application
	// =====================================================

	/**
	 * Apply a template with context data
	 *
	 * Sets the active template and renders it with provided data.
	 */
	applyTemplate(template: MessageTemplate, contextData: Record<string, string | number | null>) {
		this.state.activeTemplate = template;

		// Render template with context data
		this.state.renderedTemplate = renderTemplate(template, contextData);
	}

	/**
	 * Update rendered template with new data
	 *
	 * Use this when user provides input for user-input variables.
	 */
	updateRenderedData(additionalData: Record<string, string | number>) {
		if (!this.state.activeTemplate) {
			console.warn('No active template to update');
			return;
		}

		// Merge with existing rendered data if available
		const currentData = this.extractDataFromRendered() || {};
		const mergedData = { ...currentData, ...additionalData };

		this.state.renderedTemplate = renderTemplate(this.state.activeTemplate, mergedData);
	}

	/**
	 * Clear active template
	 */
	clearTemplate() {
		this.state.activeTemplate = null;
		this.state.renderedTemplate = null;
	}

	// =====================================================
	// Template CRUD Operations
	// =====================================================

	/**
	 * Create a new template
	 */
	async createTemplate(templateInput: MessageTemplateInput): Promise<MessageTemplate | null> {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const response = await fetch('/api/messages/templates', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(templateInput)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erreur lors de la création du template');
			}

			const data = await response.json();

			// Add to local state
			this.state.templates = [data.template, ...this.state.templates];

			return data.template;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error creating template:', error);
			return null;
		} finally {
			this.state.isLoading = false;
		}
	}

	/**
	 * Update an existing template
	 */
	async updateTemplate(
		id: string,
		updates: Partial<MessageTemplateInput>
	): Promise<MessageTemplate | null> {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const response = await fetch(`/api/messages/templates/${id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erreur lors de la mise à jour du template');
			}

			const data = await response.json();

			// Update in local state
			this.state.templates = this.state.templates.map((t) =>
				t.id === id ? data.template : t
			);

			return data.template;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error updating template:', error);
			return null;
		} finally {
			this.state.isLoading = false;
		}
	}

	/**
	 * Delete a template
	 */
	async deleteTemplate(id: string): Promise<boolean> {
		this.state.isLoading = true;
		this.state.error = null;

		try {
			const response = await fetch(`/api/messages/templates/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Erreur lors de la suppression du template');
			}

			// Remove from local state
			this.state.templates = this.state.templates.filter((t) => t.id !== id);

			// Clear if this was the active template
			if (this.state.activeTemplate?.id === id) {
				this.clearTemplate();
			}

			return true;
		} catch (error) {
			this.state.error = error instanceof Error ? error.message : 'Erreur inconnue';
			console.error('Error deleting template:', error);
			return false;
		} finally {
			this.state.isLoading = false;
		}
	}

	// =====================================================
	// Preview Operations
	// =====================================================

	/**
	 * Generate a preview of a template
	 */
	async previewTemplate(
		id: string,
		data?: Record<string, string | number>
	): Promise<{ subject: string; body: string; missingVariables: string[] } | null> {
		try {
			const response = await fetch(`/api/messages/templates/${id}/preview`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ data: data || {} })
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la génération de la prévisualisation');
			}

			const result = await response.json();
			return result.preview;
		} catch (error) {
			console.error('Error generating preview:', error);
			return null;
		}
	}

	// =====================================================
	// Utility Methods
	// =====================================================

	/**
	 * Get templates by trigger type
	 */
	getTemplatesByTrigger(triggerType: TriggerType): MessageTemplate[] {
		return this.state.templates.filter((t) => t.trigger_type === triggerType);
	}

	/**
	 * Get templates by scope
	 */
	getTemplatesByScope(scope: 'system' | 'class'): MessageTemplate[] {
		return this.state.templates.filter((t) => t.scope === scope);
	}

	/**
	 * Extract data from currently rendered template (for updates)
	 */
	private extractDataFromRendered(): Record<string, string> | null {
		// This is a simplified version - in practice, you'd maintain
		// the original data used for rendering
		return null;
	}
}

// Export singleton instance
export const messageTemplates = new MessageTemplatesStore();
