---
couvre:
  - 'src/lib/server/{tutor,rag}/**'
  - 'src/lib/config/tutor-*.ts'
  - 'src/lib/components/tutor/**'
  - 'src/routes/api/tutor/**'
  - 'src/routes/(protected)/tuteur/**'
  - 'src/routes/(protected)/dashboard/tutor-stats/**'
  - src/lib/components/ChatBot.svelte
  - src/lib/utils/chat-request.ts
  - src/lib/utils/chat-history.ts
  - 'src/routes/(public)/pere-ubu/**'
---

# Le tuteur IA (Père Ubu) et sa recherche documentaire (RAG)

> Vérifié contre le code le 2026-10-12 (commit 4ab55c5e8).
> Sujets déjà documentés, cités et non recopiés : [auth.md](auth.md) (`requireAuth`, rôles),
> [serveur.md](serveur.md) (§ 1.5 les limiteurs de débit, § 3 les tâches planifiées),
> [base-de-donnees.md](base-de-donnees.md) (modèle d'accès), [conformite/](conformite/README.md)
> (registre des sous-traitants, rétention, consentement parental).

## À quoi ça sert

Un élève connecté pose ses questions de mathématiques à un modèle de langage qui joue le Père Ubu.
Deux usages, un seul endpoint (`POST /api/chat`, `src/routes/api/chat/+server.ts`, hors zone mais
cœur du système) :

- **le tuteur** (`tutorMode: true`) : guide sans donner la réponse, prompt construit côté serveur,
  quotas propres, détection de triche, RAG, et conversation enregistrée en base quand l'exercice
  vient d'une feuille assignée ;
- **le chat libre** (sans `tutorMode`) : le composant `ChatBot.svelte` de la page `/pere-ubu`. Le
  navigateur nomme la personnalité (`personality`, `buildChatRequestBody` dans
  `src/lib/utils/chat-request.ts`) ; le serveur pose lui-même son prompt système, tiré de
  `src/lib/config/personalities.ts`. Sans personnalité nommée, c'est le Père Ubu : aucun chat ne
  part sans consignes. Un tour `system` envoyé par le client reste refusé (finding H11).

Le RAG ajoute au prompt du tuteur des extraits de documents déposés par le professeur.

## Ce que voit l'élève

1. **Dans un exercice d'une feuille assignée** (`src/lib/components/student/worksheets/ExerciseModal.svelte`) :
   un panneau `TutorChat` à droite (bureau) ou un tiroir (mobile). La conversation est retrouvée ou
   créée à l'ouverture (`GET` puis `POST /api/tutor/conversations`), ses messages rechargés, et
   l'élève peut l'effacer (icône corbeille → `DELETE …/messages`).
2. **Sur un exercice partagé** (`/exercice/[slug]`), seulement si l'élève est connecté : le même
   `TutorChat`, mais sans `assignmentId`, donc **rien n'est enregistré** en base.
3. **Sur `/tuteur`** : `TutorChat` sans exercice (`statement: ''`), niveau lu dans `profile.grade`
   (`'6'` par défaut, `src/routes/(protected)/tuteur/+page.server.ts:20`). Aucune page n'y mène
   (`git grep` : aucun lien dans `src`).
4. **Sur `/pere-ubu`** : connecté, le `ChatBot` ; visiteur, « Cornegidouille ! Qui va là ? » et un
   bouton « Se connecter » (`?redirectTo=/pere-ubu`). Cliquer Père Ubu affiche une réplique au
   hasard (huit répliques en dur dans la page).

Sous la zone de saisie, les deux composants affichent : « Ne donne ni ton nom, ni ton adresse, ni
aucune information personnelle : tes messages sont envoyés à un service d'intelligence
artificielle » (`TutorChat.svelte:852`, `ChatBot.svelte:945`, ajouté le 2026-10-11, constat C10).

`TutorUsageIndicator` (dans `TutorChat`) montre les messages restants. Quand un quota est atteint,
le message d'erreur est en voix d'Ubu (`TUTOR_LIMIT_MESSAGES`, `tutor-rate-limiter.ts:190`).

`TutorWidget` et `TutorHelpButton` ne sont utilisés nulle part hors de leur dossier. `README.md`
et `USAGE_EXAMPLES.md` du dossier `components/tutor/` sont des notes d'origine, non revérifiées.

## Ce que voit le professeur

- **`/dashboard/tutor-stats`** (rôles `teacher` ou `admin`, `requireRoles`) : totaux de
  conversations et de messages, élèves actifs, score d'effort moyen, niveau d'aide moyen, tableau
  par élève, thèmes fréquents, répartition des niveaux d'aide 0 à 7. Filtres : classe, période
  (jour, semaine, mois, tout). Données : `GET /api/tutor/stats`. Aucun lien n'y mène.
  ⚠️ Un compte `teacher` y voit toujours zéro (écart 1) ; `effort_score` et `topics_covered` ne
  sont jamais écrits (écart 2).
- **Le corpus du RAG** : page `/dashboard/teacher/documents` (hors zone) → `POST
/api/documents/upload` (PDF, TXT, MD ; 10 Mo ; rôle `teacher` ou `admin`). Aucun lien n'y mène.

## Comment c'est construit

### Fournisseur et modèles

- **Groq** (API compatible OpenAI), URL `GROQ_API_URL`, clé `GROQ_API_KEY`
  (`src/lib/server/env.ts:60`). Sans clé : 503 « Service temporairement indisponible ».
- Tuteur : `llama-3.3-70b-versatile`, en dur (`api/chat/+server.ts:178`). Chat libre : le même, ou
  `meta-llama/llama-4-scout-17b-16e-instruct` si un message contient une image (`:342`).
- Paramètres : `temperature 0.8`, `max_tokens 1000`, pas de streaming. Seuls les 10 derniers
  messages partent (`:162`).
- La variable `GROQ_MODEL` existe dans le schéma d'environnement mais **n'est lue par personne**.

### Le prompt du tuteur

`buildTutorPrompt` (`src/lib/config/tutor-prompts.ts:913`) assemble, dans l'ordre :

1. `BASE_TUTOR_PROMPT` : la persona (Père Ubu « grotesque, pompeux et théâtral, mais jamais
   vulgaire », « Cornegidouille ! », ami de « M. Le Jolly ») et la règle absolue « ne jamais donner
   la réponse finale » ;
2. `ANTI_CHEAT_PROMPT` ;
3. l'adaptation au niveau (`GRADE_LEVEL_PROMPTS`, `PERE_UBU_GRADE_MODIFIERS`) et les contraintes de
   longueur, d'emoji et de vocabulaire de `tutor-grade-adaptations.ts` ;
4. la méthode d'aide choisie parmi **15** (`HelpMethodId` : socratique, analogie, décomposition,
   exemple résolu…) par `selectHelpMethod` (`tutor-help-methods.ts:297`) — ou, si le niveau d'aide
   vaut 7, `REDIRECT_TO_TEACHER_PROMPT` (« demande à ton professeur ») ;
