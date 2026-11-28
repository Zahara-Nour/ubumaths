# Lot tuteur-documents : 32 points (47 blocs après découpage)

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     42 |
| CORRIGÉ      |      2 |
| FAUX         |      1 |
| PAS UN ÉCART |      1 |
| NON VÉRIFIÉ  |      1 |
| DOUBLON      |      0 |

Aucun point du lot n'est dans `docs/ecarts/registre.md` (seuls V31, L32, L33 y parlent du tuteur : statistiques prof, recherche hybride, quotas ; aucun ne recoupe ce lot).

**Comment le tuteur est « suspendu » (D21, 2026-11-03) : il ne l'est pas dans le code.** Aucun interrupteur : `TutorChat` est toujours monté dans `ExerciseModal.svelte:329,511` et `exercice/[slug]/+page.svelte:522,693` (élève connecté), `/tuteur` et `/pere-ubu` existent ; `POST /api/chat` ne coupe que si `GROQ_API_KEY` est absente (`api/chat/+server.ts:171-179` et `323-331`, réponse 503), le RAG seulement si `ENABLE_RAG` est faux (`api/chat/+server.ts:139`). La pause est donc une décision de produit (plus de mise en avant, corpus vide : 0 document mesuré en prod le 2026-10-12), pas un état du code. Si la clé est encore posée sur Vercel, le tuteur répond toujours : **NON VÉRIFIÉ** (variables d'environnement de prod). Les points du tuteur ci-dessous sont proposés « suspendu avec le tuteur (D21) », comme V31 / L32 / L33.

## Points

### tuteur-ia.md:232 [L] — VRAI

- **Point** : `studentGrade` vient du client ; `ExerciseModal` et `/exercice/[slug]` ne l'envoient pas : tuteur réglé sur la 6e quel que soit le niveau.
- **Vu** : `ExerciseModal.svelte:106-114` (contexte = `exerciseId`, `statement`, `solution`) ; `exercice/[slug]/+page.svelte:182-186` (idem) ; `api/chat/+server.ts:98` `exerciseContext?.studentGrade || '6'`, repris pour le RAG (`:143`). Seul `/tuteur/+page.server.ts:20` envoie `profile.grade`.
- **Registre** : L · tuteur IA · dans la fenêtre d'un exercice, le tuteur parle à tout élève comme à un élève de 6e et cherche ses extraits en 6e · preuve : commande `test -f src/lib/components/student/worksheets/ExerciseModal.svelte && grep -q "studentGrade" src/lib/components/student/worksheets/ExerciseModal.svelte` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:235 [L] — VRAI

