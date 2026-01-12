# Export Whiteboard vers Google Classroom - Progression

## Statut actuel

**Phase**: 3 - Endpoint API d'export
**Dernière mise à jour**: 2026-01-12

---

## Phases complétées

### Phase 1: Mise à jour OAuth Scopes ✅

- Commit: `d91db8e8`
- Modification: `classroom.courseworkmaterials.readonly` → `classroom.courseworkmaterials`

### Phase 2: Implémenter createCourseWorkMaterial() ✅

- Commit: `a7722a65`
- Fichiers: schemas.ts, google.ts, classroom-api.ts
- Validation Zod, méthode POST, gestion erreurs

---

## Phase en cours

### Phase 3: Endpoint API d'export

**Fichier créé**:

- `src/routes/api/whiteboard/export-to-classroom/+server.ts`

**Flow implémenté**:

1. Validation inputs avec Zod (pdfBase64, courseId, topicId, title, description)
2. `requireRole(locals, 'teacher')`
3. Vérifier ownership du cours via Supabase
4. Vérifier topicId si fourni
5. `getTeacherAccessToken()` avec refresh auto
6. Décoder PDF base64 → binary
7. `GoogleDriveClient.createFile()` → upload PDF
8. `GoogleClassroomClient.createCourseWorkMaterial()` → créer material
9. Retourner materialId, alternateLink, driveFileId

---

## Décisions prises

1. **État par défaut**: PUBLISHED (les élèves voient le material immédiatement)
2. **Limite PDF**: 15MB max (20MB après encodage base64)
3. **shareMode**: VIEW par défaut (lecture seule pour les élèves)
4. **Dossier Drive**: "UbuMaths Whiteboards"
5. **courseId**: UUID interne (pas google_course_id)

---

## Fichiers modifiés

| Fichier                                                    | Action     | Phase |
| ---------------------------------------------------------- | ---------- | ----- |
| `src/lib/server/google/oauth.ts`                           | Modifié ✅ | 1     |
| `src/lib/server/google/schemas.ts`                         | Modifié ✅ | 2     |
| `src/lib/types/google.ts`                                  | Modifié ✅ | 2     |
| `src/lib/server/google/classroom-api.ts`                   | Modifié ✅ | 2     |
| `src/routes/api/whiteboard/export-to-classroom/+server.ts` | Créé       | 3     |

---

## Prochaines étapes

1. Code review + Security audit Phase 3
2. Commit Phase 3
3. Créer composant dialog (Phase 4)
