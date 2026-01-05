# Flux de Donnees - Cahier de Texte

Diagrammes de sequence et flux de donnees detailles pour le systeme de cahier de texte.

---

## Vue d'ensemble des flux

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ENSEIGNANT                                 │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │ Voir semaine│───►│ Creer entree│───►│ Modifier    │───►│ Publier  │ │
│  │             │    │             │    │             │    │          │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘ │
│         │                  │                  │                  │      │
└─────────│──────────────────│──────────────────│──────────────────│──────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATABASE                                   │
│                       class_journal_entries                             │
│                              + RLS                                      │
└─────────────────────────────────────────────────────────────────────────┘
          │                                                    │
          │              is_published = true                   │
          │              entry_date <= today                   │
          ▼                                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                               ELEVE                                     │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │ Voir semaine│───►│ Voir detail │    │ Voir devoirs│                 │
│  │ (publiees)  │    │ (read-only) │    │ (a venir)   │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Flux Enseignant

### 1. Voir la semaine

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Teacher)   │     │      load()       │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  GET /cahier-texte    │                        │
       │  ?week=2024-01-15     │                        │
       │  &class=xxx           │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  requireRole('teacher')│
       │                       │────────────────────────│
       │                       │                        │
       │                       │  SELECT classes        │
       │                       │  WHERE teacher_id = ?  │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  getJournalEntriesFor  │
       │                       │  Week(classId, week)   │
       │                       │───────────────────────►│
       │                       │                        │
       │                       │  SELECT entries        │
       │                       │  + class_schedules     │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { classes,          │                        │
       │     weekView,         │                        │
       │     selectedClassId } │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Render JournalWeek   │                        │
       │  Grid component       │                        │
       │                       │                        │
```

### 2. Creer une entree

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Teacher)   │     │                   │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  Click on day in grid │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │  GET /[classId]/[date]│                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  load(): verify owner  │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  SELECT entry (null)   │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { classData,        │                        │
       │     entry: null,      │                        │
       │     entryDate }       │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Render empty form    │                        │
       │  (RichTextEditor x2)  │                        │
       │                       │                        │
       │                       │                        │
       │  ═══════════════════════════════════════════  │
       │  User fills form and submits                   │
       │  ═══════════════════════════════════════════  │
       │                       │                        │
       │  POST ?/create        │                        │
       │  FormData:            │                        │
       │   - lessonContent     │                        │
       │   - homeworkContent   │                        │
       │   - homeworkDueDate   │                        │
       │   - isPublished       │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  validateCreate()      │
       │                       │  (Zod schema)          │
       │                       │                        │
       │                       │  createJournalEntry()  │
       │                       │───────────────────────►│
       │                       │                        │
       │                       │  1. Verify class owner │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  2. INSERT entry       │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { success: true,    │                        │
       │     entryId: "xxx" }  │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Toast "Entree creee" │                        │
       │  Form switches to     │                        │
       │  edit mode            │                        │
       │                       │                        │
```

### 3. Modifier une entree

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Teacher)   │     │                   │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  POST ?/update        │                        │
       │  FormData:            │                        │
       │   - entryId           │                        │
       │   - lessonContent     │                        │
       │   - homeworkContent   │                        │
       │   - homeworkDueDate   │                        │
       │   - isPublished       │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  validateUpdate()      │
       │                       │                        │
       │                       │  updateJournalEntry()  │
       │                       │───────────────────────►│
       │                       │                        │
       │                       │  UPDATE entry          │
       │                       │  WHERE id = ?          │
       │                       │  AND teacher_id = ?    │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { success: true }   │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Toast "Mise a jour"  │                        │
       │                       │                        │
```

### 4. Publier/Depublier

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Teacher)   │     │                   │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  Click toggle button  │                        │
       │  (Globe / EyeOff)     │                        │
       │                       │                        │
       │  POST ?/publish       │                        │
       │  FormData:            │                        │
       │   - entryId           │                        │
       │   - isPublished: true │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  updateJournalEntry()  │
       │                       │  { isPublished: true } │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { success: true,    │                        │
       │     isPublished: true}│                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Update button state  │                        │
       │  Toast "Publie"       │                        │
       │                       │                        │
```

