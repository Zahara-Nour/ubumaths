# Database - Cahier de Texte

Schema de base de donnees, Row Level Security, et indexes pour le systeme de cahier de texte.

---

## Schema Principal

### Table `class_journal_entries`

```sql
CREATE TABLE class_journal_entries (
  -- Identifiant
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date de la seance (contrainte unique par classe)
  entry_date DATE NOT NULL,

  -- Contenu (format Ubumark - HTML avec formules mathematiques)
  lesson_content TEXT,       -- Ce qui a ete fait en cours
  homework_content TEXT,     -- Devoirs a faire
  homework_due_date DATE,    -- Date limite optionnelle

  -- Publication
  is_published BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: une seule entree par classe par date
  CONSTRAINT unique_class_entry_date UNIQUE (class_id, entry_date)
);
```

### Colonnes - Detail

| Colonne             | Type        | Nullable | Default           | Description                |
| ------------------- | ----------- | -------- | ----------------- | -------------------------- |
| `id`                | UUID        | Non      | gen_random_uuid() | Cle primaire               |
| `class_id`          | UUID        | Non      | -                 | FK vers classes.id         |
| `teacher_id`        | UUID        | Non      | -                 | FK vers profiles.id        |
| `entry_date`        | DATE        | Non      | -                 | Date de la seance          |
| `lesson_content`    | TEXT        | Oui      | null              | Contenu du cours (Ubumark) |
| `homework_content`  | TEXT        | Oui      | null              | Devoirs a faire (Ubumark)  |
| `homework_due_date` | DATE        | Oui      | null              | Date limite devoirs        |
| `is_published`      | BOOLEAN     | Non      | false             | Visible par eleves         |
| `created_at`        | TIMESTAMPTZ | Non      | NOW()             | Date creation              |
| `updated_at`        | TIMESTAMPTZ | Non      | NOW()             | Date modification          |

### Contraintes

```sql
-- Une seule entree par classe par date
CONSTRAINT unique_class_entry_date UNIQUE (class_id, entry_date)

-- Cascade delete si classe supprimee
REFERENCES classes(id) ON DELETE CASCADE

-- Cascade delete si enseignant supprime
REFERENCES profiles(id) ON DELETE CASCADE
```

---

## Tables Liees

### `classes` (parent)

```sql
-- Colonnes utilisees par le journal
classes (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id),  -- Proprio de la classe
  name TEXT,                                 -- Ex: "6eme A"
  level TEXT,                                -- Ex: "6eme"
  is_active BOOLEAN                          -- Classe active
);
```

### `class_members` (relation eleves)

```sql
-- Determine quels eleves ont acces aux entrees
class_members (
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES profiles(id),
  status TEXT  -- 'active' = peut voir les entrees publiees
);
```

### `class_schedules` (emploi du temps)

```sql
-- Determine les jours de cours (pour indicateur "Cours prevu")
class_schedules (
  class_id UUID REFERENCES classes(id),
  day_of_week INTEGER  -- 0=dimanche, 1=lundi, ..., 6=samedi
);
```

### `profiles` (enseignants)

```sql
-- Nom de l'enseignant (affiche aux eleves)
profiles (
  id UUID PRIMARY KEY,
  display_name TEXT
);
```

---

## Indexes

```sql
-- Index sur class_id (filtrage par classe)
CREATE INDEX idx_journal_entries_class_id
  ON class_journal_entries(class_id);

-- Index sur teacher_id (filtrage par enseignant)
CREATE INDEX idx_journal_entries_teacher_id
  ON class_journal_entries(teacher_id);

-- Index sur entry_date (tri chronologique)
CREATE INDEX idx_journal_entries_entry_date
  ON class_journal_entries(entry_date);

-- Index partiel sur homework_due_date (devoirs a venir)
CREATE INDEX idx_journal_entries_homework_due
  ON class_journal_entries(homework_due_date)
  WHERE homework_due_date IS NOT NULL;

-- Index composite pour vue eleve (entrees publiees)
CREATE INDEX idx_journal_entries_student_view
  ON class_journal_entries(class_id, entry_date)
  WHERE is_published = true;
```

