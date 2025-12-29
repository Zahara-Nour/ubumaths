# Bug Reports - Database Schema

> Documentation complete du schema de base de donnees pour le systeme de bug reports.

## Table des matieres

- [Schema](#schema)
- [Colonnes](#colonnes)
- [Indexes](#indexes)
- [RLS Policies](#rls-policies)
- [Storage Bucket](#storage-bucket)
- [Triggers](#triggers)
- [Relations](#relations)

---

## Schema

### Table `bug_reports`

```sql
CREATE TABLE IF NOT EXISTS public.bug_reports (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Author
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('bug', 'content', 'ux', 'feature', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Content
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),

  -- Screenshot (optional)
  screenshot_url TEXT,
  screenshot_path TEXT,

  -- Technical context (auto-captured)
  page_url TEXT,
  user_agent TEXT,
  viewport_size TEXT,
  session_context JSONB DEFAULT '{}',

  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'acknowledged',
    'in_progress',
    'resolved',
    'wont_fix',
    'duplicate'
  )),

  -- Admin handling
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Auto-generated reports (from freeze detection)
  auto_generated BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Colonnes

### Identification

| Colonne   | Type | Nullable | Default             | Description                     |
| --------- | ---- | -------- | ------------------- | ------------------------------- |
| `id`      | UUID | Non      | `gen_random_uuid()` | Identifiant unique              |
| `user_id` | UUID | Non      | -                   | Auteur du rapport (FK profiles) |

### Classification

| Colonne    | Type | Nullable | Default  | Valeurs                                    |
| ---------- | ---- | -------- | -------- | ------------------------------------------ |
| `category` | TEXT | Non      | -        | `bug`, `content`, `ux`, `feature`, `other` |
| `severity` | TEXT | Non      | `medium` | `low`, `medium`, `high`, `critical`        |

**Categories expliquees:**

| Valeur    | Label FR             | Description                              |
| --------- | -------------------- | ---------------------------------------- |
| `bug`     | Bug technique        | Erreurs, crashes, comportement inattendu |
| `content` | Erreur de contenu    | Probleme dans le contenu mathematique    |
| `ux`      | Probleme d'ergonomie | Difficulte d'utilisation, confusion      |
| `feature` | Suggestion           | Demande de nouvelle fonctionnalite       |
| `other`   | Autre                | Tout ce qui ne rentre pas ailleurs       |

**Severites expliquees:**

| Valeur     | Label FR | Impact                      |
| ---------- | -------- | --------------------------- |
| `low`      | Faible   | Inconvenient mineur         |
| `medium`   | Moyenne  | Affecte le workflow         |
| `high`     | Haute    | Bloque une fonctionnalite   |
| `critical` | Critique | Perte de donnees / securite |

### Contenu

| Colonne       | Type | Nullable | Contraintes   | Description           |
| ------------- | ---- | -------- | ------------- | --------------------- |
| `title`       | TEXT | Non      | 5-200 chars   | Resume du probleme    |
| `description` | TEXT | Non      | 20-5000 chars | Description detaillee |

### Screenshot

| Colonne           | Type | Nullable | Description                   |
| ----------------- | ---- | -------- | ----------------------------- |
| `screenshot_url`  | TEXT | Oui      | URL publique de la capture    |
| `screenshot_path` | TEXT | Oui      | Chemin dans le bucket storage |

**Format du path:** `{user_id}/{report_id}/{timestamp}.{ext}`

### Contexte technique

| Colonne           | Type  | Nullable | Description                        |
| ----------------- | ----- | -------- | ---------------------------------- |
| `page_url`        | TEXT  | Oui      | URL ou le probleme s'est produit   |
| `user_agent`      | TEXT  | Oui      | User agent du navigateur           |
| `viewport_size`   | TEXT  | Oui      | Dimensions ecran (ex: `1920x1080`) |
| `session_context` | JSONB | Oui      | Contexte enrichi (voir ci-dessous) |

**Structure de `session_context`:**

```typescript
interface SessionContext {
	capturedAt: string; // ISO timestamp

	// Server-side enrichment (from error_logs)
	recentErrors?: Array<{
		id: string;
		type: string;
		message: string;
		severity: string;
		timestamp: string;
		url?: string;
		file_path?: string;
		line_number?: number;
		stack_trace?: string;
	}>;

	slowRequests?: Array<{
		url: string;
		duration: number;
		status: number;
	}>;

	// Client-side capture
	freezeEvents?: Array<{
		id: string;
		timestamp: string;
		duration: number;
		type: 'long_task' | 'unresponsive';
		context?: {
			url?: string;
			lastAction?: string;
		};
	}>;

	recentActions?: Array<{
		type: 'click' | 'input' | 'navigation' | 'scroll';
		target: string;
		timestamp: string;
	}>;

	webVitals?: {
		LCP?: number;
		FID?: number;
		CLS?: number;
		FCP?: number;
		TTFB?: number;
		INP?: number;
	};

	// Exercise context
	exerciseId?: string;
	exerciseType?: string;
	classId?: string;
	assignmentId?: string;
}
```

### Workflow

| Colonne  | Type | Nullable | Default   | Description              |
| -------- | ---- | -------- | --------- | ------------------------ |
| `status` | TEXT | Non      | `pending` | Statut actuel du rapport |

**Statuts et transitions:**

```
pending ──► acknowledged ──► in_progress ──► resolved
    │                               │
    │                               ▼
    └─────────────────────────► wont_fix
                                    │
                                    ▼
                                duplicate
```

| Statut         | Label FR       | Description                |
| -------------- | -------------- | -------------------------- |
| `pending`      | En attente     | Nouveau, pas encore vu     |
| `acknowledged` | Pris en compte | Admin a vu                 |
| `in_progress`  | En cours       | Travail en cours           |
| `resolved`     | Resolu         | Corrige/traite             |
| `wont_fix`     | Non corrige    | Ne sera pas traite         |
| `duplicate`    | Doublon        | Doublon d'un autre rapport |

### Resolution

| Colonne            | Type        | Nullable | Description                      |
| ------------------ | ----------- | -------- | -------------------------------- |
| `resolution_notes` | TEXT        | Oui      | Notes de l'admin                 |
| `resolved_by`      | UUID        | Oui      | Admin qui a resolu (FK profiles) |
| `resolved_at`      | TIMESTAMPTZ | Oui      | Date de resolution               |

### Metadata

| Colonne          | Type        | Nullable | Default | Description                          |
| ---------------- | ----------- | -------- | ------- | ------------------------------------ |
| `auto_generated` | BOOLEAN     | Non      | `false` | True si rapport automatique (freeze) |
| `created_at`     | TIMESTAMPTZ | Non      | `NOW()` | Date de creation                     |
| `updated_at`     | TIMESTAMPTZ | Non      | `NOW()` | Date de mise a jour                  |

---

## Indexes

### Index principal par utilisateur

```sql
CREATE INDEX idx_bug_reports_user
  ON public.bug_reports(user_id);
```

**Usage:** Vue "Mes rapports" - O(log n) lookup

### Index partiel pour rapports pending

```sql
CREATE INDEX idx_bug_reports_status_pending
  ON public.bug_reports(created_at DESC)
  WHERE status = 'pending';
```

**Usage:** Queue admin - Tres efficace car ne contient que les pending

### Index chronologique

```sql
CREATE INDEX idx_bug_reports_created
  ON public.bug_reports(created_at DESC);
```

**Usage:** Liste par date

### Index par categorie

```sql
CREATE INDEX idx_bug_reports_category
  ON public.bug_reports(category);
```

**Usage:** Filtre par categorie

### Index partiel haute severite

```sql
CREATE INDEX idx_bug_reports_severity_high
  ON public.bug_reports(created_at DESC)
  WHERE severity IN ('high', 'critical');
```

**Usage:** Queue prioritaire - Rapports urgents seulement

### Index composite status + category

```sql
CREATE INDEX idx_bug_reports_status_category
  ON public.bug_reports(status, category);
```

**Usage:** Filtres combines admin

---

## RLS Policies

### Vue d'ensemble

| Policy                       | Operation | Role  | Condition                                     |
| ---------------------------- | --------- | ----- | --------------------------------------------- |
| Users can view own           | SELECT    | User  | `user_id = auth.uid()`                        |
| Users can create             | INSERT    | User  | `user_id = auth.uid()`                        |
| Users can update own pending | UPDATE    | User  | `user_id = auth.uid() AND status = 'pending'` |
| Admins can view all          | SELECT    | Admin | `is_admin()`                                  |
| Admins can update all        | UPDATE    | Admin | `is_admin()`                                  |
| Admins can delete            | DELETE    | Admin | `is_admin()`                                  |

### Details des policies

**1. Users can view own bug reports**

```sql
CREATE POLICY "Users can view own bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**2. Users can create bug reports**

```sql
CREATE POLICY "Users can create bug reports"
  ON public.bug_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

**3. Users can update own pending bug reports**

```sql
CREATE POLICY "Users can update own pending bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );
```

> Note: L'application limite les champs modifiables (title, description uniquement)

**4. Admins can view all bug reports**

```sql
CREATE POLICY "Admins can view all bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

**5. Admins can update all bug reports**

```sql
CREATE POLICY "Admins can update all bug reports"
  ON public.bug_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

**6. Admins can delete bug reports**

```sql
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

---

## Storage Bucket

### Configuration

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-report-screenshots',
  'bug-report-screenshots',
  true,                    -- Public pour URLs partageables
  5242880,                 -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);
```

### Storage Policies

**1. Public can view screenshots**

```sql
CREATE POLICY "Public can view bug report screenshots"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'bug-report-screenshots');
```

> Necessaire pour les URLs publiques. Securite: chemins contiennent des UUIDs non devinables.

**2. Users can upload to own folder**

```sql
CREATE POLICY "Users can upload bug report screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
```

**3. Users can update own screenshots**

```sql
CREATE POLICY "Users can update own bug report screenshots"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
```

**4. Users can delete own screenshots**

```sql
CREATE POLICY "Users can delete own bug report screenshots"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
```

**5. Admins can manage all screenshots**

```sql
CREATE POLICY "Admins can manage bug report screenshots"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'bug-report-screenshots'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'bug-report-screenshots'
    AND public.is_admin()
  );
```

---

## Triggers

### Auto-update `updated_at`

```sql
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

Utilise la fonction partagee `update_updated_at_column()` deja presente dans le schema.

---

## Relations

### Diagramme ER

```
┌─────────────────┐
│    profiles     │
├─────────────────┤
│ id (PK)         │◄────────────────────────────┐
│ email           │                              │
│ full_name       │                              │
│ role            │                              │
└─────────────────┘                              │
        ▲                                        │
        │                                        │
        │ user_id (FK)                           │ resolved_by (FK)
        │                                        │ ON DELETE SET NULL
        │ ON DELETE CASCADE                      │
        │                                        │
┌───────┴─────────────────────────────────────────┴───┐
│                    bug_reports                      │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ user_id ─────────────────────────────────────────►  │
│ category                                            │
│ severity                                            │
│ title                                               │
│ description                                         │
│ screenshot_url  ────────────────┐                   │
│ screenshot_path ────────────────┼──► storage.objects│
│ session_context                 │                   │
│ status                          │                   │
│ resolution_notes                │                   │
│ resolved_by ────────────────────┼──────────────────►│
│ resolved_at                     │                   │
│ auto_generated                  │                   │
│ created_at                      │                   │
│ updated_at                      │                   │
└─────────────────────────────────────────────────────┘
```

### Foreign Keys

| Colonne       | Reference      | ON DELETE |
| ------------- | -------------- | --------- |
| `user_id`     | `profiles(id)` | CASCADE   |
| `resolved_by` | `profiles(id)` | SET NULL  |

---

## Requetes courantes

### Liste des rapports pending (admin)

```sql
SELECT
  br.*,
  p.full_name as author_name,
  p.email as author_email
FROM bug_reports br
JOIN profiles p ON p.id = br.user_id
WHERE br.status = 'pending'
ORDER BY br.created_at DESC
LIMIT 20;
```

### Statistiques par statut

```sql
SELECT
  status,
  COUNT(*) as count
FROM bug_reports
GROUP BY status;
```

### Rapports critiques non resolus

```sql
SELECT *
FROM bug_reports
WHERE severity IN ('high', 'critical')
  AND status NOT IN ('resolved', 'wont_fix', 'duplicate')
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
  END,
  created_at DESC;
```

### Rapports avec freezes

```sql
SELECT
  id,
  title,
  session_context->'freezeEvents' as freeze_events
FROM bug_reports
WHERE jsonb_array_length(COALESCE(session_context->'freezeEvents', '[]'::jsonb)) > 0
ORDER BY created_at DESC;
```