### 5. Supprimer

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Teacher)   │     │                   │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  Click "Supprimer"    │                        │
       │                       │                        │
       │  ConfirmDialog opens  │                        │
       │                       │                        │
       │  Click "Confirmer"    │                        │
       │                       │                        │
       │  POST ?/delete        │                        │
       │  FormData:            │                        │
       │   - entryId           │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  deleteJournalEntry()  │
       │                       │───────────────────────►│
       │                       │                        │
       │                       │  DELETE FROM entries   │
       │                       │  WHERE id = ?          │
       │                       │  AND teacher_id = ?    │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   redirect(303,       │                        │
       │   "/cahier-texte?     │                        │
       │   class=xxx")         │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Navigate to week     │                        │
       │  view                 │                        │
       │                       │                        │
```

---

## Flux Eleve

### 1. Voir la semaine

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Student)   │     │      load()       │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  GET /cahier-texte    │                        │
       │  ?week=2024-01-15     │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  requireRole('student')│
       │                       │────────────────────────│
       │                       │                        │
       │                       │  SELECT class_members  │
       │                       │  WHERE student_id = ?  │
       │                       │  AND status = 'active' │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  SELECT entries        │
       │                       │  WHERE class_id IN (?) │
       │                       │  AND is_published=true │
       │                       │  AND entry_date<=today │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  getUpcomingHomework() │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { classes,          │                        │
       │     weekEntries,      │                        │
       │     upcomingHomework }│                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Render week view     │                        │
       │  + sidebar homework   │                        │
       │                       │                        │
```

### 2. Voir le detail d'une entree

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Student)   │     │      load()       │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  Click on entry card  │                        │
       │                       │                        │
       │  GET /[entryId]       │                        │
       │──────────────────────►│                        │
       │                       │                        │
       │                       │  requireRole('student')│
       │                       │────────────────────────│
       │                       │                        │
       │                       │  SELECT class_members  │
       │                       │  (verify membership)   │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  SELECT entry          │
       │                       │  WHERE id = ?          │
       │                       │  AND class_id IN (?)   │
       │                       │  AND is_published=true │
       │                       │  AND entry_date<=today │
       │                       │  + JOIN classes        │
       │                       │  + JOIN profiles       │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │   { entry,            │                        │
       │     classData,        │                        │
       │     teacherName }     │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Render detail view   │                        │
       │  (read-only)          │                        │
       │  + transformMathHtml  │                        │
       │                       │                        │
```

### 3. Voir les devoirs a venir

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────┐
│   Browser    │     │  +page.server.ts  │     │    Supabase     │
│  (Student)   │     │      load()       │     │                 │
└──────┬───────┘     └─────────┬─────────┘     └────────┬────────┘
       │                       │                        │
       │  (loaded with page)   │                        │
       │                       │                        │
       │                       │  getUpcomingHomework   │
       │                       │  (studentId, 14 days)  │
       │                       │───────────────────────►│
       │                       │                        │
       │                       │  SELECT entries        │
       │                       │  WHERE class_id IN     │
       │                       │    (active memberships)│
       │                       │  AND is_published=true │
       │                       │  AND entry_date<=today │
       │                       │  AND homework_content  │
       │                       │      IS NOT NULL       │
       │                       │  AND homework_due_date │
       │                       │      >= today          │
       │                       │  AND homework_due_date │
       │                       │      <= today + 14     │
       │                       │───────────────────────►│
       │                       │◄───────────────────────│
       │                       │                        │
       │                       │  Calculate daysUntilDue│
       │                       │  for each entry        │
       │                       │                        │
       │   upcomingHomework[]  │                        │
       │◄──────────────────────│                        │
       │                       │                        │
       │  Render HomeworkCard  │                        │
       │  components in sidebar│                        │
       │                       │                        │
```

---

## Flux de securite

### Verification d'acces enseignant

```
      ┌─────────────────────────────────────────────────────────┐
      │                    requireRole('teacher')               │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │            locals.session?.user existe?                 │
      │                                                         │
      │  NON ─────► throw redirect(303, '/login')              │
      └────────────────────────────┬────────────────────────────┘
                                   │ OUI
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │            profile.role === 'teacher'?                  │
      │                                                         │
      │  NON ─────► throw error(403, 'Acces refuse')           │
      └────────────────────────────┬────────────────────────────┘
                                   │ OUI
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                  Return { user, profile }               │
      └─────────────────────────────────────────────────────────┘
```

### Verification propriete classe

```
      ┌─────────────────────────────────────────────────────────┐
      │            SELECT FROM classes                          │
      │            WHERE id = classId                           │
      │            AND teacher_id = userId                      │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                     Result?                             │
      │                                                         │
      │  NULL ────► Return error "Non autorise"                │
      │  DATA ────► Continue operation                          │
      └─────────────────────────────────────────────────────────┘
```

