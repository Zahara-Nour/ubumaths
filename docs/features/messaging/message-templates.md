# Guide Système de Templates de Messagerie

## Vue d'ensemble

Le système de templates de messagerie permet de créer des modèles de messages réutilisables avec des placeholders dynamiques. Les templates facilitent la communication standardisée entre étudiants et professeurs.

### Caractéristiques principales

- ✅ Templates système (admins) et templates de classe (professeurs)
- ✅ Placeholders dynamiques avec auto-complétion
- ✅ Types de déclencheurs contextuels
- ✅ Prévisualisation en temps réel
- ✅ Interface de gestion complète
- ✅ Intégration avec le composeur de messages

## Architecture

### Tables de base de données

**`message_templates`** - Stockage des templates

Colonnes clés :

- `title`: Nom du template (max 100 chars)
- `subject_template`: Sujet avec placeholders
- `body_template`: Corps du message (HTML avec placeholders)
- `trigger_type`: Type de déclencheur (`assessment_question`, `srs_help`, etc.)
- `scope`: `system` (admins) ou `class` (professeurs)
- `class_id`: ID de classe (si scope=class)
- `variables`: Définition des placeholders (JSONB)
- `is_active`: Template actif/inactif

### Types de déclencheurs

1. **`assessment_question`** - Questions sur évaluations
2. **`srs_help`** - Aide sur decks SRS
3. **`system_notification`** - Notifications système
4. **`enigma_answer`** - Réponses énigmes (futur)
5. **`general`** - Messages généraux

## Système de Variables

### Variables globales (disponibles partout)

| Variable                 | Description          | Exemple           |
| ------------------------ | -------------------- | ----------------- |
| `{{student_name}}`       | Nom complet étudiant | "Marie Dubois"    |
| `{{student_first_name}}` | Prénom étudiant      | "Marie"           |
| `{{teacher_name}}`       | Nom du professeur    | "M. Martin"       |
| `{{class_name}}`         | Nom de la classe     | "6ème A"          |
| `{{today_date}}`         | Date du jour         | "22 octobre 2025" |
| `{{today_date_short}}`   | Date format court    | "22/10/2025"      |
| `{{time}}`               | Heure actuelle       | "14:30"           |
| `{{year}}`               | Année scolaire       | "2025-2026"       |

### Variables par contexte

#### Assessment (évaluation)

| Variable                  | Description            | User Input? |
| ------------------------- | ---------------------- | ----------- |
| `{{assessment_title}}`    | Titre évaluation       | Non         |
| `{{assessment_link}}`     | Lien vers évaluation   | Non         |
| `{{assessment_due_date}}` | Date limite            | Non         |
| `{{student_question}}`    | Question de l'étudiant | **Oui**     |

#### SRS (révision espacée)

| Variable              | Description      | User Input? |
| --------------------- | ---------------- | ----------- |
| `{{deck_name}}`       | Nom du deck      | Non         |
| `{{deck_link}}`       | Lien vers deck   | Non         |
| `{{card_count}}`      | Nombre de cartes | Non         |
| `{{student_message}}` | Message étudiant | **Oui**     |

#### Enigma (futur)

| Variable             | Description      | User Input? |
| -------------------- | ---------------- | ----------- |
| `{{enigma_number}}`  | Numéro énigme    | Non         |
| `{{enigma_title}}`   | Titre énigme     | Non         |
| `{{enigma_link}}`    | Lien vers énigme | Non         |
| `{{student_answer}}` | Réponse étudiant | **Oui**     |

## Utilisation

### Pour les Admins

#### Créer un template système

1. Aller sur `/dashboard/admin/message-templates`
2. Cliquer "Nouveau template"
3. Remplir :
   - **Titre** : Nom descriptif
   - **Description** : Usage du template
   - **Type de déclencheur** : Choisir le contexte
   - **Portée** : Sélectionner "Système"
   - **Sujet** : Sujet avec placeholders
   - **Corps** : Message avec placeholders (rich text)
4. Insérer variables via les boutons
5. Activer le template
6. Sauvegarder

**Exemple de template système - Question Assessment**

```
Titre: Question sur évaluation
Type: assessment_question
Scope: system

Sujet: Question sur {{assessment_title}}

Corps:
Bonjour {{teacher_name}},

J'ai une question concernant l'évaluation **{{assessment_title}}** :

{{student_question}}

🔗 [Lien vers l'évaluation]({{assessment_link}})

Merci d'avance pour votre aide,
{{student_name}}
{{class_name}} - {{today_date}}
```

### Pour les Professeurs

#### Créer un template de classe