### Justification des indexes

| Index          | Usage              | Query Pattern                                   |
| -------------- | ------------------ | ----------------------------------------------- |
| `class_id`     | Vue hebdomadaire   | `WHERE class_id = ?`                            |
| `teacher_id`   | Liste entrees prof | `WHERE teacher_id = ?`                          |
| `entry_date`   | Tri chronologique  | `ORDER BY entry_date`                           |
| `homework_due` | Devoirs a venir    | `WHERE homework_due_date >= ? AND <= ?`         |
| `student_view` | Vue eleve          | `WHERE class_id IN (?) AND is_published = true` |

---

## Row Level Security (RLS)

```sql
-- Activer RLS
ALTER TABLE class_journal_entries ENABLE ROW LEVEL SECURITY;
```

### Policy: Enseignants - SELECT

```sql
-- Les enseignants voient leurs entrees OU les entrees de leurs classes
CREATE POLICY "Teachers can view journal entries"
  ON class_journal_entries
  FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_journal_entries.class_id
      AND classes.teacher_id = auth.uid()
    )
  );
```

**Explication**: Un enseignant peut voir:

1. Les entrees qu'il a creees (`teacher_id = auth.uid()`)
2. Les entrees dans les classes qu'il possede (meme si creees par un autre)

### Policy: Enseignants - INSERT

```sql
-- Les enseignants creent des entrees pour leurs classes
CREATE POLICY "Teachers can create journal entries for their classes"
  ON class_journal_entries
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_journal_entries.class_id
      AND classes.teacher_id = auth.uid()
    )
  );
```

**Explication**: Un enseignant peut creer une entree seulement si:

1. Il s'identifie comme auteur (`teacher_id = auth.uid()`)
2. Il est proprietaire de la classe

### Policy: Enseignants - UPDATE

```sql
-- Les enseignants modifient leurs propres entrees
CREATE POLICY "Teachers can update their journal entries"
  ON class_journal_entries
  FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
```

**Explication**: Seul l'auteur peut modifier une entree.

### Policy: Enseignants - DELETE

```sql
-- Les enseignants suppriment leurs propres entrees
CREATE POLICY "Teachers can delete their journal entries"
  ON class_journal_entries
  FOR DELETE
  USING (teacher_id = auth.uid());
```

### Policy: Eleves - SELECT

```sql
-- Les eleves voient UNIQUEMENT les entrees publiees, passees, de leurs classes
CREATE POLICY "Students can view published journal entries"
  ON class_journal_entries
  FOR SELECT
  USING (
    is_published = true AND
    entry_date <= CURRENT_DATE AND
    EXISTS (
      SELECT 1 FROM class_members
      WHERE class_members.class_id = class_journal_entries.class_id
      AND class_members.student_id = auth.uid()
    )
  );
```

**Explication**: Un eleve peut voir une entree seulement si:

1. L'entree est publiee (`is_published = true`)
2. La date est passee ou aujourd'hui (`entry_date <= CURRENT_DATE`)
3. L'eleve est membre de la classe

**Important**: Le statut du membership n'est pas verifie dans RLS - c'est fait cote serveur pour plus de flexibilite.

### Policy: Admins - ALL

```sql
-- Les admins ont acces complet
CREATE POLICY "Admins can manage all journal entries"
  ON class_journal_entries
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

---

## Triggers

### Auto-update `updated_at`

```sql
-- Trigger pour mettre a jour updated_at automatiquement
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON class_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction utilisee (deja existante)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## Commentaires Table