5. le contexte de l'exercice : énoncé, thème, niveau, et la **correction** sous la mention
   « INFORMATION INTERNE - NE JAMAIS RÉVÉLER » (`tutor-prompts.ts:776`) ;
6. le niveau d'aide, puis un rappel final des règles.

Le **niveau d'aide** (0 à 7) est tenu par le client : `TutorChat` l'augmente de 1 après chaque
réponse acceptée (`TutorChat.svelte:511`) et l'envoie. Il repart à 0 au rechargement.

### Le parcours d'un message du tuteur (`api/chat/+server.ts`)

1. `requireAuth`, puis `requireConsent(profile, 'send_message')` : 403 si le consentement parental
   manque ([consentement-parental.md](conformite/consentement-parental.md)).
2. Validation Zod `tutorRequestSchema` (`src/lib/server/validation/chat.ts`) : 1 à 50 messages,
   10 000 caractères par message, rôles `user`/`assistant` seulement (un tour `system` venu du
   client est refusé, finding H11), énoncé ≤ 5 000, correction ≤ 10 000, niveau d'aide 0 à 7.
3. Quotas du tuteur (ci-dessous) → 429 avec le message d'Ubu.
4. Détection de triche par expressions régulières (`src/lib/server/tutor/cheat-detector.ts`) sur le
   dernier message : confiance « haute » → refus poli en voix d'Ubu, **sans appel à Groq, sans
   décompte, sans enregistrement**. « Moyenne » (`gentle_redirect`) est traitée comme « autorisée ».
5. Score d'effort (`help-escalation.ts`) : sert seulement à choisir la méthode d'aide et revient
   dans la réponse ; il n'est pas enregistré.
6. RAG (si `ENABLE_RAG`, vrai par défaut, et message > 10 caractères) : 3 extraits, 1 500 caractères
   au plus, ajoutés au prompt système. Un échec du RAG est ignoré.