1. Aller sur `/dashboard/teacher/message-templates`
2. Cliquer "Nouveau template"
3. Sélectionner une de vos classes
4. Personnaliser le template pour cette classe
5. Sauvegarder

**Limitations professeurs :**

- ❌ Ne peuvent pas créer de templates système
- ❌ Ne peuvent pas modifier les templates système
- ✅ Peuvent créer des templates pour leurs propres classes
- ✅ Voient tous les templates système (lecture seule)

### Pour les Étudiants

Les étudiants utilisent automatiquement les templates via des boutons contextuels :

**Exemple depuis une page assessment :**

```svelte
<Button
	onclick={() => {
		const params = new URLSearchParams({
			triggerType: 'assessment_question',
			recipientId: teacher.id,
			assessment_title: assessment.title,
			assessment_link: window.location.href
		});
		goto(`/messages/compose?${params}`);
	}}
>
	Poser une question au professeur
</Button>
```

L'étudiant voit alors :

1. Formulaire simplifié
2. Destinataire pré-rempli
3. Sujet pré-rempli
4. Seuls les champs "user input" à remplir
5. Aperçu du message complet

## API

### Endpoints disponibles

#### `GET /api/messages/templates`

Liste les templates (filtrés par permissions)

**Query params:**

- `scope`: `system` | `class`
- `trigger_type`: Type de déclencheur
- `class_id`: ID de classe
- `is_active`: `true` | `false`

**Response:**

```json
{
  "templates": [...],
  "count": 5
}
```

#### `POST /api/messages/templates`

Crée un nouveau template

**Body:**

```json
{
	"title": "Mon template",
	"description": "Description",
	"subject_template": "Sujet {{variable}}",
	"body_template": "<p>Corps avec {{variable}}</p>",
	"trigger_type": "general",
	"scope": "class",
	"class_id": "uuid",
	"is_active": true
}
```

#### `GET /api/messages/templates/:id`

Détails d'un template

#### `PATCH /api/messages/templates/:id`

Met à jour un template

#### `DELETE /api/messages/templates/:id`

Supprime un template

#### `GET /api/messages/templates/match`

Trouve le meilleur template pour un contexte

**Query params:**

- `trigger_type` (requis)
- `class_id` (optionnel)

**Response:**

```json
{
  "template": {...},
  "match_type": "class" | "system" | "none"
}
```

#### `POST /api/messages/templates/:id/preview`

Prévisualise un template avec données

**Body:**

```json
{
	"data": {
		"student_name": "Test User",
		"assessment_title": "DM #3"
	}
}
```

## Permissions (RLS)

### Admins

- ✅ Lecture de tous les templates
- ✅ Création de templates système et classe
- ✅ Modification de tous les templates
- ✅ Suppression de tous les templates

### Professeurs

- ✅ Lecture des templates système (actifs uniquement)
- ✅ Lecture de leurs propres templates de classe
- ✅ Création de templates de classe
- ✅ Modification de leurs propres templates de classe
- ❌ Modification des templates système
- ✅ Suppression de leurs propres templates de classe
- ❌ Suppression des templates système

### Étudiants

- ✅ Lecture des templates système actifs
- ✅ Lecture des templates de leurs classes (actifs uniquement)
- ❌ Création/modification/suppression de templates

## Moteur de Templates

### Matching de templates

Le système trouve automatiquement le template approprié selon :

1. **Priority** : Templates de classe > Templates système
2. **Context** : `trigger_type` + `class_id`
3. **Status** : Uniquement templates actifs

**Exemple :**

```typescript
const template = await messageTemplates.findMatchingTemplate('assessment_question', classId);
// Retourne le template de classe si existe, sinon template système
```

### Rendu de templates

Le moteur remplace les placeholders :

```typescript
const rendered = renderTemplate(template, {
	student_name: 'Marie Dubois',
	assessment_title: 'DM #3',
	student_question: "Comment faire l'exercice 2 ?"
});

// rendered.subject: "Question sur DM #3"
// rendered.body: "Bonjour M. Martin, J'ai une question..."
// rendered.isComplete: true (si toutes variables remplies)
```

### Validation

```typescript
const validation = validateTemplate({
	title: 'Mon template',
	subject_template: 'Sujet {{var}}',
	body_template: 'Corps avec {{var}}',
	trigger_type: 'general'
});

if (!validation.valid) {
	console.log(validation.errors);
}

console.log(validation.warnings); // Variables inconnues, etc.
```

## Seed Data

Les templates par défaut sont créés via :

```bash
psql -h localhost -U postgres -d ubumaths -f supabase/seed/default_message_templates.sql
```

**Templates créés :**

1. Question sur évaluation
2. Demande d'aide - SRS
3. Notification système
4. Message général
5. Soumission réponse énigme (inactif)