### Filtrage eleve (RLS + serveur)

```
      ┌─────────────────────────────────────────────────────────┐
      │                     RLS Policy                          │
      │  "Students can view published journal entries"          │
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                 Conditions verifiees:                   │
      │                                                         │
      │  1. is_published = true                                 │
      │  2. entry_date <= CURRENT_DATE                          │
      │  3. EXISTS (class_members WHERE student_id = auth.uid())│
      └────────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │            + Verification serveur                       │
      │                                                         │
      │  status = 'active' (membership)                         │
      └─────────────────────────────────────────────────────────┘
```

---

## Flux de navigation

### Navigation URL (semaine)

```
  ┌────────────────────────────────────────────────────────────┐
  │  /dashboard/teacher/cahier-texte                           │
  │  ?week=2024-01-15                                          │
  │  &class=33333333-3333-4333-8333-333333333333              │
  └────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────┐
  │  +page.server.ts load()                                    │
  │                                                            │
  │  weekStart = url.searchParams.get('week') || getWeekStart()│
  │  classId = url.searchParams.get('class') || classes[0].id  │
  └────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────┐
  │  Client-side navigation                                    │
  │                                                            │
  │  function updateUrl(params) {                              │
  │    const url = new URL($page.url);                         │
  │    for (const [key, value] of Object.entries(params)) {    │
  │      url.searchParams.set(key, value);                     │
  │    }                                                       │
  │    goto(url.toString(), { replaceState: true });           │
  │  }                                                         │
  └────────────────────────────────────────────────────────────┘
```

### Navigation entre pages

```
  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
  │  Vue semaine    │────►│  Editeur entree │────►│  Vue semaine    │
  │  /cahier-texte  │     │  /[classId]/    │     │  (retour)       │
  │                 │     │  [date]         │     │                 │
  └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │ click day              │ goBack()
        │                        │
        ▼                        ▼
  goto(`/.../${classId}/${date}`) │  goto(`/cahier-texte?class=${classId}`)
```

---

## Transformation de donnees

### DB → Application

```
                   Database (snake_case)
  ┌─────────────────────────────────────────────────┐
  │  {                                              │
  │    id: "...",                                   │
  │    class_id: "...",                             │
  │    teacher_id: "...",                           │
  │    entry_date: "2024-01-15",                    │
  │    lesson_content: "...",                       │
  │    homework_content: "...",                     │
  │    homework_due_date: "2024-01-20",             │
  │    is_published: true,                          │
  │    created_at: "2024-01-15T10:00:00Z",          │
  │    updated_at: "2024-01-15T10:00:00Z"           │
  │  }                                              │
  └───────────────────────┬─────────────────────────┘
                          │
                          │ convertJournalEntry()
                          ▼
                   Application (camelCase)
  ┌─────────────────────────────────────────────────┐
  │  {                                              │
  │    id: "...",                                   │
  │    classId: "...",                              │
  │    teacherId: "...",                            │
  │    entryDate: "2024-01-15",                     │
  │    lessonContent: "...",                        │
  │    homeworkContent: "...",                      │
  │    homeworkDueDate: "2024-01-20",               │
  │    isPublished: true,                           │
  │    createdAt: "2024-01-15T10:00:00Z",           │
  │    updatedAt: "2024-01-15T10:00:00Z"            │
  │  }                                              │
  └─────────────────────────────────────────────────┘
```

### FormData → Input

```
                   FormData
  ┌─────────────────────────────────────────────────┐
  │  {                                              │
  │    lessonContent: "<p>...</p>",                 │
  │    homeworkContent: "<p>...</p>",               │
  │    homeworkDueDate: "2024-01-20",               │
  │    isPublished: "true"    // string!            │
  │  }                                              │
  └───────────────────────┬─────────────────────────┘
                          │
                          │ Build input object
                          ▼
                   Input Object
  ┌─────────────────────────────────────────────────┐
  │  {                                              │
  │    classId: params.classId,                     │
  │    entryDate: params.date,                      │
  │    lessonContent: formData.get('...') || null,  │
  │    homeworkContent: formData.get('...') || null,│
  │    homeworkDueDate: formData.get('...') || null,│
  │    isPublished: formData.get('...') === 'true'  │
  │  }                                              │
  └───────────────────────┬─────────────────────────┘
                          │
                          │ Zod validation
                          ▼
                   Validated Input
  ┌─────────────────────────────────────────────────┐
  │  CreateJournalEntryInput (type-safe)            │
  └─────────────────────────────────────────────────┘
```