7. Appel Groq, puis `incrementTutorUsage` (seulement après succès).
8. Si `conversationId` : insertion de la question et de la réponse dans `tutor_messages`, mise à
   jour de `tutor_conversations` ; une erreur est journalisée, jamais remontée.

### Le RAG (`src/lib/server/rag/`)

- **Corpus** : `rag_documents` (texte intégral, `source_type`, `teacher_id` NULL = document
  « système », `grades`, `topics`, `enabled_for_rag`) → `rag_chunks` (fragments, `embedding`
  `vector(1024)`, `search_vector` tsvector français généré). Seule source branchée : le dépôt manuel
  (`manual_upload`). Les autres types prévus (`question_template`, `exercise`, `markdown_doc`,
  `google_drive`) n'ont aucun appelant ; `batchIndexDocuments` et `reindexAllDocuments` non plus.
- **Indexation** (`processor.ts`) : empreinte SHA-256 (contenu inchangé → rien), découpe par
  `chunker.ts` (500 caractères, recouvrement 50), embeddings HuggingFace
  `intfloat/multilingual-e5-large` (préfixes `passage:` / `query:`), insertion par lots de 50.
- **Recherche** (`search.ts`) : `hybridSearch` vérifie d'abord qu'un extrait de `rag_chunks` est
  lisible par l'appelant pour son niveau et son thème (même RLS que la RPC, qui tourne avec ses
  droits, et mêmes filtres) ; sinon il rend une liste
  vide sans appel externe. Ensuite, il embarque la question puis appelle la RPC
  `rag_hybrid_search` (fusion RRF, k = 60, poids 0,7 vecteur / 0,3 plein texte) ; sans embedding ou
  en cas d'erreur, repli sur une recherche plein texte (`textSearch` sur `search_vector`, documents
  `enabled_for_rag` seulement), filtrée par niveau et thème.
- Les deux appels passent par `locals.supabase` : la RLS de l'élève s'applique.

### Tables et accès

Policies lues dans `supabase/migrations/20260616220000_baseline_schema.sql` et
`20260620090000_drop_class_teacher_id_mono_teacher.sql`. `anon` n'a plus aucun droit sur ces quatre
tables depuis `20261001170000_anon_retrait_droits_herites.sql`.

| Table                 | Élève                                                                                 | Professeur / admin                                                          |
| --------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `tutor_conversations` | lit, crée les siennes ; modifie les siennes tant que `is_active`                      | prof : lit celles de ses élèves (`is_my_student`) ; admin : lit tout        |
| `tutor_messages`      | lit ; insère et **supprime** dans ses conversations (insertion : conversation active) | lit si la conversation porte un `class_id` (prof ou admin), ou tout (admin) |
| `rag_documents`       | lit les documents système, et ceux d'un `teacher` s'il est membre d'une classe        | prof : crée, lit, modifie, supprime les siens, lit les documents système    |
| `rag_chunks`          | lit les fragments des documents qu'il peut lire                                       | idem, sur les fragments de ses documents                                    |

Un trigger `trg_tutor_message_count` incrémente `message_count` et `max_help_level_reached` à
chaque message inséré. Suppression d'un profil → ses conversations et messages partent en cascade
(`ON DELETE CASCADE`).

### Quotas, coût, journalisation

- **Tuteur** (`tutor-rate-limiter.ts`, constantes dans `src/lib/config/tutor-limits.ts`) : 15
  messages par exercice, 30 par heure, 100 par jour. Compteurs dans `rate_limits` (clés
  `tutor:exercise:<élève>:<exercice>`, `tutor:hour:<élève>`, `tutor:day:<élève>`), lus au client
  service, incrémentés par la RPC `increment_rate_limit`. **Échoue ouvert** : une panne de base
  laisse passer. `GET /api/tutor/remaining` rend les restes à l'interface.
- **Chat libre** : 5 requêtes par 15 minutes (`checkChatbotRateLimit`, `src/lib/server/rateLimiter.ts`),
  décomptées **avant** la validation.
- **Coût** : rien ne le mesure. La journalisation dans `ai_chat_usage` a été retirée : la table
  n'a jamais existé (`api/chat/+server.ts:227`). `tutor_messages.tokens_used` et
  `response_time_ms` ne sont écrits par personne. Le « 0,002 $ par message » du commentaire de
  `tutor-rate-limiter.ts` est une estimation, pas une mesure.