## Extensibilité

### Ajouter un nouveau type de déclencheur

1. **Migration** : Ajouter le type dans le CHECK constraint de `trigger_type`

```sql
ALTER TABLE message_templates DROP CONSTRAINT message_templates_trigger_type_check;
ALTER TABLE message_templates ADD CONSTRAINT message_templates_trigger_type_check
  CHECK (trigger_type IN ('assessment_question', 'srs_help', 'system_notification', 'enigma_answer', 'general', 'NEW_TYPE'));
```

2. **Types** : Ajouter dans `src/lib/types/messageTemplates.ts`

```typescript
export type TriggerType =
	| 'assessment_question'
	| 'srs_help'
	| 'system_notification'
	| 'enigma_answer'
	| 'general'
	| 'NEW_TYPE'; // <-- Ajouter ici
```

3. **Variables** : Définir dans `src/lib/templates/templateVariables.ts`

```typescript
export const NEW_TYPE_VARIABLES: TemplateVariable[] = [
	{
		name: 'new_variable',
		label: 'Ma nouvelle variable',
		example: 'Exemple',
		required: true,
		userInput: false
	}
];

// Ajouter au registre
export const VARIABLES_BY_TRIGGER: Record<TriggerType, TemplateVariable[]> = {
	// ...
	NEW_TYPE: [...GLOBAL_VARIABLES, ...NEW_TYPE_VARIABLES]
};
```

4. **UI** : Ajouter aux options dans les pages de gestion

```typescript
const triggerTypeOptions = [
	// ...
	{ value: 'NEW_TYPE', label: 'Mon nouveau type' }
];
```

## Maintenance

### Regénérer les types database.ts

Après modifications de la migration :

```bash
pnpm db:migrate
npx supabase gen types typescript --local > src/lib/types/database.ts
```

### Debugging

Activer les logs :

```typescript
import { previewTemplate } from '$lib/templates/templateEngine';

const preview = previewTemplate(template);
console.log('Subject:', preview.subject);
console.log('Body:', preview.body);
console.log('Missing vars:', preview.missingVariables);
```

## Bonnes Pratiques

### Création de templates

- ✅ Utiliser des titres descriptifs
- ✅ Ajouter des descriptions claires
- ✅ Tester avec la prévisualisation
- ✅ Utiliser les variables appropriées
- ✅ Éviter les templates trop spécifiques
- ❌ Ne pas inclure d'informations sensibles
- ❌ Ne pas utiliser trop de variables

### Intégration contextuelle

- ✅ Ajouter des boutons contextuels dans les pages appropriées
- ✅ Pré-remplir le maximum de données
- ✅ Valider les données avant de passer au composeur
- ✅ Gérer le cas où aucun template n'existe
- ❌ Ne pas forcer l'utilisation de templates

### Performance

- Les templates sont cachés côté client (store)
- Utiliser `findMatchingTemplate()` pour éviter de charger tous les templates
- Fonction `get_templates_for_context()` optimisée en SQL

## Dépannage

### Template non trouvé

**Cause** : Pas de template actif pour ce contexte
**Solution** : Créer un template système ou vérifier que le template de classe existe

### Variables manquantes

**Cause** : Placeholder utilisé sans être défini dans le registre
**Solution** : Ajouter la variable dans `templateVariables.ts`

### Permissions refusées

**Cause** : RLS bloque l'accès
**Solution** : Vérifier le rôle de l'utilisateur et le scope du template

### Template non mis à jour

**Cause** : Erreur de validation
**Solution** : Vérifier la console pour les erreurs de validation

## Ressources

- **Migration** : `supabase/migrations/097_create_message_templates.sql`
- **Types** : `src/lib/types/messageTemplates.ts`
- **Variables** : `src/lib/templates/templateVariables.ts`
- **Moteur** : `src/lib/templates/templateEngine.ts`
- **Store** : `src/lib/stores/messageTemplates.svelte.ts`
- **API** : `src/routes/api/messages/templates/*`
- **UI Admin** : `src/routes/(protected)/dashboard/admin/message-templates/+page.svelte`
- **UI Prof** : `src/routes/(protected)/dashboard/teacher/message-templates/+page.svelte`

## Roadmap

### À venir

- [ ] Variables conditionnelles (`{{#if variable}}...{{/if}}`)
- [ ] Templates multi-destinataires avancés
- [ ] Import/export de templates
- [ ] Bibliothèque de templates partagés
- [ ] Analytics d'utilisation des templates
- [ ] Suggestions automatiques de templates
- [ ] Support traductions multi-langues

---

**Dernière mise à jour** : 2025-10-22
**Version** : 1.0.0