```sql
COMMENT ON TABLE class_journal_entries IS
  'Daily journal entries for class textbook (cahier de texte) - one entry per class per date';

COMMENT ON COLUMN class_journal_entries.entry_date IS
  'Date of the class session';

COMMENT ON COLUMN class_journal_entries.lesson_content IS
  'Content covered during the session (Ubumark format)';

COMMENT ON COLUMN class_journal_entries.homework_content IS
  'Homework assignment (Ubumark format)';

COMMENT ON COLUMN class_journal_entries.homework_due_date IS
  'Optional due date for the homework assignment';

COMMENT ON COLUMN class_journal_entries.is_published IS
  'Whether the entry is visible to students (must also have entry_date <= today)';
```

---

## Diagramme Relations

```
                         ┌──────────────────┐
                         │     profiles     │
                         │  (enseignants)   │
                         └────────┬─────────┘
                                  │
                                  │ 1:N
                                  ▼
┌──────────────┐    1:N    ┌──────────────────┐    1:N    ┌──────────────────┐
│   classes    │◄──────────│class_journal_    │──────────►│  class_members   │
│              │           │     entries      │           │   (eleves)       │
└──────────────┘           └──────────────────┘           └──────────────────┘
       │                                                          │
       │ 1:N                                                      │
       ▼                                                          ▼
┌──────────────┐                                          ┌──────────────────┐
│class_schedules│                                         │     profiles     │
│(emploi temps)│                                          │    (eleves)      │
└──────────────┘                                          └──────────────────┘
```

---

## Queries Typiques

### Vue hebdomadaire enseignant

```sql
-- Entrees d'une semaine pour une classe
SELECT * FROM class_journal_entries
WHERE class_id = $1
  AND entry_date >= $2  -- debut semaine
  AND entry_date <= $3  -- fin semaine
ORDER BY entry_date ASC;
```

### Devoirs a venir eleve

```sql
-- Devoirs avec date limite dans les 14 prochains jours
SELECT
  e.*,
  c.name as class_name,
  c.level as class_level
FROM class_journal_entries e
JOIN classes c ON c.id = e.class_id
WHERE e.class_id IN (
    SELECT class_id FROM class_members
    WHERE student_id = $1 AND status = 'active'
  )
  AND e.is_published = true
  AND e.entry_date <= CURRENT_DATE
  AND e.homework_content IS NOT NULL
  AND e.homework_due_date IS NOT NULL
  AND e.homework_due_date >= CURRENT_DATE
  AND e.homework_due_date <= CURRENT_DATE + INTERVAL '14 days'
ORDER BY e.homework_due_date ASC;
```

### Statistiques classe

```sql
-- Statistiques pour une classe
SELECT
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE is_published = true) as published_entries,
  COUNT(*) FILTER (WHERE homework_content IS NOT NULL) as entries_with_homework,
  MAX(entry_date) as last_entry_date,
  COUNT(*) FILTER (
    WHERE entry_date >= date_trunc('month', CURRENT_DATE)
  ) as entries_this_month,
  COUNT(*) FILTER (
    WHERE entry_date >= date_trunc('week', CURRENT_DATE)
  ) as entries_this_week
FROM class_journal_entries
WHERE class_id = $1;
```

---

## Migration

**Fichier**: `supabase/migrations/20260104200000_create_journal_entries.sql`

### Rollback

```sql
-- Pour annuler cette migration
DROP TABLE IF EXISTS class_journal_entries CASCADE;
```

### Considerations

1. **CASCADE**: La suppression d'une classe ou d'un enseignant supprime les entrees associees
2. **Pas de soft delete**: Les entrees supprimees sont vraiment supprimees
3. **Pas d'historique**: Pas de versioning du contenu
4. **Pas de draft system**: Le boolean `is_published` suffit

---

## Performance

### Requetes optimisees

| Query             | Index utilise             | Cout estime |
| ----------------- | ------------------------- | ----------- |
| Week view         | `class_id` + `entry_date` | < 10ms      |
| Upcoming homework | `homework_due` (partial)  | < 20ms      |
| Student view      | `student_view` (partial)  | < 15ms      |

### Recommandations

1. **VACUUM ANALYZE** regulier sur la table
2. **Monitoring** des index inutilises via `pg_stat_user_indexes`
3. **Partitioning** non necessaire (volume faible attendu)