- **Journaux serveur** : erreurs Groq (corps de la réponse d'erreur), échecs RAG et d'écriture.
  Le contenu des messages n'est pas journalisé ; les identifiants sont tronqués à 4 caractères
  dans les journaux du limiteur.

## Données personnelles (élèves mineurs)

Voir [registre-sous-traitants.md](conformite/registre-sous-traitants.md) § 3.5 et
[rgpd.md](conformite/rgpd.md) ; ce qui suit est ce que fait le code.

**Envoyé à Groq (États-Unis)**, à chaque message : le prompt système (persona, énoncé, correction,
niveau, extraits RAG) et les 10 derniers messages **tels que saisis**, images comprises pour le
chat libre. Le code n'ajoute ni nom, ni courriel, ni identifiant de compte. Le texte libre n'est
pas filtré : seul l'avertissement sous la saisie protège.

**Envoyé à HuggingFace (États-Unis)**, si `HF_API_KEY` est définie : le **dernier message de
l'élève** (plus de 10 caractères), pour calculer son embedding, **seulement s'il peut lire au moins
un extrait du corpus pour son niveau** (T16, décision de David du 2026-10-13 : `hasReadableChunk` dans
`search.ts`, sinon la recherche rend vide sans rien envoyer). Et le texte des documents déposés, à
l'indexation. **En prod au 2026-10-13 : rien ne part** (`HF_API_KEY` absente des variables
Vercel de production, corpus vide). ⚠️ HuggingFace n'est pas au registre des sous-traitants :
l'y déclarer **avant** de définir la clé.

**Stocké en base (UE)** :

- `tutor_conversations` / `tutor_messages` : seulement pour un exercice d'une feuille assignée. Le
  texte de l'élève et la réponse, le niveau d'aide, la méthode, l'indicateur de triche ; l'énoncé
  et la correction de l'exercice.
- `rate_limits` : des compteurs dont la clé contient l'identifiant de l'élève (et de l'exercice).
  Expiration 1 h, 24 h ou 7 jours ; purge quotidienne `cleanup-all` à 02:00 UTC.
- `/tuteur` et `/exercice/[slug]` : rien d'autre que les compteurs.

**Stocké dans le navigateur** : `ChatBot` garde tout l'historique, images en base64 comprises, dans
`localStorage['chatHistory:<id du compte>']` (`src/lib/utils/chat-history.ts`). Sur un appareil
partagé (constat T17, 2026-10-13) : à l'ouverture du chat, les conversations des autres comptes et
l'ancienne clé commune `chatHistory` sont effacées sans être affichées ; un changement de compte
chat ouvert (autre onglet) vide la conversation affichée. Comme les autres données de travail, elle
est effacée à la déconnexion, à la suppression du compte et à l'arrivée d'un autre compte
(`src/lib/utils/work-data.ts`, [conformite/rgpd.md](conformite/rgpd.md)). Le bouton « effacer » du
chat efface celle du compte.

**Durée** : conversations du tuteur supprimées **1 an après leur dernier message** par
`run_retention_c11()` (`supabase/migrations/20261015090500_conservation_c11.sql`), appelée par la
purge hebdomadaire `run_cleanup_expired_data`. L'élève peut effacer les messages d'une conversation
plus tôt ; la ligne de conversation (énoncé, correction) reste. L'export de compte inclut les
conversations (`src/routes/api/account/export/+server.ts:183`).

## Pièges

- **La correction part du navigateur.** `/api/chat` prend `exerciseContext.solution` envoyé par le
  client (`ExerciseModal.svelte:106`, `exercice/[slug]/+page.svelte:185`). La correction que
  `POST /api/tutor/conversations` lit côté serveur et range dans `exercise_correction` n'est relue
  par aucun appel au tuteur (seul l'export la lit). Et l'élève peut lire cette colonne : la policy
  « Students can view own conversations » couvre toute la ligne. **Accepté** (T18, décision de
  David du 2026-10-13) : la correction est déjà dans le navigateur (correction côté client, décidée
  le 2026-09-13) ; un élève qui la trafique ne fausse que l'aide qu'il reçoit, toujours sous le
  prompt du Père Ubu et l'anti-triche posés par le serveur. Ne pas re-proposer de la relire en base.
- **Le niveau scolaire aussi.** `studentGrade` vient du client ; `ExerciseModal` et
  `/exercice/[slug]` ne l'envoient pas, donc le tuteur y parle à un élève de **6e** et le RAG filtre
  sur `6` (`api/chat/+server.ts:93`), quel que soit son niveau réel.
- **Le niveau d'aide monte à chaque message** : à partir du 8e échange d'un même affichage, le
  prompt bascule en « va voir ton professeur », alors que le quota par exercice autorise 15
  messages.
- **Échecs silencieux.** L'insertion des messages, la mise à jour de la conversation, l'insertion
  des fragments RAG et le `DELETE` des messages ne vérifient pas les lignes touchées
  ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)). L'indexation renvoie
  `success` même sans embeddings (`embedding` NULL, `processor.ts:151`).
