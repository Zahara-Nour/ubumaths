# Inscription par le parent — journal

## Reprendre ici

_Mis à jour le 2026-10-21, PR #1594 ouverte, correctifs des revues EN COURS (commit WIP local, non poussé)._

- **État** : #1594 ouverte (CI de l'ancien commit, sans valeur). `security-auditor` → **B1 bloquant** : le lien du parent portait le `hashed_token` de GoTrue, qui ouvre une session sur le compte de l'enfant (`/auth/confirm` ou `/auth/v1/verify`). Refonte commencée : jeton maison, empreinte dans `app_metadata.password_reset` (`createChildResetToken`, `setChildPasswordFromToken(service, userId, token, password)`) ; module + intégration (11 verts) + gabarit faits.
- **Prochaine action** : finir B1 → `reset-password/+page.server.ts` (`createChildResetToken(service, target.userId)`, courriel `{userId, token}`), page du parent (`?u=&t=`, Zod uuid + jeton 20-128, load), leurs tests (le test du gabarit compare le texte avec `&amp;` : à séparer texte/HTML) ; puis les autres constats (§ Revues de la PR 3) ; doc `auth.md` (jeton maison, pas `generateLink`) ; check, push, CI, merge.
- **Décisions de David (2026-10-21, « ok pour les recos »)** : M1 audit → refuser la modification de `parent_email` sur une demande `granted` ; M2 audit → documenter « ancien mot de passe » comme garde d'interface (risque accepté) ; revue n° 2 → masquer « Changer mon mot de passe » sans fournisseur `email` ; F-c → David vérifie/coupe le suivi des clics Brevo. PR 2 : **F1 = David** (Dashboard) ; **M1 bis** (5 comptes par classe et par 24 h, écran parent) et **M2** (suffixe à 3 chiffres) = petite PR après #1594, avant le `deploy:prod`.
- **En attente de David** : F-c (suivi des clics Brevo). F1 vérifié par David dans le Dashboard le 2026-10-21.
- **Pièges en cours** : un changement de mot de passe par la clé service ferme TOUTES les sessions ; `app_metadata` seul n'en ferme aucune ; `oxlint --fix` du pre-commit réécrit les tests (les relancer après commit).
- **Worktree / branche** : `../ubumaths-wt-inscription-parent` · `feat/inscription-parent-mots-de-passe`.

## Contexte

David commence les cours particuliers (surtout des collégiens) dans l'école dédiée **Akadada**
(créée en prod le 2026-10-21, classe NOELIE en 6e). Un élève mineur n'a pas toujours d'adresse ;
aujourd'hui la seule connexion est courriel + mot de passe (Google désactivé).

## Décisions de David (2026-10-21)

1. **Deux écrans** : « Je m'inscris » (élève seul, écran actuel inchangé) et « J'inscris mon
   enfant » (parent : code de classe, son adresse, prénom de l'enfant, mot de passe de l'enfant).
2. **Compte de l'enfant = identifiant** (fausse adresse sur un domaine Chiphre qui ne reçoit rien) ;
   l'adresse du parent est un **contact**, pas un identifiant. Écarté : alias `parent+prenom@…`
   créé automatiquement (`+` pas géré partout ; la confirmation obligatoire n'arriverait jamais).
3. **Un seul lien au parent** = confirmation de son adresse **et** consentement parental (case
   explicite sur la page).
4. **Mot de passe oublié** : le parent (lien par courriel) **et** le prof peuvent réinitialiser ;
   l'enfant peut changer lui-même son mot de passe.
5. Aucun courriel ne part vers une fausse adresse (bienvenue, notifications, réinitialisation).

6. **Identifiant** : prénom sans accent ni majuscule + 2 chiffres, **sans point** (`noelie42`) ;
   saisie insensible aux majuscules et aux accents.
7. **Prénom seul** demandé au parent (minimisation) ; le prof ajoute le nom dans l'admin s'il le
   faut — vérifier en phase 0 que le profil accepte un nom vide.
8. **Question d'accès : le parent ne voit rien du compte de l'enfant** (il n'a pas de compte, il
   reçoit seulement des liens) ; le bilan reste le PDF envoyé par le prof.
9. **Noélie** s'inscrit dès maintenant par l'écran actuel avec **l'adresse de son parent telle
   quelle** (un seul enfant → pas d'alias) ; son compte n'aura pas à être converti.
10. **Écran « Je m'inscris » (élève seul)** : l'élève soumis au consentement donne l'adresse d'un
    parent ; le lien de consentement part **après approbation de l'adresse par le prof** (un clic
    dans son tableau de bord) — jamais directement sur une adresse fournie par l'enfant (RGPD
    art. 8 : efforts raisonnables de vérification).