- **Point** : le niveau d'aide monte à chaque message ; dès le 8e échange, « va voir ton professeur », alors que le quota par exercice autorise 15.
- **Vu** : `TutorChat.svelte:107` part de 0, `:516` `helpLevel = Math.min(helpLevel + 1, TUTOR_MAX_HELP_LEVEL)` après chaque réponse (sauf triche) ; `tutor-limits.ts:34` max = 7, `:16` `TUTOR_MAX_PER_EXERCISE = 15` ; `tutor-prompts.ts:963-964` ajoute `REDIRECT_TO_TEACHER_PROMPT` dès `helpLevel >= 7`, `tutor-help-methods.ts:316` choisit `redirect_to_teacher`.
- **Registre** : L · tuteur IA · à partir du 8e message sur un exercice, le tuteur ne fait plus que renvoyer l'élève vers son professeur alors qu'il lui reste 7 messages · preuve : test à écrire (8e envoi de `TutorChat` sans erreur ni triche : le prompt construit ne contient pas la redirection tant que le quota n'est pas presque épuisé) · suspendu avec le tuteur (D21)

### tuteur-ia.md:238 (a) insertion des messages sans vérifier les lignes [L] — FAUX

- **Point** : l'insertion des messages du tuteur échoue en silence.
- **Vu** : `api/chat/+server.ts:257-263` : un `insert` refusé par la RLS rend une erreur (42501), il n'est pas silencieux. Ce qui est vrai : l'erreur est seulement journalisée et la réponse part quand même (message non enregistré, l'élève n'en sait rien), choix assumé du bloc `try` (`:244-283`).

### tuteur-ia.md:238 (b) mise à jour de la conversation et `DELETE` des messages sans `.select()` [L] — VRAI

- **Vu** : `api/chat/+server.ts:266-272` (`update` sans `.select()`) ; `api/tutor/conversations/[id]/messages/+server.ts:123-126` (`delete` sans `.select()`, puis `:134-140` `update` idem) : un refus RLS rend 200 « effacé ».
- **Registre** : L · tuteur IA · « Effacer la conversation » peut annoncer un succès sans rien avoir effacé · preuve : test à écrire (route `DELETE …/messages` dont le client rend 0 ligne : réponse d'erreur, pas 200) · suspendu avec le tuteur (D21)

### tuteur-ia.md:238 (c) indexation `success` sans embeddings [L] — VRAI

- **Vu** : `server/rag/processor.ts:150` `embedding: embeddings ? … : null` ; `:158-163` une erreur d'insertion de fragments est journalisée puis ignorée ; `:166-170` rend `success: true, chunksCreated: chunks.length` dans les deux cas.
- **Registre** : L · tuteur IA · un document déposé par le prof est annoncé indexé même quand aucun fragment n'a été enregistré ou vectorisé · preuve : commande `test -f src/lib/server/rag/processor.ts && ! grep -q "embedding: embeddings ? formatEmbedding(embeddings\[index\]) : null" src/lib/server/rag/processor.ts` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:242 [L] — VRAI

- **Point** : deux écritures de `max_help_level_reached` et de `message_count` (trigger puis `/api/chat`).
- **Vu** : trigger `increment_tutor_message_count` (`20260616220000_baseline_schema.sql:11843-11858`, jamais redéfini ; `20261001170000` ne touche que les droits) fait `+1` et `GREATEST` ; puis `api/chat/+server.ts:268-271` écrase `message_count: messages.length + 1` et `max_help_level_reached: helpLevel` (niveau repartant à 0 au rechargement).
- **Registre** : L · tuteur IA · le niveau d'aide maximal et le nombre de messages d'une conversation peuvent redescendre après un rechargement de la page · preuve : commande `test -f src/routes/api/chat/+server.ts && ! grep -q "max_help_level_reached: helpLevel" src/routes/api/chat/+server.ts` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:248 [L] — VRAI

- **Vu** : `server/tutor/tutor-rate-limiter.ts:41,45` `createClient` + `import { config } from 'dotenv'`, `:84-96` lit `process.env` et crée son client service.
- **Registre** : L · tuteur IA · aucun effet visible, le limiteur du tuteur fabrique son propre accès privilégié à la base au lieu du client commun · preuve : commande `test -f src/lib/server/tutor/tutor-rate-limiter.ts && ! grep -q "from 'dotenv'" src/lib/server/tutor/tutor-rate-limiter.ts` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:263 [L] — VRAI

- **Vu** : `effort_score` / `topics_covered` lus seulement (`api/tutor/stats/+server.ts:132-133,208,251,281`, export `api/account/export/+server.ts:221`) ; aucune écriture dans `src` ni dans les migrations (seule la colonne `baseline_schema.sql:29627`). `api/chat/+server.ts:94` calcule `effortScore` sans l'enregistrer.
- **Registre** : L · tuteur IA · les colonnes « effort moyen » et « thèmes » des statistiques du tuteur restent à 0 et vides · preuve : commande `grep -rqE "(effort_score|topics_covered):" src/routes/api/chat src/routes/api/tutor/conversations` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:276 (a) `GROQ_MODEL` ignoré [L] — VRAI

- **Vu** : `server/env.ts:75` déclare `GROQ_MODEL` ; `api/chat/+server.ts:183` et `:349-351` modèles en dur (`llama-3.3-70b-versatile`).
- **Registre** : L · tuteur IA · aucun effet visible, changer le modèle dans la configuration ne change pas le modèle utilisé · preuve : commande `test -f src/routes/api/chat/+server.ts && grep -q "GROQ_MODEL" src/routes/api/chat/+server.ts` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:276 (b) `enabledForRag` du dépôt ignoré [L] — VRAI

- **Vu** : `api/documents/upload/+server.ts:73,96` lit `enabledForRag` mais ne le passe pas à `indexDocument` (`:118-132`) ; `rag/processor.ts:93` force `enabled_for_rag: true`. Même écart que organisation-et-documents.md:179 (c) : une seule ligne.
- **Registre** : L · tuteur IA · un document déposé « non activé pour le tuteur » est quand même proposé au tuteur · preuve : commande `test -f src/routes/api/documents/upload/+server.ts && grep -q "metadata.enabledForRag" src/routes/api/documents/upload/+server.ts` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:278 (a) aucun lien vers `/tuteur`, `/dashboard/tutor-stats`, `/dashboard/teacher/documents` [C] — VRAI

- **Vu** : grep des chaînes `'/tuteur'`, `/dashboard/tutor-stats`, `/dashboard/teacher/documents` dans `src` : seuls les noms de logger des pages elles-mêmes. Pages orphelines, cohérent avec la pause.
- **Registre** : C · tuteur IA · trois pages du tuteur n'ont aucun lien qui y mène (on n'y arrive qu'en tapant l'adresse) · preuve : commande ``grep -rlE "[\"'\`]/(tuteur|dashboard/tutor-stats|dashboard/teacher/documents)[\"'\`?]" src --include='*.svelte' --include='*.ts' | grep -q .`` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:278 (b) `/pere-ubu` sans `BackLink` [C] — VRAI

- **Vu** : `pere-ubu/+page.svelte:63-65` `<Button variant="ghost" href="/">` « Retour à l'accueil » (règle 7 de `CLAUDE.md`). Lettre corrigée : V (bouton visible hors règle).
- **Registre** : V · tuteur IA · la page du Père Ubu garde un bouton « Retour à l'accueil » maison au lieu du lien de retour commun · preuve : commande `test -f "src/routes/(public)/pere-ubu/+page.svelte" && grep -q "BackLink" "src/routes/(public)/pere-ubu/+page.svelte"` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:280 [M] — VRAI

- **Vu** : `TutorWidget`, `TutorHelpButton` cités seulement par `components/tutor/index.ts` ; `determineMaxHelpLevel`, `shouldEscalate`, `escalate`, `createInitialState` seulement dans `server/tutor/help-escalation.ts` ; `searchSimilarExercises`, `batchIndexDocuments`, `reindexAllDocuments` seulement dans `server/rag/{search,processor,index}.ts`.
- **Registre** : M · tuteur IA · aucun effet visible, composants et fonctions du tuteur sans appelant · preuve : commande `! test -f src/lib/server/tutor/help-escalation.ts && ! test -f src/lib/components/tutor/TutorWidget.svelte && ! test -f src/lib/components/tutor/TutorHelpButton.svelte` (sortie 1) · suspendu avec le tuteur (D21)

### tuteur-ia.md:283 [C] — VRAI

- **Point** : `base-de-donnees.md` dit que le prof lit les conversations de tous les élèves.
- **Vu** : `docs/systeme/base-de-donnees.md:704-705` « le professeur lit celles de tous les élèves ». Policy des messages (dernière définition `20260620090000_drop_class_teacher_id_mono_teacher.sql:3390`) : élève propriétaire, ou conversation **avec** `class_id` + `is_teacher_or_admin()`, ou admin ; `class_id` toujours NULL (V31) → le prof ne lit aucun message. Conversations : `is_my_student` (`baseline_schema.sql:39722`).
- **Registre** : C · documentation · aucun effet visible, la doc de la base dit que le prof lit les conversations du tuteur de tous ses élèves alors qu'il n'en lit pas les messages · preuve : commande `test -f docs/systeme/base-de-donnees.md && ! grep -q "celles de tous les élèves" docs/systeme/base-de-donnees.md` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:164 (a) l'admin « voit tout » mais la RLS ne suit pas [T] — VRAI

- **Vu** : `api/documents/+server.ts:48-51` « admins see all » (pas de filtre `teacher_id` pour l'admin) ; policies SELECT de `rag_documents` : `baseline_schema.sql:39435` « Teachers can read own and system documents » (`teacher_id IS NULL OR = auth.uid()`) et `20260620090000_drop_class_teacher_id_mono_teacher.sql:3487` (policy élève, dernière définition ; aucune migration plus récente ne redéfinit ces policies : `20260930140000`, `20261001170000`, `20261007210000`, `20261024183700`, `20261104224856` ne font que lire la table ou ses droits `anon`). Aucune policy admin. Lettre corrigée : L (l'admin voit moins, pas plus : aucune fuite).
- **Registre** : L · documents · l'admin croit voir tous les documents du tuteur dans la liste, il ne voit que les siens et ceux du système · preuve : test à écrire (intégration : document d'un prof, `GET /api/documents` en admin le liste) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:164 (b) `PATCH` / `DELETE` d'un document d'autrui : succès sans effet [T] — VRAI

