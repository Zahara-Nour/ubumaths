# Auto-inscription élève par code de classe — Spec Phase 0 (TDD)

> **Statut : ✅ LIVRÉ ET VÉRIFIÉ EN PROD (2026-08-26).** Inscription bout-en-bout OK (test : profil `approved`, inscrit en classe, CGU enregistrée, game profile créé). PR #73 (feature) + #75 (durcissement E1) + #76 (trigger manquant) mergées et migrées.
> Convention : comportements en français (cas nominal / limite / erreur).

## Bugs prod déterrés par la mise en service (corrigés)

1. **`on_auth_user_created` manquant en prod EU** (PR #76) — le trigger sur `auth.users` qui exécute `handle_new_user` avait disparu (probablement à la migration EU de juin) → **aucun profil créé pour tout nouveau compte** ; invisible car aucun nouveau compte depuis (Google-only). Cause du « Profil non trouvé ». Recréé (migration idempotente). ⚠️ **Le baseline local crée des objets du schéma `auth` qui ne sont pas en prod** — se méfier pour tout futur objet auth.
2. **Fix `gender`** (PR #73) — refs à la colonne `gender` (droppée jan.) dans la branche `pending_students` → activation d'élève pré-importé cassée en silence depuis jan.
3. **E1 grant** (PR #75) — les _default privileges_ Supabase re-grantent `anon`/`authenticated` sur toute fonction `public` ; `REVOKE FROM PUBLIC` ne suffit pas → il faut `REVOKE FROM anon, authenticated` explicite.

## À faire par David (plus tard, non bloquant)

**Réécrire l'email de bienvenue** (`src/lib/email-templates/welcome.ts`) — le texte actuel (« ton compte a été validé, tu peux te connecter ») date de l'ancien flux et est redondant pour un élève auto-inscrit. Brouillon pataphysique proposé (à ajuster à la main) :

> **Objet** : Cornegidouille, bienvenue sur Chiphre !
> Bonjour {prénom}, Te voilà enrôlé dans ton **Bataillon**, Galopin ! Ton compte est scellé et bien vivant. File au **Cabinet des Phynances** sur **chiph.re** : des **Corvées** à dompter, des **Gidouilles** à empocher, et quelques **Médailles de la Gidouille** à décrocher. Bonne année de **Mathres** — et gare au Décervelage ! ⚙️

## Journal d'avancement

- **Phase 0** — spec validée (défauts recommandés retenus : `registration_open` dédié, table `terms_acceptances`, anti-énumération email, SMTP Brevo, email de confirmation activé).
- **Phase 1 ✅** — migration `supabase/migrations/20260825170000_student_self_registration.sql` :

  - `classes.registration_open` (bool, défaut false)
  - table `terms_acceptances` + RLS (SELECT own / staff ; écriture réservée trigger/serveur)
  - `handle_new_user()` : branche prioritaire `class_id` (metadata signup) → inscription classe si active+ouverte (approved, école+grade hérités) sinon profil pending non-inscrit ; CGU enregistrée si `terms_version` fourni. Branches `pending_students`/défaut préservées.
  - **Bonus (validé par David) : fix bug prod silencieux** — retrait des 2 refs `gender` (colonne supprimée le 2026-01-15, RGPD) dans la branche `pending_students`, qui faisait échouer en silence toute activation d'élève pré-importé depuis cette date.
  - Tests : `tests/integration/student-self-registration.test.ts` — **8/8 verts** en local (`db:reset` + `test:integration`) : nominal, inscription fermée, classe inactive, code invalide, sans CGU, régression `pending_students` (prouve le fix gender), régression défaut, RLS `terms_acceptances`.
  - État live prod vérifié avant écriture : `is_teacher_or_admin()` OK, `class_members.status` défaut `'active'`, grades `text`, enum `user_status={pending,approved,rejected}`, `profiles`/`pending_students` **sans** `gender` (bug confirmé prod), 2 `pending_students` tous activés (aucun élève bloqué aujourd'hui).
  - **À faire quand on ira en prod** : `db:migrate` (accord explicite requis) — migration **additive** (safe avant/avec deploy).

- **Phase 2 ✅** — page + action `/auth/register`
  - RPC `resolve_open_class_by_code(text)` ajoutée à la migration (SECURITY DEFINER, code→class_id **seulement si** classe active+ouverte ; GRANT anon/authenticated/service_role ; case-insensitive+trim). 4 tests d'intégration ajoutés → **12/12 verts**.
  - `registerFormSchema` (Zod) : prénom, nom, email, mot de passe (8-72), confirmation (refine match), code, `acceptTerms` obligatoire.
  - `src/routes/(public)/auth/register/+page.server.ts` : validation → rate-limit IP → résolution code (rejet AVANT création de compte) → `signUp` avec metadata (`class_id`, firstname, lastname, `terms_version='cgu-2026-08'`, `emailRedirectTo=/auth/confirm`) → **anti-énumération** (erreurs signUp masquées, succès neutre).
  - `+page.svelte` : formulaire (MyCheckbox CGU + liens légaux via `resolve()`), état succès « vérifie ta boîte mail », erreurs par champ. `svelte-autofixer` OK, `check:incremental` 0 erreur.
  - `/auth/confirm` gère **déjà** `type=signup` → rien à construire côté confirmation.
  - ⏳ **À décider** : lien découvrable vers `/auth/register` depuis la page login (renverse le « no signup link », e2e à MAJ) — vs URL partagée par le prof.
- **Phase 3 ✅** — UI enseignant + découvrabilité
  - Choix produit **(A)** validé : lien **« Créer un compte »** sur la page login (`resolve('/auth/register')`) ; test e2e `login.spec.ts` mis à jour (n'affirme plus l'absence de lien → vérifie sa présence).
  - `classes/+page.server.ts` : load enrichi avec `registration_open` par classe ; 2 actions **`regenerateJoinCode`** (via `generate_join_code()`, unicité garantie) et **`toggleRegistration`** (requireRole teacher + RLS mono-prof + Zod).
  - `classes/+page.svelte` : code affiché + **Copier** (clipboard) + **Régénérer** + bouton **Ouvrir/Fermer les inscriptions** + libellé d'état. `svelte-autofixer` : 0 nouveau souci (2 warnings pré-existants hors périmètre : `defaultTime` eslint-disable, lien Google Classroom).
  - **`database.ts` régénéré depuis le LOCAL** (`supabase gen types --local`, car `db:types` pointe la prod qui n'a pas encore la migration). Diff = **uniquement** `registration_open`, `terms_acceptances`, `resolve_open_class_by_code` (bloc `__InternalSupabase` restauré à la main). `check:incremental` 0 erreur. ⚠️ **Après `db:migrate` en prod, relancer `pnpm db:types`** (depuis la prod) pour régénérer proprement.
- **Phase 5 ✅ (reviews + corrections)** — `security-auditor` + `code-reviewer` passés. Corrections **appliquées en code** :
  - **E1** : RPC `resolve_open_class_by_code` **retirée de `anon`/`authenticated`** (GRANT `service_role` seul) → plus d'énumération directe de codes via PostgREST. L'action `/auth/register` l'appelle via le **client service-role**.
  - **E2** : rate-limit signup **par email ajouté** (`checkSignupRateLimitByEmail`, 3/h) en plus de l'IP ; limite **IP relevée 3→40/h** (classe entière derrière l'IP de l'école).
  - **C1 (part code)** : garde `data.session` — si confirmation OFF, `signUp` renvoie une session → redirection `/dashboard` au lieu du message trompeur ; note de **pré-requis dur** en tête d'action.
  - **F3** : colonnes `terms_acceptances.ip/user_agent` **retirées** (minimisation RGPD ; jamais peuplables par le trigger). `database.ts` régénéré.
  - **F1** : commentaire anti-régression dans le trigger (« ne jamais lire role/status/school_id/grade des métadonnées »).
  - Revalidé : **12/12 tests d'intégration** + `check:incremental` 0 erreur.
  - Points positifs confirmés par les deux audits : trigger non-attaquable, deny-by-default (`pending`→`/auth/pending-approval`), actions prof double-protégées, RLS testée, anti-énumération applicative.

### ⚙️ À FAIRE PAR DAVID — config Supabase (hors code), AVANT prod

- **C1 (bloquant)** : Authentication → **activer « Confirm email »** + brancher le **SMTP Brevo** (`smtp-relay.brevo.com:587`, user = login SMTP, pass = clé `xsmtpsib-`, sender `noreply@chiph.re`). Sans ça le modèle de sécurité ne tient pas.
- **M2** : activer **« Leaked password protection »** (HaveIBeenPwned) + passer `minimum_password_length` à **8** (prod à 6).
- **E2** : vérifier la **confiance proxy Vercel** pour `getClientAddress()` (sinon `X-Forwarded-For` spoofable).

### ⏭️ Suivi séparé (post-PR, non bloquant)

- **CAPTCHA** sur `/auth/register` (hCaptcha/Turnstile) — défense indépendante du rate-limit.
- Allonger le keyspace des codes (`generate_join_code` 6→8-10 car.).
- **M1** : log exploitable des échecs silencieux du trigger (`WHEN OTHERS`).
- **M4** : autoriser l'admin sur `regenerateJoinCode`/`toggleRegistration` (`requireRoles(['teacher','admin'])`) — actuellement teacher-only (sûr mais restrictif).

- **Phase 4 (action David)** — voir « config Supabase » ci-dessus (SMTP + confirmation).

## 1. Contexte & besoin

L'ancien onboarding élève reposait sur **Google OAuth** (`@voltairedoha.com`), désactivé suite au changement d'établissement. On veut permettre aux élèves de **s'inscrire eux-mêmes**, mais de façon **contrôlée** :

- L'enseignant **ne connaît pas** les emails des élèves à l'avance → on ne peut pas pré-charger une allowlist par email.
- Seuls **les élèves de l'enseignant** doivent pouvoir s'inscrire (pas le public).
- **RGPD** : hypothèse **élèves ≥ 15 ans** → consentement de l'élève seul (Art. 8 RGPD + loi FR, seuil 15 ans). Pas de consentement parental dans ce périmètre.

**Modèle retenu : le code de classe** (comme Pronote / Google Classroom). L'enseignant distribue le **code** de sa classe à ses élèves (oral / tableau). Seul un porteur du code peut s'inscrire, et il est **auto-inscrit dans la classe** correspondante. La barrière d'accès = le code (contrôlé par l'enseignant), pas l'email.

## 2. Décisions retenues (défauts recommandés — À CONFIRMER)

| #   | Décision                          | Défaut proposé                                                                                 |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Modèle d'accès                    | **Code de classe** (pas de codes individuels par élève)                                        |
| 2   | Email de confirmation             | **Activé**, via **SMTP Brevo** branché dans Supabase Auth (vérifie la possession de l'adresse) |
| 3   | Acceptation CGU + confidentialité | **Obligatoire** au signup, **version + horodatage** stockés                                    |
| 4   | Niveau (grade) de l'élève         | **Déduit de la classe** (non demandé à l'élève)                                                |

## 3. Briques existantes (réutilisées)

- `classes.join_code` : `NOT NULL`, **UNIQUE**, fonction `generate_join_code()`. Chaque classe a déjà un code (ex. `1SPE-TEST` → `8B237F`).
- `class_members` : table d'inscription élève↔classe.
- `handle_new_user()` : trigger sur `auth.users` qui crée le `profiles` à la création du compte (à **adapter**).
- `signupFormSchema` (Zod) + rate-limiter signup (`ratelimit:signup:*`, 3/h/IP) : déjà présents, non branchés.
- Pages légales : `/legal/cgu`, `/legal/confidentialite`.
- Brevo configuré (transactionnel) ; clé **SMTP** `xsmtpsib-` disponible pour Supabase Auth.

## 4. Modèle de données touché

- **`classes`** : ajout d'un flag **`registration_open boolean` (défaut false)** pour découpler « classe active » de « inscription ouverte ». _(alternative : réutiliser `is_active` — voir Q ouverte)_
- **`class_members`** : insertion à l'inscription (statut approved).
- **`profiles`** : création via trigger (role `student`, grade déduit de la classe).
- **Acceptation CGU** : nouvelle table **`terms_acceptances`** (`user_id`, `terms_version`, `accepted_at`, `ip?`, `user_agent?`) pour l'historique multi-versions. _(alternative : colonnes sur `profiles` — voir Q ouverte)_
- **`handle_new_user()`** : étendu pour lire `class_id` (metadata signup) → inscrire dans `class_members` + définir le grade ; **rejeter/mettre en pending** un compte sans `class_id` valide (corrige le « approuvé par défaut » actuel).

## 5. Comportements attendus

### A. Page d'inscription `/auth/register`

- **Nominal** : affiche un formulaire — prénom, nom, email, mot de passe, confirmation, **code de classe**, case **« J'accepte les CGU et la politique de confidentialité »** (liens vers `/legal/cgu` et `/legal/confidentialite`). Lien « Déjà un compte ? Se connecter » vers `/auth/login`.
- **Nominal** : un utilisateur **déjà connecté** qui visite `/auth/register` est redirigé vers `/dashboard`.
- **Limite** : mot de passe < 8 caractères → erreur de validation ; confirmation ≠ mot de passe → erreur ; email mal formé → erreur.
- **Erreur** : case CGU non cochée → soumission bloquée (message explicite) ; champ manquant → message Zod.

### B. Validation du code de classe (action serveur `?/register`)

- **Nominal** : code correspondant à une classe **active ET ouverte à l'inscription** (`registration_open = true`) → on continue.
- **Limite** : code saisi en minuscules / avec espaces → **normalisé** (trim + majuscules) avant lookup.
- **Erreur** : code inexistant → « Code de classe invalide. » ; code d'une classe **inactive ou inscription fermée** → « Les inscriptions pour cette classe sont fermées. » (messages sans fuite d'info interne).

### C. Création du compte + email de confirmation

- **Nominal** : email non encore utilisé → `signUp(email, password)` avec `firstname`, `lastname`, `class_id` en **user_metadata** → Supabase envoie l'**email de confirmation** → écran « Vérifie ta boîte mail pour confirmer ton inscription ».
- **Limite** : rate-limit signup (3/h/IP) dépassé → 429 « Trop de tentatives, réessaie plus tard. ».
- **Erreur (anti-énumération)** : email déjà utilisé → message **neutre** identique au cas nominal (« Si un compte peut être créé, tu recevras un email ») ; aucun 2ᵉ compte, pas de fuite « email déjà pris ». _(à confirmer : neutre vs explicite)_

### D. Confirmation & activation

> Rappel technique : le trigger `handle_new_user` s'exécute **à la création du compte** (au `signUp`), pas au clic de confirmation. L'email de confirmation conditionne la **connexion**, pas la création du profil.

- **Nominal** : au signUp, le profil est créé (role `student`, grade de la classe) + inscription `class_members` (approved) + acceptation CGU enregistrée. L'élève clique le lien de confirmation → peut se connecter → dashboard élève.
- **Limite** : lien de confirmation expiré / déjà utilisé → « Lien expiré, redemande un email de confirmation. ».
- **Erreur** : `class_id` metadata ne correspond plus à une classe valide (classe supprimée entre-temps) → compte créé mais **non inscrit**, statut **pending** + « Contacte ton professeur. » (cas rare).

### E. Acceptation CGU (RGPD)

- **Nominal** : version des CGU + horodatage (+ IP/UA optionnels) enregistrés et liés au compte.
- **Erreur** : absence d'acceptation → pas de compte (bloqué en amont, cf. A).

### F. Côté enseignant — gestion du code (page « Mes classes »)

- **Nominal** : l'enseignant **voit** le code de chaque classe, peut le **copier**, le **régénérer** (invalide l'ancien), et **ouvrir/fermer** l'inscription (`registration_open`).
- **Nominal** : les nouveaux inscrits apparaissent dans le **roster** de la classe ; l'enseignant peut **retirer** un élève (intrus).
- **Limite** : régénérer le code **n'affecte pas** les élèves déjà inscrits.

### G. Sécurité / RGPD / safeguarding

- **Barrière = le code** : mitigations = régénération, fermeture d'inscription une fois la classe complète, revue du roster.
- **Minimisation** : uniquement prénom, nom, email, mot de passe, grade déduit. **Pas** de genre ni date de naissance (hypothèse ≥ 15).
- **Rate-limiting** signup (IP) — existant.
- **Email de confirmation** = preuve de possession de l'adresse.
- **`handle_new_user`** : un compte **sans `class_id` valide** ne devient **jamais** élève approuvé automatiquement (rejet/pending) → corrige le « approuvé par défaut » actuel.
- **Tests d'intégration locaux obligatoires** (trigger + RLS + `class_members`), jamais de smoke-test `auth.uid()` NULL.

## 6. Hors périmètre (plus tard)

- Élèves **< 15 ans** (consentement parental) — le système `parental_consents` existe, mais ce périmètre reste **≥ 15**.
- Comptes **parents**, age-gate par **date de naissance**, bandes externes, **monétisation** (cf. `monetisation-architecture.md`).
- **Codes d'invitation individuels** par élève.
- Réactivation **Google** (gardée derrière le flag `GOOGLE_LOGIN_ENABLED`).

## 7. Questions ouvertes (à trancher avant Phase 1)

1. **Flag d'inscription** : ajouter `registration_open` (recommandé) **ou** réutiliser `is_active` ?
2. **Stockage CGU** : table `terms_acceptances` (recommandé, historique) **ou** colonnes sur `profiles` ?
3. **Anti-énumération email** : message neutre (recommandé) **ou** explicite « email déjà utilisé » ?
4. **SMTP Supabase Auth** : on branche le SMTP Brevo **maintenant** (prérequis à l'email de confirmation) ? Sinon email de confirmation via le service Supabase par défaut (rate-limité, non prod).
5. **Auto-confirm ?** Si tu ne veux pas d'email de confirmation au départ, on peut auto-confirmer (le code de classe restant la barrière) — moins RGPD-propre mais plus simple.

## 8. Approche technique pressentie (indicatif — hors Phase 0)

- `src/routes/(public)/auth/register/{+page.svelte,+page.server.ts}` (action `register`).
- Code → `class_id` résolu **serveur**, passé en `options.data` du `signUp`.
- `handle_new_user` étendu (class_members + grade + CGU ; rejet si pas de class_id valide).
- Migration : `classes.registration_open`, table `terms_acceptances`, MAJ trigger.
- Config Supabase Auth SMTP = Brevo (`smtp-relay.brevo.com:587`, user = login SMTP, pass = clé `xsmtpsib-`).
- UI prof : code (copier/régénérer) + toggle inscription, sur `dashboard/teacher/classes`.

## 9. Plan de phases (indicatif)

- **Phase 1** — Migration (flag, table CGU, trigger adapté) + **tests d'intégration**.
- **Phase 2** — Page + action `/auth/register` (validation code, signup, CGU) + tests.
- **Phase 3** — UI enseignant (code copier/régénérer, ouvrir/fermer inscription) + tests.
- **Phase 4** — Config SMTP Brevo dans Supabase Auth + email de confirmation + vérif bout-en-bout.
- **Phase 5** — `security-auditor` (auth/RLS/RGPD) + doc finale.

---

**Definition of Done (rappel)** : tests passent (intégration locale pour trigger/RLS) · `svelte-autofixer` sur les `.svelte` · `pnpm check:incremental` 0 erreur · `code-reviewer` + `security-auditor` · Zod sur les entrées · pas de `any` · MySelect/MyCheckbox · runes only.