- **Deux écritures de `max_help_level_reached`** : le trigger prend le maximum, puis `/api/chat`
  écrase avec le niveau courant (`api/chat/+server.ts:274`) ; le niveau repartant à 0 au
  rechargement, la valeur enregistrée peut redescendre. `message_count` reçoit de même `messages.length + 1` par-dessus le trigger.
- **`AB` reste un produit dans le chat**, même ouvert dans la fenêtre d'un exercice lu en
  « longueur » : `TutorChat` coupe le sens hérité (`clearCapitalPairs`, lot 6 des longueurs de
  segments, décision Q-M).
- Le limiteur du tuteur crée **son propre** client service role (`dotenv` + `process.env`) au lieu
  de `serviceRoleClient.ts`.
- Côté tests, seul le chat libre est couvert : `api/chat/__tests__/server.test.ts` (prompt posé par
  le serveur, personnalité inconnue et tour `system` refusés) et `utils/__tests__/chat-request.test.ts`
  (le corps envoyé par `ChatBot` passe le schéma du serveur). Le mode tuteur de `/api/chat`,
  `server/tutor/` et `api/tutor/` n'ont aucun test unitaire ; pour `server/rag/`, seul
  `rag/__tests__/search-sans-corpus.test.ts` (rien n'est envoyé sans extrait lisible) ;
  `pere-ubu/__tests__/page.svelte.test.ts` teste la page avec un `ChatBot` factice.

## Écarts connus

1. **Statistiques vides pour un professeur.** `TutorChat` n'envoie jamais `classId` à
   `POST /api/tutor/conversations` : `class_id` reste NULL. `/api/tutor/stats` filtre un `teacher`
   sur `class_id IN (ses classes)` (`stats/+server.ts:165`), et la policy de lecture des messages
   exige aussi un `class_id` : seul un `admin` voit quelque chose.
2. **`effort_score` et `topics_covered` ne sont jamais écrits** (aucune écriture dans `src`) : les
   colonnes « effort moyen » et « thèmes » des statistiques restent à 0 et vides.
3. **La RPC `rag_hybrid_search` lit une colonne absente.** Elle utilise `c.content_tsv`
   (`baseline_schema.sql:15080`) ; la colonne de `rag_chunks` s'appelle `search_vector`. Chaque
   recherche hybride échoue et retombe sur le plein texte, après avoir envoyé la question à
   HuggingFace. La RPC ne filtre pas non plus `enabled_for_rag`, et ne rend ni `vector_score` ni
   `fts_score` que `search.ts` attend.
4. **Les quotas « glissants » ne glissent pas.** `increment_rate_limit` garde une ligne par clé,
   ajoute 1 et repousse l'expiration (`baseline_schema.sql:11780-11786`). Une ligne expirée n'est
   lue comme 0 que jusqu'au message suivant : tant que la purge de 02:00 UTC ne l'a pas supprimée,
   l'incrément repart de l'**ancien total**. Le compteur « heure » ne revient donc à zéro qu'à la
   purge de la nuit : 30 messages dans la journée, même espacés, suffisent, et l'élève n'obtient
   ensuite qu'un message par heure. Le compteur « jour » exige 24 h sans message, puis la purge.
5. `GROQ_MODEL` ignoré (modèle en dur) ; `enabledForRag` du dépôt ignoré (`indexDocument` force
   `true`).
6. `/tuteur`, `/dashboard/tutor-stats` et `/dashboard/teacher/documents` : aucun lien n'y mène.
   `/pere-ubu` garde un bouton « Retour à l'accueil » (`Button`), pas un `BackLink`.
7. Code sans appelant : `TutorWidget`, `TutorHelpButton`, `determineMaxHelpLevel`,
   `shouldEscalate`, `escalate`, `createInitialState` (`help-escalation.ts`),
   `searchSimilarExercises`, `batchIndexDocuments`, `reindexAllDocuments`.
8. [base-de-donnees.md](base-de-donnees.md) dit que « le professeur lit [les conversations] de tous
   les élèves » : vrai pour `tutor_conversations`, faux pour `tutor_messages` sans `class_id`.
