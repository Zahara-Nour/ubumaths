# Plan : Chapter Templates Globaux

## Resume

Systeme de templates de chapitres reutilisables permettant aux professeurs de creer, partager et versionner des structures de cours.

## Decisions Cles

| Decision | Choix |
|----------|-------|
| Createurs | Tous les professeurs |
| Partage | Prive par defaut, option de publier globalement |
| Documents | References URL seulement (pas de copie) |
| Versioning | Complet avec migration |
| Stockage contenu | JSONB `content_snapshot` (simple, versionnable) |

---

## Schema Database

### Table `chapter_templates`
```sql
CREATE TABLE chapter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_public BOOLEAN NOT NULL DEFAULT false,

    title TEXT NOT NULL,
    description TEXT,
    grades TEXT[] NOT NULL DEFAULT '{}',
    color TEXT,
    icon TEXT,

    content_snapshot JSONB NOT NULL DEFAULT '{}',
    instantiation_count INTEGER NOT NULL DEFAULT 0,
    current_version INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table `chapter_template_versions`
```sql
CREATE TABLE chapter_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES chapter_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_snapshot JSONB NOT NULL,
    change_summary TEXT,
    diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),

    UNIQUE(template_id, version_number)
);
```

### Table `chapter_template_instantiations`
```sql
CREATE TABLE chapter_template_instantiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES chapter_templates(id) ON DELETE SET NULL,
    template_version INTEGER NOT NULL,
    chapter_id UUID NOT NULL REFERENCES class_chapters(id) ON DELETE CASCADE,
    current_template_version INTEGER,
    is_detached BOOLEAN NOT NULL DEFAULT false,
    instantiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_migrated_at TIMESTAMPTZ,

    UNIQUE(chapter_id)
);
```

### RLS Policies
- Profs voient: leurs templates + templates publics publies
- CRUD: seulement ses propres templates
- Admins: acces complet

---

## Structure JSONB `content_snapshot`

```typescript
interface TemplateContentSnapshot {
  documents: [{
    title: string;
    description: string | null;
    documentUrl: string;        // URL externe ou Google Drive
    sourceType: 'external_url' | 'google_drive';
    mimeType: string | null;
    displayOrder: number;
  }];
  quizQuestions: [{
    questionTemplateId: string; // Ref vers question_templates existant
    pointsOverride: number | null;
    displayOrder: number;
  }];
  checklistItems: [{
    content: string;            // Texte copie
    description: string | null;
    displayOrder: number;
  }];
  exercises: [{
    exerciseId: string;         // Ref vers exercises existant
    displayOrder: number;
  }];
}
```

---

## Phases d'Implementation

### Phase 0: Specification TDD (OBLIGATOIRE)

#### Comportements Template CRUD
1. Un prof peut creer un template depuis zero
2. Un prof peut creer un template depuis un chapitre existant
3. Un prof peut modifier ses templates draft
4. Un prof peut publier un template (status: published)
5. Un prof peut rendre un template public (is_public: true)
6. Un prof peut archiver un template

#### Comportements Visibilite
1. Templates draft: visibles uniquement par le createur
2. Templates published + private: visibles uniquement par le createur
3. Templates published + public: visibles par tous les profs
4. Admins voient tous les templates

#### Comportements Versioning
1. Modifier le content_snapshot cree une nouvelle version
2. Chaque version stocke le snapshot complet + diff
3. Le diff est calcule automatiquement (added/removed/modified)
4. current_version sur le template pointe vers la derniere

#### Comportements Instanciation
1. Instancier cree un nouveau chapitre dans la classe cible
2. Documents: crees comme refs URL (pas de copie fichier)
3. Quiz questions: liens vers memes question_templates
4. Checklist items: copies comme nouveaux enregistrements
5. Exercises: liens vers memes exercises
6. Junction table tracke template_id + version utilisee

#### Comportements Migration
1. Prof voit si une mise a jour est disponible
2. Prof peut voir le diff avant d'appliquer
3. Migration ajoute nouveaux items, supprime anciens
4. Prof peut detacher pour arreter le tracking

---

### Phase 1: Migration Database

**Agent**: `supabase-expert` (Opus)

**Fichier**: `supabase/migrations/XXXXXX_create_chapter_templates.sql`

- Tables: `chapter_templates`, `chapter_template_versions`, `chapter_template_instantiations`
- RLS policies (8-10 policies)
- Indexes: grades GIN, (created_by, status), (is_public, status)
- Triggers: updated_at auto-update

---

### Phase 2: Types & Validation Zod

**Agent**: `typescript-expert` (Haiku)

**Fichiers**:
- `src/lib/types/chapter-templates.ts`
- `src/lib/server/validation/chapter-templates.ts`

Types principaux:
- `ChapterTemplate`, `ChapterTemplateVersion`, `TemplateContentSnapshot`
- `TemplateDiff`, `ChapterTemplateInstantiation`

Schemas Zod:
- `createChapterTemplateSchema`, `updateChapterTemplateSchema`
- `templateContentSnapshotSchema`
- `instantiateTemplateSchema`, `migrateChapterSchema`

---

### Phase 3: Backend Server Functions

**Agent**: `backend-developer` (Opus)

**Fichier**: `src/lib/server/chapter-templates.ts`

Fonctions CRUD:
- `createChapterTemplate()`, `updateChapterTemplate()`, `deleteChapterTemplate()`
- `getChapterTemplate()`, `listChapterTemplates()`

Fonctions Version:
- `createTemplateVersion()`, `getTemplateVersions()`
- `computeDiff()` - calcul du diff entre snapshots

Fonctions Instanciation:
- `instantiateTemplate()` - template -> chapitre
- `createTemplateFromChapter()` - chapitre -> template

Fonctions Migration:
- `migrateChapterToVersion()`, `detachChapterFromTemplate()`
- `checkForTemplateUpdates()`

---

### Phase 4: API Routes

**Agent**: `backend-developer` (Opus)

**Routes**:
```
/api/teacher/chapter-templates/
├── +server.ts                    # GET list, POST create
├── [id]/
│   ├── +server.ts               # GET, PATCH, DELETE
│   ├── versions/+server.ts      # GET versions, POST new version
│   └── instantiate/+server.ts   # POST instantiate
```

```
/api/teacher/chapters/[id]/
├── create-template/+server.ts   # POST create from chapter
├── template-updates/+server.ts  # GET check updates
├── migrate/+server.ts           # POST migrate
└── detach/+server.ts           # POST detach
```

---

### Phase 5: Composants UI

**Agent**: `frontend-developer` (Opus)

**Composants**:
- `TemplateGallery.svelte` - Galerie avec filtres (grade, search, public/prive)
- `TemplateCard.svelte` - Carte template avec preview
- `TemplateEditor.svelte` - Editeur complet (reutiliser editors existants)
- `TemplateInstantiationDialog.svelte` - Modal selection classe + options
- `TemplateMigrationDialog.svelte` - Review diff + confirmation
- `TemplateVersionHistory.svelte` - Timeline versions
- `ChapterTemplateIndicator.svelte` - Badge lien template + update dispo

---

### Phase 6: Routes Teacher

**Agent**: `svelte-expert` (Opus)

**Routes**:
```
/dashboard/teacher/templates/
├── +page.svelte                 # Galerie templates
├── +page.server.ts              # Load templates
├── new/+page.svelte             # Creer template
├── [templateId]/
│   ├── +page.svelte            # Voir/editer template
│   └── +page.server.ts         # Load + actions
```

**Modifications existantes**:
- Ajouter "Templates" dans sidebar teacher
- Ajouter action "Creer template" sur page chapitre
- Ajouter indicateur template sur chapitres lies

---

### Phase 7: Tests

**Agent**: `test-automator` (Sonnet)

- Tests unitaires: Zod schemas, server functions
- Tests integration: API endpoints, RLS policies
- Tests E2E: Workflow complet (creer -> publier -> instancier -> migrer)

---

## Fichiers Critiques Existants

| Fichier | Utilisation |
|---------|-------------|
| `src/lib/types/chapters.ts` | Types chapitre a referencer |
| `src/lib/server/chapters.ts` | Pattern server functions |
| `src/lib/server/validation/chapters.ts` | Pattern validation Zod |
| `supabase/migrations/20251210000000_create_chapter_system.sql` | Pattern migration |
| `src/lib/components/cours/teacher/` | Composants editeurs existants |

---

## Ordre d'Execution

1. **Phase 0**: Specification TDD -> Validation utilisateur
2. **Phase 1**: Migration DB + `pnpm db:types`
3. **Phase 2**: Types TS + Zod
4. **Phase 3**: Server functions + tests
5. **Phase 4**: API routes + tests
6. **Phase 5**: Composants UI
7. **Phase 6**: Routes teacher
8. **Phase 7**: Tests E2E + code review

**Workflow TDD par phase**:
1. Proposer comportements -> Validation
2. Ecrire tests (doivent echouer)
3. Implementer
4. Tests passent
5. Code review agent
6. Commit

**A la fin**: `pnpm lint && pnpm check`

---

## Estimations

- Migration DB: ~200 lignes SQL
- Types + Zod: ~300 lignes
- Server functions: ~800 lignes
- API routes: ~400 lignes
- Composants UI: ~1500 lignes (7 composants)
- Routes: ~600 lignes
- Tests: ~500 lignes

**Total**: ~4300 lignes de code