## Phase 0 — comportements (2026-10-21, validée)

### Constats dans le code

- `profiles.lastname` accepte `NULL` et `handle_new_user` met `''` sans nom → **le prénom seul passe** (décision 7 tenue sans migration).
- Connexion : `loginFormSchema` n'accepte qu'une adresse ; « mot de passe oublié » aussi (`requestPasswordResetSchema`).
- `signUp` + confirmation obligatoire en prod → un compte à fausse adresse ne serait jamais confirmé. Le compte de l'enfant doit être créé **côté serveur** (`auth.admin.createUser`, adresse marquée confirmée), le trigger `handle_new_user` restant le seul créateur du profil (code de classe → `approved`, classe, niveau, CGU).
- Aucune réinitialisation de mot de passe par le prof n'existe. `/auth/update-password` marche pour toute session, mais aucun lien n'y mène depuis les réglages.
- Courriels qui partent vers l'adresse d'un élève : bienvenue (`api/teacher/send-welcome-email`, page `teacher/welcome-email`), confirmation et réinitialisation (GoTrue).
- Une classe de 6e → `consent_required` ; ~~la période de grâce (date fixe 2026-06-30) est passée~~ **FAUX** (2026-10-21) : tout nouveau compte reçoit 30 jours de grâce (`apply_consent_rule_by_grade`) ; David a confirmé la lecture seule → le serveur retire la grâce.

### Écran « J'inscris mon enfant » (`/auth/register/parent`, lien depuis `/auth/register`)

Champs : code de classe, prénom de l'enfant, mot de passe de l'enfant (+ confirmation), adresse du parent, CGU.

**Nominal**

1. Le parent remplit le formulaire → le serveur valide (Zod), limite le débit (IP + adresse du parent), vérifie le code.
2. Le serveur choisit un identifiant libre `prenom` + 2 chiffres (`noelie42`), crée le compte (`noelie42@<domaine fictif>`, confirmé d'office), avec code de classe, prénom et CGU en métadonnées → profil `approved` dans la classe, en lecture seule.
3. Une demande de consentement est créée pour l'adresse du parent, et **un seul courriel** part au parent : identifiant de l'enfant + lien unique.
4. L'écran affiche l'identifiant (« Notez-le : noelie42 ») et « un courriel vous a été envoyé ».
5. Le parent ouvre le lien → page avec **case à cocher explicite** → valider = adresse du parent confirmée **et** consentement accordé → l'enfant a l'accès complet.

**Limites**

- Prénom avec accents, majuscules, tirets ou espaces (« Noélie », « Jean-Marc ») → identifiant `noelie42`, `jeanmarc07` ; le profil garde le prénom tel que saisi.
- Prénom sans aucune lettre latine après nettoyage → refus avec message.
- Les 100 suffixes d'un prénom sont pris → 3 chiffres (pas de refus).
- Deux enfants du même parent → deux inscriptions, deux identifiants, deux liens.
- Niveau sans consentement (1re/Tle) → pas de courriel de consentement ; à trancher (Q4).
- À la connexion, `NOELIE42` ou `noélie42` → accepté (insensible à la casse et aux accents).

**Erreurs**

- Code invalide ou inscriptions fermées → erreur sur le champ, aucun compte créé.
- Mot de passe hors politique, CGU non cochées, adresse invalide → erreur par champ, formulaire re-rempli (sauf mots de passe).
- Débit dépassé → 429, message.
- Envoi du courriel en échec → le compte existe ; message « le courriel n'a pas pu partir, votre professeur pourra le renvoyer » ; le prof le renvoie depuis la page du consentement existante.
- Lien expiré (7 jours) ou déjà utilisé → page d'erreur actuelle ; le prof renvoie.

### Connexion et mots de passe

**Nominal**

- `/auth/login` : un seul champ « Adresse ou identifiant ». Une valeur sans `@` est un identifiant → normalisée → adresse fictive → même chemin qu'aujourd'hui. Même message d'échec unique (pas d'énumération).
- **Parent** : « Mot de passe oublié » accepte un identifiant ; le lien part à l'**adresse du parent** (celle du consentement), jamais à la fausse adresse. Réponse neutre dans tous les cas.
- **Prof** : bouton « Réinitialiser le mot de passe » sur la fiche d'un élève → modalités Q3.
- **Enfant** : lien « Changer mon mot de passe » dans ses réglages.

