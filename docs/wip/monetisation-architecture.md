# Monétisation UbuMaths — Architecture (réflexion conceptuelle)

> **Statut** : réflexion conceptuelle. **Rien n'est implémenté.** Aucune décision n'est figée côté code.
> **Date** : 2026-06-16
> **Origine** : recherche d'une « discussion précédente » sur la monétisation — **aucune trace écrite n'existait**. Ce document est désormais le point d'entrée canonique. Le mettre à jour plutôt qu'en recréer un.

---

## 1. Contexte & objectif

UbuMaths est l'app éducative de maths de David (prof de maths). Objectif : **monétiser** tout en gardant l'usage pédagogique pour ses propres élèves.

Populations cibles :

- **Les élèves de David** (gestion de classe) → accès à **tout**, gratuitement.
- **Des élèves extérieurs** → accès à des ressources via **abonnement** ou **achat à l'unité** (ex. « un cours sur un chapitre »).
- **Des profs extérieurs** → **clients** (achètent des produits / s'abonnent), **PAS** des gestionnaires de classe.

**Décision structurante (actée)** : **abandon de la gestion de classe multi-profs.** David est le **seul** professeur qui gère des classes. Raisons : complexité multi-tenant + risque juridique (devenir sous-traitant de données d'élèves d'établissements qui n'ont pas adopté la plateforme).

---

## 2. Principe directeur

Deux axes **orthogonaux**, à ne jamais mélanger :

- **Axe 1 — QUI tu es** : identité = rôle + attributs. Stable.
- **Axe 2 — À QUOI tu as droit** : accès = agrégation de droits (grants). Dynamique, expire, s'achète.

Le lien entre les deux passe par des **droits d'accès**, **jamais** par le rôle directement.

**Règle d'or** : _peu de rôles, beaucoup d'attributs._ On ne crée jamais de sous-type composite (« élève-interne-mineur-payant ») → explosion combinatoire. Une personne = **un rôle + une combinaison d'attributs**.

---

## 3. Axe 1 — Taxonomie des profils

### 3.1 Les 4 rôles (= pouvoirs réels)

| Rôle                  | Porté par | Préoccupation                                                                           |
| --------------------- | --------- | --------------------------------------------------------------------------------------- |
| **admin**             | David     | gouvernance + commercial (comptes, RGPD, **produits/prix/facturation**, config système) |
| **teacher**           | David     | pédagogique (classes/rosters, import élèves, suivi, **dons d'accès** aux élèves)        |
| **student**           | élèves    | apprenant (interne ou externe)                                                          |
| **guardian / parent** | parents   | consentement (+ paiement pour mineurs externes)                                         |

- **admin & teacher sont tous deux portés par David seul** — pas de second porteur, pas de multi-tenant.
- **Décision (actée)** : garder admin et teacher comme **bundles de capacités distincts**, mais **une seule expérience** : un seul compte, un seul login, une seule app. La navigation se rend **par capacité** (`peutEnseigner()` / `peutAdministrer()`, jamais `role === 'admin'`). On **abandonne** le pattern « deux interfaces selon le rôle de connexion » : il servait à isoler plein de profs d'un admin — population qui n'existe plus. On garde juste une **section Administration distincte** (clarté + garde-fous/ré-auth sur les actions sensibles).
- **« prof extérieur »** n'est **pas** un rôle : c'est un **segment de client** (un libellé sur un compte adulte externe qui pilote le catalogue), sans aucun pouvoir.
- **Modélisation à trancher (refacto en cours, autre session)** : rôles multiples (table `user_roles` / array) vs hiérarchie (admin ⊇ teacher). Recommandé : **rôles multiples** si l'on veut une vraie séparation.

### 3.2 Les attributs qui qualifient (surtout l'élève)

| Attribut                                              | Valeurs                                                | Détermine…                                  |
| ----------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| **Relation**                                          | interne / externe                                      | accès « tout » (via classe) vs accès acheté |
| **Tranche d'âge** _(dérivée de la date de naissance)_ | < 15 / 15–17 / ≥ 18                                    | qui consent, qui peut payer                 |
| **État du compte**                                    | inexistant / roster-only / invité-anonyme / activé     | présence réelle dans l'app                  |
| **État du consentement**                              | non requis / en attente (grâce) / accordé / **refusé** | droit de traiter ses données                |
| **Lien payeur**                                       | soi-même (adulte) / adulte rattaché / aucun            | qui porte la facturation                    |

Mécanismes transverses (PAS des rôles) :

- **Payeur** = capacité sur tout compte **adulte** (student ≥18, teacher, guardian).
- **Consentant** = soit email+token léger (interne), soit compte guardian complet (externe payant).

### 3.3 Vérification : toute personne = rôle + attributs

| Personne                             | Rôle                 | Attributs clés                                                |
| ------------------------------------ | -------------------- | ------------------------------------------------------------- |
| David                                | admin + teacher      | —                                                             |
| Élève de 4ᵉ, consentement OK         | student              | interne, <15, activé, consentement accordé                    |
| Élève de Tale, 17 ans                | student              | interne, 15-17, **auto-consentement possible**                |
| Élève dont les parents refusent      | student              | interne, **compte inexistant / invité-anonyme**, refusé       |
| Externe, 16 ans, gratuit             | student              | externe, 15-17, auto-consent, **payeur=aucun → tier gratuit** |
| Externe, 13 ans, payant              | student              | externe, <15, consentement **parental**, **payeur=parent**    |
| Parent de l'externe de 13 ans        | guardian (complet)   | payeur + consentant + titulaire                               |
| Parent d'un élève interne de 4ᵉ      | guardian (léger)     | consentant seul, **pas de compte**                            |
| Prof d'ailleurs / adulte autodidacte | student (ou teacher) | externe, ≥18, **payeur=soi**, segment déclaré                 |

---

## 4. Cadre juridique RGPD (décisions actées)

### 4.1 Base légale

**Décision : projet perso + consentement.** David reste **responsable de traitement indépendant** → base = **consentement parental** (élève par élève). L'autre voie (adoption par l'établissement + DPA, base « mission de service public ») est **écartée** (disproportionnée pour un projet perso).

### 4.2 « Pas de traitement in-app » (cas du refus)

Si les parents **refusent**, on ne peut **rien** traiter de cet élève dans UbuMaths : pas de profil, pas de résultats, **pas même de ligne `pending_students`** (le roster contient nom + email parent = données personnelles). L'élève doit être **comme non inscrit**.

Ce qui reste possible :

- David utilise l'app normalement (projeter du contenu générique — ne traite aucune donnée _de lui_) ;
- **usage réellement anonyme** (mode invité jetable, sans identité ni identifiant durable) ;
- suivi de cet élève via le **canal officiel de l'établissement** (Pronote/ENT), pas via UbuMaths.

**À distinguer** : consentement _en attente_ (période de grâce active) ≠ **refus**. Le « pas de traitement » ne vaut que pour un refus (ou non-réponse à l'expiration).

### 4.3 Pourquoi l'Excel de classe est licite mais pas UbuMaths

C'est **la même opération** (traiter nom + notes), mais la **base légale disponible diffère selon le contenant** :

- Excel / Pronote → couvert par la **mission de service public** de l'école (responsable = l'établissement). ✅
- UbuMaths → **plateforme tierce non adoptée** par l'école (Supabase, Vercel, LLM Groq, embeddings HF, comptes, gamification, + bientôt commerciale) → la mission de l'école ne s'y étend pas → **consentement**. ⚠️
- **Garde-fou** : ne **jamais** réutiliser l'Excel de classe (finalité « enseigner ») pour **démarcher commercialement** ces familles (nouvelle finalité → consentement). Frontière prof/vendeur étanche.

### 4.4 Les deux seuils d'âge (à ne pas confondre)

| Ce qu'on autorise                                  | Seuil      | Règle                                                                   |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| **Consentir au traitement** (RGPD Art. 8 + loi FR) | **15 ans** | ≥15 : le mineur consent **seul** ; <15 : consentement **parental**      |
| **Contracter / payer** (droit civil)               | **18 ans** | un mineur ne souscrit pas valablement un abonnement → **adulte payeur** |

→ 3 bandes pour les **externes** :

- **< 15** : parent obligatoire pour **les deux** (consentement + paiement).
- **15–17** : s'inscrit et consent **seul** (compte gratuit possible), mais **adulte payeur** requis pour le payant.
- **≥ 18** : autonome complet.

**Découplage apprenant / payeur** : l'apprenant porte son consentement ; le **payeur** est un adulte (lui-même si ≥18, sinon un adulte rattaché). Le « compte parent-titulaire » n'est qu'un **cas particulier** (où payeur + consentant + titulaire = la même personne, pour les <15).

**Conséquence pour les élèves internes ≥ 15 ans** (2nde, 1ère, Tale) : le consentement de **l'élève** suffit légalement — le passage parental n'est pas obligatoire. ⚠️ Le code actuel (`requiresParentalConsent`) infère via le **niveau** et couvre la 2nde → plus protecteur que la loi (légitime, mais choix conscient). Pour un seuil fin il faudrait raisonner sur la **date de naissance**.

> Repère d'âge : un élève entrant en **2nde** sans saut de classe a **14 ans minimum** à la rentrée (né en fin d'année civile), et atteint 15 ans avant le 31 décembre. Donc une partie des secondes est réellement < 15 en début d'année → consentement parental justifié pour eux.

### 4.5 Socle RGPD déjà construit (vérifié dans le code)

- Table `parental_consents` (token parent, expiration 7j, audit IP/UA), champs `consent_required` / `consent_granted_at` / `consent_grace_period_ends`.
- Gate `requireConsent(profile, action)` sur ~19 endpoints.
- Période de grâce : **expire 2026-06-30** (~2 semaines — à anticiper).
- Export Art. 20, suppression Art. 17, audit logs : en place.

---

## 5. Axe 2 — Modèle d'accès (entitlements)

### 5.1 La chaîne de 4 filtres

Pour une requête : **1.** authentifié ? → **2.** compte admis (`approved`, pas `rejected`) ? → **3.** consentement valide (RGPD) ? → **4. 🎯 a un droit (grant) qui satisfait l'exigence de la ressource ?** ← **c'est l'Axe 2**.

Les filtres 2-3 = _« existes-tu légitimement ? »_. L'Axe 2 = _« que peux-tu atteindre ? »_.

### 5.2 Les 3 ingrédients

**Exigence — portée par la RESSOURCE** (déclarée une fois, indépendante de l'utilisateur) : `gratuit` / `interne` / `abonnement(tier)` / `achat(produit)`.

**Droits (grants) — portés par l'UTILISATEUR**, 5 sources :

| Source                 | Vient de          | Couvre                  | Durée de vie                  |
| ---------------------- | ----------------- | ----------------------- | ----------------------------- |
| Capacité (rôle)        | admin / teacher   | tout                    | tant que le rôle              |
| Appartenance de classe | élève **interne** | tout                    | tant que membre               |
| Abonnement actif       | externe           | le _tier_               | tant qu'actif (miroir Stripe) |
| Achat unitaire         | externe           | un produit              | permanent (ou borné)          |
| Don du prof            | teacher           | une ressource, un élève | révocable                     |

**Fonction de décision** : `peutAccéder(user, ressource)` = lit l'exigence, parcourt les grants, **accès ⇔ au moins un grant satisfait l'exigence**.

### 5.3 Principes

- **Additif (OU)** : un seul droit suffit.
- **Rien dans le rôle** : « premium » = un abonnement actif, **pas** un rôle.
- **Découplage total** : l'exigence ne connaît pas l'user, le grant ne connaît pas la ressource ; seule la fonction les confronte.
- **Expiration native** : un abonnement lapsé retire l'accès automatiquement.
- **Source de vérité = la DB** : on **mirror** l'état Stripe via webhooks ; jamais d'appel Stripe au moment de décider.

### 5.4 Catalogue : produit → ce qu'il débloque

- **produit** (abonnement _récurrent_ ou achat _one-shot_) déclare **ce qu'il débloque** ;
- _« cours sur un chapitre »_ = one-shot → débloque les ressources d'un bundle ;
- _« abonnement élève »_ = récurrent → débloque un **tier** ;
- acheter/souscrire = **créer un grant** dans la table de l'utilisateur.

### 5.5 Décisions actées

- **Outils transverses = features** (notebook Python, exercices Python, géométrie, jeux, SRS, chat tuteur, calculatrice, grapheur, whiteboard, énigmes…) : drapeaux de capacité, inclus dans un tier **ou** vendus à la carte — **pas** des « chapitres ».
- **Le « produit vendable » est une couche de bundling séparée** au-dessus des unités taguées (un `produit` pointe vers un ensemble d'unités). Pas de granularité rigide figée dans le contenu.

---

## 6. Granularité de l'unité curriculaire

### 6.1 Décision actée : **« thème d'abord, objectif en parallèle »**

- **Colonne vertébrale commerciale = `question_templates.theme` (× `grade` / `level`)**, remplie au fil de la migration de contenu.
- **Objectif (référentiel `skill_objectives`) continue en parallèle**, au service de l'évaluation des compétences ; les produits pourront bundler dessus plus tard.
- Les deux **coexistent** ; la couche produit les unifie. Choix réversible/extensible (thème ne ferme pas l'objectif).

**Pourquoi thème d'abord** : la monétisation ne doit pas être otage du référentiel (6ᵉ seulement) ; le tag se remplit pendant la migration déjà nécessaire ; couvre tous les niveaux immédiatement ; ne ferme rien.

### 6.2 Réalité du contenu (état des lieux base prod, 2026-06-16)

Le contenu est **fragmenté et en pleine migration** — aucune taxonomie n'est « déjà taguée » :

| Source                                                                                 | Volume                           |
| -------------------------------------------------------------------------------------- | -------------------------------- |
| `question_templates` (nouveau modèle, a `theme`/`domain`/`subdomain`/`grades`/`level`) | **2** (quasi vide)               |
| `exercises` (legacy, via `subtopic → topic`)                                           | **103**                          |
| `python_exercises`                                                                     | 36                               |
| `worksheets`                                                                           | 10 · `srs_decks` 83              |
| `skill_themes` / `skill_objectives` / `skills` (référentiel)                           | 6 / 18 / 128 — **6ᵉ uniquement** |
| `class_chapters`                                                                       | 0                                |

`src/lib/questions/` = le **moteur** (parser/générateur/validateurs), pas un corpus. `src/lib/migration/question-transformer.ts` (~2500 lignes) = migration de contenu **en cours**.

### 6.3 Implications à garder en tête

1. **Le tag se pose pendant la migration** (`question-transformer.ts`) → `theme`/`domain`/`grade` doivent être renseignés proprement **et à une granularité commercialement cohérente**. Monétisation ⟷ migration de contenu désormais liées.
2. **Double modèle legacy/template à réconcilier** : 103 exercices legacy (`subtopic→topic`) vs templates (`theme`). Pour une vente uniforme : soit migrer le legacy, soit mapper `subtopic → theme`. À trancher plus tard.
3. **Définir le vocabulaire canonique des thèmes** par niveau (liste stable) — **prérequis** pour que « thème » soit une unité de vente fiable.

---

## 7. Socle existant vs manquant (vérifié dans le code)

**Existe déjà** : rôles (`student/teacher/admin`), statut compte (`pending/approved/rejected`), classes + `class_members`, roster `pending_students`, consentement parental complet, RLS + guards par rôle, gamification (gidouilles/VIP/marketplace — argent de **jeu**, pas de la vraie monétisation).

**Manque totalement** : tables `products` / `subscriptions` / `prices` / grants, intégration **Stripe** (customer, checkout, webhooks), gating par produit→ressource, notion de date de naissance / age gate externe, compte **guardian** comme vrai compte, segment client externe.

> ⚠️ Le système est aujourd'hui **mono-école fermé** : login OAuth restreint au domaine `@voltairedoha.com`, tout compte `pending` jusqu'à approbation admin. Ouvrir l'**auto-inscription externe** casse cette restriction → premier mur technique.

---

## 8. Décisions actées (récapitulatif)

1. ❌ Pas de gestion de classe par d'autres profs (David seul). Prof externe = **client**.
2. admin & teacher = **rôles distincts** mais **une seule UI** (capability-driven), portés par David.
3. RGPD : base **projet perso + consentement**.
4. Seuils : **15 ans** (consentement données) / **18 ans** (paiement) ; **3 bandes** externes ; **découplage apprenant/payeur**.
5. Accès = **entitlements** (5 sources, exigence sur la ressource, miroir Stripe).
6. **Outils = features** ; **produit = couche de bundling**.
7. Unité curriculaire : **thème d'abord, objectif en parallèle**.

## 9. Questions encore ouvertes

- Un profil apprenant rattaché à **un ou plusieurs** payeurs/parents (familles recomposées) ?
- Segment « enseignant » distinct dans le catalogue dès le début, ou offre unique au départ ?
- guardian **léger** (email+token) vs **complet** (compte) : deux objets distincts, ou modèle unifié dès le départ ?
- Libellé pour un **adulte externe** qui apprend (`student` vs « learner »/« membre ») ?
- Réconciliation **legacy/template** : migrer ou mapper ?

## 10. Prochaines étapes (conceptuel, rien implémenté)

- **Tiers d'offre** : qu'est-ce qui est gratuit / abonnement / à l'achat (packaging commercial).
- **Flux d'inscription externe** : compte parent, age gate (date de naissance), consentement — l'Axe 1 RGPD rendu concret.
- **Modèle de données** : dessiner rôles/grants/produits/abonnements/tagging thème.
- **Intégration Stripe** : produits, prix, webhooks, miroir DB.
- **Vocabulaire canonique des thèmes** par niveau.

---

## Fichiers & tables clés

- Rôles/types : `src/lib/types/database-helpers.ts:159`, `database.ts` (enum `user_role`, `user_status`)
- Consentement : `src/lib/utils/consent.ts`, table `parental_consents`, `docs/ref/conformite/`
- Import/roster : `src/routes/(protected)/dashboard/admin/import-students/+page.server.ts`, table `pending_students`
- Auth/OAuth : `src/routes/(public)/auth/login/+page.server.ts`, `auth/callback/+server.ts`
- Contenu : `question_templates` (theme/domain/grade), `exercises` (legacy), `src/lib/migration/question-transformer.ts`
- Référentiel : `skill_themes` / `skill_objectives` / `skills` / `question_template_skills` (migration `20260609120000`)