- **Vu** : `api/documents/+server.ts:164` et `:225` sautent la vérification de propriété pour l'admin ; `rag/processor.ts` `deleteDocument` / `disableDocument` (`:211-214`) / `enableDocument` (`:231-234`) et l'`update` de la route (`:262-265`) sans `.select()` ; policies UPDATE / DELETE `teacher_id = auth.uid()` (`baseline_schema.sql:39525`, `:39103`) → 0 ligne, réponse `success: true` (`:190`, `:272`). Lettre corrigée : L.
- **Registre** : L · documents · un admin qui désactive ou supprime le document d'un professeur reçoit « fait » alors que rien n'a changé · preuve : test à écrire (intégration : `DELETE /api/documents` en admin sur le document d'un prof rend une erreur, ou la ligne a disparu) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:170 [V] — VRAI

- **Vu** : `DocumentManager.svelte:47-56` n'envoie que `page`, `limit`, `search` ; `validation/documents.ts:67-70` `enabledOnly` par défaut `'true'` ; `api/documents/+server.ts:66-68` filtre `enabled_for_rag = true`.
- **Registre** : V · documents · un document que le prof désactive disparaît de sa liste au rechargement : il ne peut plus le réactiver ni le supprimer · preuve : commande `test -f src/lib/components/documents/DocumentManager.svelte && grep -q "enabledOnly" src/lib/components/documents/DocumentManager.svelte` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:173 [T] — VRAI

- **Point** : la policy élève de `rag_documents` ignore le statut de l'adhésion.
- **Vu** : dernière définition `20260620090000_drop_class_teacher_id_mono_teacher.sql:3487` : `teacher_id IS NULL OR (teacher_id d'un prof AND EXISTS class_members WHERE student_id = auth.uid())`, sans `status = 'active'` ; même chose pour `rag_chunks` (`:3489`). Le RAG lit avec le client de l'élève (`api/chat/+server.ts:141` `hybridSearch(locals.supabase, …)`), donc cette policy décide de ce que le tuteur peut citer. Corpus vide en prod (D21) : aucun document exposé aujourd'hui.
- **Registre** : T · tuteur IA · un élève retiré (archivé) de sa classe peut encore lire les documents déposés par le professeur, et le tuteur les lui citer · preuve : test à écrire (intégration : élève à l'adhésion archivée, `select` sur `rag_documents` d'un prof rend 0 ligne) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:176 [L] — CORRIGÉ

- **Point** : policy storage élève absente du baseline local, 500 en local, chemin de prod non testable.
- **Vu** : la policy de prod « Students can read visible chapter documents » a été supprimée partout par `20261016103800_modeles_ancien_systeme_supprime.sql:110` (`drop policy if exists … on storage.objects`). L'élève passe désormais par `api/documents/[id]/+server.ts:15-21` : lecture de la ligne avec son client (RLS), puis téléchargement par le client service. Prod et local ont donc la même règle (aucune). La mention dans `organisation-et-documents.md:176` est périmée.

### organisation-et-documents.md:179 (a) `documentId` non validé en UUID [L] — VRAI

- **Vu** : `api/documents/+server.ts:212-216` `typeof documentId !== 'string'` seulement (le `DELETE` passe par `documentDeleteSchema`).
- **Registre** : L · documents · aucun effet visible, la modification d'un document accepte un identifiant qui n'est pas un UUID · preuve : commande `test -f src/routes/api/documents/+server.ts && ! grep -q "typeof documentId !== 'string'" src/routes/api/documents/+server.ts` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:179 (b) `description` acceptée, jamais écrite [L] — VRAI

- **Vu** : `validation/documents.ts:78` accepte `description` ; `api/documents/+server.ts:256-259` n'écrit que `title`, `grades`, `topics`.
- **Registre** : L · documents · une description envoyée à la modification d'un document est acceptée puis perdue · preuve : commande `test -f src/routes/api/documents/+server.ts && grep -q "validation.data.description" src/routes/api/documents/+server.ts` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:179 (c) `enabledForRag` du dépôt ignoré [L] — VRAI

- **Vu** : même écart que tuteur-ia.md:276 (b) ; une seule ligne au registre (celle-là).

### organisation-et-documents.md:182 (a) `mimeType.endsWith('.md')` jamais vrai [L] — VRAI

- **Vu** : `server/documents/pdf-extractor.ts:192`. Lettre corrigée : M (branche morte).
- **Registre** : voir (b), une seule ligne.

### organisation-et-documents.md:182 (b) `text/x-markdown` traité en texte brut [L] — VRAI

- **Vu** : `validation/documents.ts:16` accepte `text/x-markdown` ; `pdf-extractor.ts:192-195` ne reconnaît que `text/markdown`, le reste tombe dans `startsWith('text/')` → `extractTextFromPlainText` (`:216-217`) au lieu de `extractTextFromMarkdown` (`:207-208`).
- **Registre** : L · documents · un fichier Markdown envoyé par certains navigateurs est indexé comme texte brut, symboles de mise en forme compris · preuve : commande `test -f src/lib/server/documents/pdf-extractor.ts && ! grep -q "mimeType.endsWith('.md')" src/lib/server/documents/pdf-extractor.ts` (sortie 1 ; verte quand le test est remplacé par `text/x-markdown`) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:184 [C] — VRAI

- **Vu** : `api/documents/[id]/+server.ts:8-9` annonce `/view` et `/download` ; seul `?download` existe (`:58`).
- **Registre** : C · documents · aucun effet visible, l'en-tête de la route des documents annonce deux adresses qui n'existent pas · preuve : commande `test -f "src/routes/api/documents/[id]/+server.ts" && ! grep -q "/view - View" "src/routes/api/documents/[id]/+server.ts"` (sortie 1) · à faire

### organisation-et-documents.md:186 (a) bouton « Modifier » désactivé [V] — VRAI

- **Vu** : `components/documents/DocumentCard.svelte:163` `disabled title="Modifier (bientôt disponible)"`, alors que `PATCH /api/documents` existe.
- **Registre** : V · documents · le prof voit un bouton « Modifier » grisé « bientôt disponible » sur chaque document · preuve : commande `test -f src/lib/components/documents/DocumentCard.svelte && ! grep -q "bientôt disponible" src/lib/components/documents/DocumentCard.svelte` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:186 (b) suppression par `confirm()` natif [V] — VRAI

- **Vu** : `DocumentCard.svelte:41` `confirm('Êtes-vous sûr…')`.
- **Registre** : V · documents · supprimer un document ouvre la boîte de confirmation du navigateur au lieu de celle du site · preuve : commande `test -f src/lib/components/documents/DocumentCard.svelte && ! grep -q "confirm(" src/lib/components/documents/DocumentCard.svelte` (sortie 1) · suspendu avec le tuteur (D21)

### organisation-et-documents.md:188 (a) clé `localStorage` du Pomodoro commune à tous les comptes [L] — VRAI

- **Vu** : `stores/pomodoro/logic.ts:51` `STORAGE_KEY = 'chiphre:pomodoro:v1'` ; lu et écrit par `pomodoro.svelte.ts:206,286` ; rien ne l'efface à la déconnexion (aucun `removeItem` dans `stores/pomodoro/`).
- **Registre** : L · organisation · sur un ordinateur partagé, l'élève suivant retrouve le minuteur Pomodoro et le compteur du jour du précédent · preuve : commande `test -f src/lib/stores/pomodoro/logic.ts && ! grep -q "STORAGE_KEY = 'chiphre:pomodoro:v1'" src/lib/stores/pomodoro/logic.ts` (sortie 1) · à faire

### organisation-et-documents.md:188 (b) commentaire de `tick` renvoie à un design doc introuvable [C] — VRAI

- **Vu** : `stores/pomodoro/logic.ts:192` « option B in the design doc » ; `docs/archive/wip/pomodoro-progress.md` ne parle pas d'option B.
- **Registre** : C · organisation · aucun effet visible, un commentaire du Pomodoro renvoie à un document de conception absent du dépôt · preuve : commande `test -f src/lib/stores/pomodoro/logic.ts && ! grep -q "in the design doc" src/lib/stores/pomodoro/logic.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:431 [C] — VRAI

- **Vu** : `server/errorMonitoring.ts:367` `system_event_type: 'assessment_graded' // Note: 'error_critical' not in SystemEventType enum`.
- **Registre** : C · surveillance · une alerte d'erreur critique est rangée parmi les « évaluation corrigée » faute de type adapté · preuve : commande `test -f src/lib/server/errorMonitoring.ts && ! grep -q "system_event_type: 'assessment_graded'" src/lib/server/errorMonitoring.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:433 [T] — VRAI

- **Point** : supprimer un rapport de bug ne supprime pas sa capture d'écran.
- **Vu** : `api/bug-reports/[reportId]/+server.ts:226-230` et `api/bug-reports/batch/+server.ts:118-122` suppriment la ligne `bug_reports` (avec `.select('id')`, bien vérifié) et ne touchent jamais au bucket `bug-report-screenshots` (seul `…/screenshot/+server.ts:105` en retire une, au remplacement). Policy DELETE de la table : `baseline_schema.sql:37581` « Admins can delete bug reports » (`is_admin()`), jamais redéfinie. Aucun trigger ni purge de rétention sur `bug_reports` ; seule la suppression de compte nettoie les captures (`20261016101200_suppression_chemins_conformes.sql:83-85`, dernière définition). Les policies storage du bucket ne sont dans aucune migration : NON VÉRIFIÉ si l'admin pourrait les effacer avec son client.
- **Registre** : T · conformité · quand l'admin supprime un signalement, la capture d'écran de l'élève reste dans le stockage, sans plus aucun lien vers elle · preuve : commande `test -f "src/routes/api/bug-reports/[reportId]/+server.ts" && grep -q "storage" "src/routes/api/bug-reports/[reportId]/+server.ts" && grep -q "storage" src/routes/api/bug-reports/batch/+server.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:435 (a) filtres de `/dashboard/admin/errors` sans Zod [L] — VRAI

- **Vu** : `dashboard/admin/errors/+page.server.ts:16-26` `searchParams.get('type' | 'severity' | 'resolved' | 'search')` passés tels quels à `getErrorOccurrences`.
- **Registre** : voir (c), une seule ligne pour les trois.

### surveillance-des-erreurs.md:435 (b) `notes` de l'action `resolve` sans borne [L] — VRAI

- **Vu** : `dashboard/admin/errors/[id]/+page.server.ts:38-42` `formData.get('notes') as string`.

### surveillance-des-erreurs.md:435 (c) filtres de `/dashboard/admin/bug-reports` sans Zod [L] — VRAI

- **Vu** : `dashboard/admin/bug-reports/+page.server.ts:23-25` `status`, `category`, `severity` lus tels quels.
- **Registre** : L · surveillance · aucun effet visible, les filtres des pages admin des erreurs et des signalements et la note de résolution ne sont pas validés · preuve : commande `test -f "src/routes/(protected)/dashboard/admin/errors/[id]/+page.server.ts" && ! grep -q "formData.get('notes') as string" "src/routes/(protected)/dashboard/admin/errors/[id]/+page.server.ts" && grep -q "safeParse" "src/routes/(protected)/dashboard/admin/errors/+page.server.ts" && grep -q "safeParse" "src/routes/(protected)/dashboard/admin/bug-reports/+page.server.ts"` (sortie 1) · à faire

### surveillance-des-erreurs.md:438 [C] — VRAI

- **Vu** : `stores/bugReportsConfig.svelte.ts:42` « Only admins can load the config » ; `api/bug-reports/config/+server.ts:5,26` GET = `requireAuth` ; policy `baseline_schema.sql:38214` « Authenticated users can view bug_reports_config » `USING (true)`.
- **Registre** : C · surveillance · aucun effet visible, un commentaire dit la configuration des signalements réservée aux admins alors que tout compte la lit · preuve : commande `test -f src/lib/stores/bugReportsConfig.svelte.ts && ! grep -q "Only admins can load the config" src/lib/stores/bugReportsConfig.svelte.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:441 [L] — VRAI

- **Vu** : `hooks.client.ts:23` `initFreezeDetection()` sans condition ; `utils/freezeDetection.ts:323-326` (`capturePerformance`) et `:511-517` (`captureError` « UI unresponsive ») envoient toujours ; le drapeau ne sert que dans `dashboard/+layout.svelte:203-204,216-217` (proposition et envoi auto d'un signalement).
- **Registre** : L · surveillance · couper « Détection des freezes » dans la configuration n'arrête pas l'envoi des erreurs de gel · preuve : test à écrire (drapeau à false : `initFreezeDetection` n'envoie aucun `captureError`) · à faire

### surveillance-des-erreurs.md:443 [M] — VRAI

- **Vu** : `utils/freezeDetection.ts:680-690` `reportWebVital` « called from errorMonitoring.ts » ; `errorMonitoring.ts:606` a sa propre fonction locale du même nom et n'importe rien de `freezeDetection` ; `updateWebVitals` (`:197`) sans appelant non plus.
- **Registre** : M · surveillance · les signalements de gel n'ont jamais leurs mesures de performance (champ toujours vide) · preuve : commande `test -f src/lib/utils/freezeDetection.ts && ! grep -q "This is called from errorMonitoring.ts" src/lib/utils/freezeDetection.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:446 (a) la recherche `?q=` de la doc admin ne cherche rien [V] — VRAI

- **Vu** : `dashboard/admin/docs/+page.server.ts:16` lit `q` et le renvoie tel quel (`:24`) ; aucun filtre ; `+page.svelte:28,128-131` l'affiche.
- **Registre** : voir (b), une seule ligne.

### surveillance-des-erreurs.md:446 (b) `CATEGORY_CONFIG` nomme des dossiers disparus [V] — VRAI

- **Vu** : `server/docs-scanner.ts:17-24` : `features`, `architecture`, `guides`, `development`, `contributing`, `archive`. Dans le dépôt suivi, seul `archive` existe (`docs/architecture` et `docs/guides` sont des dossiers vides non suivis sur la machine, absents de git). `systeme`, `pratiques`, `adr` prennent l'icône par défaut et l'ordre 99.
- **Registre** : V · documentation · dans la doc de l'admin, la recherche s'affiche mais ne filtre rien, et les rubriques sont classées d'après des dossiers qui n'existent plus · preuve : commande `test -f src/lib/server/docs-scanner.ts && ! grep -q "features: {" src/lib/server/docs-scanner.ts && grep -q "searchQuery" "src/routes/(protected)/dashboard/admin/docs/+page.server.ts" && grep -qi "filter\|search(" "src/routes/(protected)/dashboard/admin/docs/+page.server.ts"` (sortie 1) · à faire

### surveillance-des-erreurs.md:446 (c) `docs/` présent dans le déploiement Vercel — NON VÉRIFIÉ

- **Vu** : `docs-scanner.ts:15` et `admin/docs/+page.server.ts:19-20` lisent `process.cwd()/docs` à la requête. Demande d'ouvrir `/dashboard/admin/docs` en prod (compte admin) et de voir si la liste et le README s'affichent.

### surveillance-des-erreurs.md:451 [C] — VRAI

- **Vu** : `server/openapi/generator.ts:177-559` : 11 chemins ; 382 fichiers `+server.ts` sous `src/routes` ; sans route : `/api/messages`, `/api/questions`, `/api/notifications` (seulement des sous-routes) et `/api/rewards/award` (dossier absent).
- **Registre** : C · documentation · aucun effet visible, la description de l'API pour l'admin ne couvre que 11 routes sur environ 380, dont 4 qui n'existent plus · preuve : commande `test -f src/lib/server/openapi/generator.ts && ! grep -q "'/api/rewards/award'" src/lib/server/openapi/generator.ts && ! grep -q "'/api/messages': {" src/lib/server/openapi/generator.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:453 [C] — VRAI

- **Vu** : `server/healthStats.ts:5-6,16` « not yet in the generated database.ts » ; `types/database.ts:423` `background_job_runs`, `:10521` `server_cache`, 10 occurrences `admin_`.
- **Registre** : C · surveillance · aucun effet visible, l'en-tête des statistiques de santé dit des tables absentes des types alors qu'elles y sont · preuve : commande `test -f src/lib/server/healthStats.ts && ! grep -q "not yet in the generated database.ts" src/lib/server/healthStats.ts` (sortie 1) · à faire

### surveillance-des-erreurs.md:455 [L] — VRAI

- **Vu** : `api/latex/compile/+server.ts:37-39` `throw error(400, …)` et `:56-58` `throw error(response.status, …)` dans le `try` ; `:71-74` le `catch` relance tout en 500 « Compilation failed: Unknown error » (pas de `isHttpError`).
- **Registre** : L · LaTeX · une formule refusée par la validation renvoie « erreur serveur 500 » au lieu d'un refus clair · preuve : commande `test -f src/routes/api/latex/compile/+server.ts && grep -q "isHttpError" src/routes/api/latex/compile/+server.ts` (sortie 1) · à faire

### base-de-donnees.md:795 [L] — VRAI

- **Point** : `curriculum_points` : 5 des 6 clés étrangères en CASCADE.
- **Vu** : aujourd'hui 7 clés (`types/database.ts`, `referencedRelation: 'curriculum_points'`) : CASCADE pour `curriculum_point_automatismes` (`20260830080000…:76`), `exercise_curriculum_points` et `journal_entry_points` (`20260621100000_curriculum_tracking.sql:85,126`), `student_point_state` et `srs_anti_fraud_flags` (`20260829100000_refonte_referentiel_fusion.sql:246,291`) ; RESTRICT pour `question_template_points` (`:225`) ; SET NULL pour `student_beasts` (`20261118060323_descente_fondations.sql:80`, nouvelle). Donc 5 sur 7, toujours vrai. Aucun trigger ni garde contre la suppression ; aucun `.delete()` du code sur la table.
- **Registre** : L · base de données · supprimer un point du programme effacerait sans prévenir la couverture du cahier de texte et l'acquisition des élèves sur ce point · preuve : test à écrire (intégration : supprimer un point qui a un état d'élève est refusé) · à faire