**Limites / erreurs**

- Identifiant inconnu, ou enfant sans adresse de parent → réponse neutre, aucun courriel.
- Aucun courriel (bienvenue, notification, confirmation, réinitialisation) ne part vers une adresse du domaine fictif : **garde unique** dans l'envoi (Brevo) + refus côté réinitialisation ; testé.

### Écran « Je m'inscris » (élève seul), décision 10

**Nominal**

- Si le code mène à une classe soumise au consentement, l'écran demande en plus l'adresse d'un parent (obligatoire).
- Inscription comme aujourd'hui (confirmation de l'adresse de l'élève). La demande de consentement est créée **en attente d'approbation du prof**, sans courriel.
- Tableau de bord du prof : « Adresses de parents à approuver » → un clic **Approuver** envoie le lien ; **Refuser** le supprime (le prof corrige l'adresse dans la page du consentement).

**Limites / erreurs**

- Adresse du parent = celle de l'élève → refus (« donne l'adresse d'un parent »).
- Classe sans consentement → pas de champ.

### Hors périmètre

- Le parent n'a **aucun compte** et ne voit rien (décision 8).
- Noélie : inscrite par l'écran actuel, rien à convertir (décision 9).
- Cloisonnement d'Akadada (A) et année de la classe (C) : chantiers suivants.

### Découpage proposé (une PR chacune)

1. **Connexion par identifiant + garde « aucun courriel vers le domaine fictif »** (sans migration).
2. **Écran « J'inscris mon enfant » + lien unique** (création serveur, courriel, page de consentement à case).
3. **Mots de passe** : parent par identifiant, prof, enfant.
4. **Écran élève seul : adresse du parent + approbation du prof** (migration probable : état « à approuver » de la demande).

### Questions à trancher (David)

- **Q1 — Domaine fictif** : `@eleves.chiph.re` (sous-domaine sans serveur de courrier, avec un enregistrement « null MX » pour qu'aucun courriel ne puisse y arriver) ? _Recommandé._
- **Q2 — Avant le clic du parent** : le compte de l'enfant marche-t-il tout de suite en **lecture seule** (recommandé : l'enfant commence dès le soir même, rien de social ni d'écriture), ou est-il **bloqué** jusqu'au clic ?
- **Q3 — Réinitialisation par le prof** : un **mot de passe provisoire généré**, affiché une seule fois au prof (recommandé), ou le prof tape lui-même le nouveau mot de passe ?
- **Q4 — Niveau sans consentement (1re/Tle) par l'écran parent** : on envoie quand même un lien au parent (pour confirmer son adresse, utile au mot de passe oublié), ou rien ? _Recommandé : le lien, sans case de consentement._
- **Q5 — Garde-fou contre l'abus** : plafond de comptes créés par adresse de parent (ex. 5 par 24 h) en plus des limites par IP ? _Recommandé._
- **Q6 — Question d'accès (avant tout SQL, PR 4)** : l'adresse du parent saisie par l'élève est écrite **par le serveur** dans la demande de consentement ; qui la lit ? _Proposé : le prof et l'admin seulement, comme aujourd'hui ; l'élève ne la relit pas._ Personne ne gagne de lecture nouvelle.

### Réponses (2026-10-21)

David : « je suis tes recos » → phase 0 validée, et pour chaque question la recommandation :
Q1 `@eleves.chiph.re` + null MX · Q2 lecture seule avant le clic · Q3 mot de passe provisoire
généré, affiché une fois · Q4 lien sans case de consentement pour 1re/Tle · Q5 plafond ~5 comptes
par adresse de parent et par 24 h · Q6 adresse du parent lue par le prof et l'admin seulement.

## PR 1 — connexion par identifiant (2026-10-21)

- `src/lib/utils/child-account.ts` : `CHILD_ACCOUNT_DOMAIN`, `normalizeLoginIdentifier` (NFKC,
  lettres non décomposables, `[a-z0-9]`), `isChildAccountEmail`.
- `/auth/login` accepte adresse ou identifiant ; Brevo, `/auth/reset-password` et
  `/auth/register` refusent le domaine fictif.
- Revues : `code-reviewer` (3 mineurs, 2 corrigés, le 3e = PR 3) ; `security-auditor` (aucun
  bloquant ; Moyen 1 — `signUp` GoTrue direct → PR 2 ; Faible 2 — null MX absent → facultatif (David, 2026-10-21) ;
  Faible 3 — même normalisation à la création → PR 2). Mesure prod : 83 comptes, aucune adresse
  en majuscules → personne ne perd sa connexion.

## PR 2 — écran « J'inscris mon enfant » (2026-10-21)

Décisions de David (2026-10-21) :

- **Migration anti-squat** : trigger sur `auth.users` refusant `@eleves.chiph.re` sans
  `app_metadata.child_account = true`. Question d'accès : personne ne gagne de lecture ;
  personne ne perd rien (0 compte sur ce domaine en prod, mesuré).
- **1re/Tle (Q4)** : même table `parental_consents`, le clic « Je confirme mon adresse »
  passe la ligne à `granted` (preuve = date, IP, navigateur ; pas de case).

Constat : GoTrue insère la ligne d'`auth.users` puis écrit ses `app_metadata` par un UPDATE
dans la même transaction → trigger de contrainte `deferrable initially deferred`, relisant
la ligne au commit. Rouge prouvé sans la migration (3 tests sur 5), vert avec.

Revues (2026-10-21) :

- `code-reviewer` : lien expiré plus marqué `expired` (corrigé : `grant_parental_consent` répond) ;
  plafond parent consommé avant le code (corrigé : compté après) ; courriel promettait la
  réinitialisation par le parent (retiré jusqu'à la PR 3) ; `weak_password` GoTrue → erreur sur le
  champ ; exceptions après création (corrigé) ; écran de réussite en 1re/Tle (corrigé).
- `security-auditor` : **B1** 30 jours d'accès complet avant le clic (constat de phase 0 faux) →
  David : lecture seule (2026-10-21), grâce retirée par le serveur, test rouge puis vert.
  **M1** clé du plafond contournable (`+tag`, points Gmail) → `mailboxKey`, limite fermée en panne,
  prénom restreint aux lettres. **Restent pour David** : M1 bis — un plafond par classe (code fuité
  = comptes à volonté, 40/h par IP) ; **M2** — identifiant `prenom` + 2 chiffres devinable (100
  candidats par prénom), pulvérisation de mots de passe par GoTrue direct : allonger le suffixe ?
  vérifier la limite de connexion GoTrue de prod ; **F1** — vérifier « Secure email change » et la
  confirmation d'adresse dans le Dashboard de prod (✅ vérifié par David le 2026-10-21) ; **F2** — `profiles.email` modifiable par son
  propriétaire (préexistant). F3 (1re/Tle = `granted`) : décision prise. F4 : documenté dans
  `rgpd.md`. F5 : oracle de code identique à `/auth/register`.

## PR 3 — mots de passe (phase 0, 2026-10-21, validée)

David (2026-10-21) : « je suis tes recos » → R1 rien ne part sans adresse confirmée · R2 page
dédiée sans session · R3 changement obligatoire · R4 tous les élèves, jamais prof ni admin.

### Constats dans le code

- `/auth/reset-password` : `resetPasswordForEmail` fait envoyer le lien par GoTrue **à l'adresse du
  compte** ; pour un enfant, elle est fictive (la PR 1 coupe l'envoi). Pour viser le parent :
  `auth.admin.generateLink({ type: 'recovery' })` rend le jeton **sans rien envoyer**, et Brevo
  envoie notre propre lien au parent. Aucune migration.
- Adresse du parent = `parental_consents.parent_email` (élève : aucune policy d'écriture ; prof et
  admin : écriture, `updateParentEmail`). Plusieurs lignes possibles par élève → la plus récente.
- `/auth/update-password` marche pour toute session ; succès → `/`. Aucun lien n'y mène depuis
  `/dashboard/profile`, qui affiche `profile.email` (pour un enfant : `noelie42@eleves.chiph.re`).
- Aucune action prof sur le mot de passe d'un élève. Fiche d'élève côté prof = panneau de
  `/dashboard/admin/users` (prénom, nom, classes, approbation).

### Parent : « Mot de passe oublié » par identifiant

**Nominal**

1. `/auth/reset-password` : champ « Adresse ou identifiant » (même normalisation que la connexion).
2. Identifiant d'un enfant → le serveur trouve le compte, puis la demande au parent la plus récente.
3. Si l'adresse du parent est **confirmée** (R1) → courriel Brevo **au parent** : « Choisir un
   nouveau mot de passe pour Noélie (noelie42) », lien valable 1 h.
4. Le lien ouvre une page **sans connecter personne** (R2) : nouveau mot de passe + confirmation →
   « C'est fait : Noélie peut se connecter avec noelie42 et ce mot de passe ».
5. Réponse de l'écran : **la même phrase neutre** que pour une adresse.

**Limites / erreurs**

- Identifiant inconnu, enfant sans demande au parent, adresse non confirmée → phrase neutre, rien
  ne part. Le prof reste le recours.
- Le parent tape **sa propre adresse** → c'est une adresse : rien (il n'a pas de compte), phrase
  neutre. Retrouver l'identifiant oublié : hors périmètre (le prof le donne).
- Débit : mêmes limites qu'aujourd'hui (IP + compte visé).
- Lien expiré ou déjà servi → message, retour à « Mot de passe oublié ».
- Mot de passe hors politique / `weak_password` → erreur sur le champ.
- Garde : aucun envoi vers `@eleves.chiph.re`, jamais (test).

### Prof : mot de passe provisoire (Q3)

**Nominal**

- Panneau de l'élève dans `/dashboard/admin/users` : bouton « Réinitialiser le mot de passe » →
  confirmation → le serveur génère un mot de passe provisoire lisible (ex. `tigre-lune-47`) et
  l'applique → affiché **une seule fois**, avec un bouton copier.
- À la connexion suivante, l'élève doit choisir son propre mot de passe avant tout (R3).

**Limites / erreurs**

- Élève hors des élèves du prof → 403 ; compte prof ou admin → refusé (R4) ; l'admin : tous.
- Le mot de passe provisoire n'est ni stocké ni journalisé ; recharger la page ne le réaffiche pas.

### Enfant (et tout élève) : « Changer mon mot de passe »

- `/dashboard/profile` : lien « Changer mon mot de passe » → `/auth/update-password`, qui demande
  l'**ancien** mot de passe en plus (une session laissée ouverte ne suffit pas), sauf au retour
  d'un lien de réinitialisation ou d'un mot de passe provisoire.
- Profil d'un enfant : « Identifiant : noelie42 » au lieu de la fausse adresse.

### Courriel et `/consent/[token]`

- Y rétablir : « Si Noélie oublie son mot de passe : « Mot de passe oublié » avec son identifiant,
  le lien vous arrivera » (après confirmation de l'adresse).

### Questions à trancher (David)

- **R1 — Adresse du parent pas encore confirmée** (lien d'inscription jamais cliqué) : rien ne part
  (recommandé : l'adresse n'est pas prouvée, le prof reste le recours), ou on envoie quand même ?
- **R2 — Le parent connecté comme l'enfant ?** Le circuit standard de Supabase ouvre une session de
  l'enfant chez le parent (il verrait le compte, contraire à la décision 8). _Recommandé : page
  dédiée qui change le mot de passe sans ouvrir de session._
- **R3 — Mot de passe provisoire à changer obligatoirement** à la connexion suivante ? _Recommandé :
  oui_ (marque dans `app_metadata`, sans migration ; levée au changement).
- **R4 — Réinitialisation par le prof** : tous ses élèves (y compris ceux qui ont une vraie adresse
  et pourraient la faire eux-mêmes) ? _Recommandé : oui, tous les élèves ; jamais un prof ou un
  admin._

### Tests et revue prévus

- Serveur : reset par identifiant (adresse confirmée → Brevo au parent ; non confirmée, inconnu →
  rien, même réponse) ; page du parent (jeton valide, expiré, sans session ouverte) ; action prof
  (autorisation, rôle, mot de passe non rendu deux fois) ; changement obligatoire ; ancien mot de
  passe exigé. Pas de migration ni de RLS → pas d'intégration.
- Revue : `code-reviewer` + `security-auditor` (auth, données d'élèves).

### Implémentation (2026-10-21)

- `src/lib/server/child-password.ts` : cible du parent (demande la plus récente `granted`),
  jeton `generateLink` sans envoi, changement par jeton sur client jetable, mot de passe
  provisoire (`Mot-Mot-NN`), ancien mot de passe, `amr` récent.
- Mesures en local : session d'un lien = `amr: otp` ; jeton réutilisé → `otp_expired` ;
  `app_metadata` fusionné ; changement par la clé service = **toutes** les sessions fermées,
  par l'élève = la sienne gardée ; `app_metadata` seul = aucune fermée.
- Preuve rouge : sans `signOut`, le test 3 (jeton d'un adulte refusé) laisse une session → rouge.
  Le test 2 ne peut pas l'être (GoTrue ferme déjà les sessions au changement de mot de passe).
- Écarts au plan : mention de `/consent/[token]` conditionnelle (le RPC ne dit pas si le compte
  est un enfant à identifiant) ; « Changer mon mot de passe » visible pour tous les rôles du profil.
- Doc : `auth.md` (§ Mots de passe des élèves, chaîne des handles complétée d'`accountStatusHandle`,
  qui manquait), `serveur.md`, `architecture-generale.md`, `comptes-classes-ecoles.md`,
  `conformite/rgpd.md`, `conformite/consentement-parental.md`.

### Revues de la PR 3 (2026-10-21)

`security-auditor` :

- **B1 (bloquant)** : jeton GoTrue dans le courriel → session sur le compte de l'enfant. Refonte en cours (jeton maison). Optionnel en plus : `/auth/confirm` refuse un `recovery` d'un compte `child_account`.
- **M1** : le prof peut réécrire `parent_email` d'une demande déjà `granted` (`teacher/consent`, `updateParentEmail`) → le lien partirait à une adresse non confirmée. **David : refuser** (le consentement vit sur le profil, `consent_granted_at`). À faire.
- **M2** : « ancien mot de passe exigé » n'est qu'une garde d'interface (`supabase.auth.updateUser` depuis la console d'une session ouverte). « Secure password change » de GoTrue enverrait un code à l'adresse fictive des enfants. **David : documenter** comme garde d'interface, risque accepté (qui tient la session a déjà le compte ; prof et parent peuvent réinitialiser). À faire (doc).
- **F-a** (= revue n° 6) : le temps de réponse de « Mot de passe oublié » révèle un enfant à parent confirmé → durée plancher (~2 s) sur tous les chemins. À faire.
- **F-b** : cible cherchée par `profiles.email` (modifiable) → relecture GoTrue (adresse + `child_account`) : **fait** (test 3 bis).
- **F-c** : suivi des clics Brevo = le lien journalisé chez Brevo. _David : vérifier/couper le suivi des clics du transactionnel._

`code-reviewer` :

1. Nouvel essai impossible après `weak_password` (jeton GoTrue consommé) : **résolu par la refonte** (jeton effacé au succès seulement, test 2 ter).
2. Compte sans fournisseur `email` (Google) : « Changer mon mot de passe » sans issue. **David : masquer** le bouton si `app_metadata.providers` n'a pas `email`. À faire.
3. Fermer la fenêtre du prof pendant la requête → mot de passe appliqué sans être vu : ignorer la fermeture pendant `isResetting`. À faire.
4. Marque non levée → l'élève doit choisir un 3e mot de passe (`same_password`) : nouvel essai de la levée + message clair. À faire.
5. Ancien mot de passe sur le seau de connexion (3/15 min) : seau dédié + `currentPassword` dans le schéma Zod. À faire.
6. = F-a.