### base-de-donnees.md:798 [L] — VRAI

- **Vu** : `20260621100000_curriculum_tracking.sql:101` `exercise_id … on delete set null` ; dernier CHECK `journal_entry_activities_kind_shape` (`20260930150000_drop_assessments.sql:775-781`) exige `kind = 'exercise' and exercise_id is not null`. Aucune migration plus récente ne change l'un ou l'autre.
- **Registre** : L · base de données · un prof ne peut pas supprimer un exercice dès qu'une séance du cahier de texte le cite (erreur de contrainte) · preuve : test à écrire (intégration : supprimer un exercice cité par une activité de séance réussit, l'activité disparaît ou est gardée) · à faire

### base-de-donnees.md:801 (a) deux générations de seeds du programme [L] — CORRIGÉ

- **Vu** : `20261022080000_suppression_ancien_programme.sql:12-16,98-…` supprime les 1 007 anciens points, la colonne `objective_id` et la contrainte `curriculum_points_one_generation` (`:124`) : il ne reste qu'une génération. Les anciennes migrations de seeds restent dans l'historique (rejouées puis effacées sur une base neuve). Doc périmée.

### base-de-donnees.md:801 (b) le rollback des nouveaux seeds devient destructif [L] — PAS UN ÉCART

- **Vu** : rollback en commentaire (`20261008190000_seed_curriculum_points_6e.sql:11-32`, `delete from public.curriculum_points …`). Mise en garde d'usage sur des migrations déjà jouées en prod, pas un défaut du code.

## Vu en passant

- `static/openapi.json` (suivi par git, 8 chemins) est servi publiquement alors que `/api/openapi.json` a été réservé à l'admin (finding L2, `api/openapi.json/+server.ts:17-20`).
- `journal_entry_activities.question_template_id` et `evaluation_id` : même question SET NULL contre CHECK de forme à vérifier (non regardé).
- `documentListQuerySchema.topic` (`validation/documents.ts:66`) : `z.string()` sans `.max()`.
