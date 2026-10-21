# Inscription par le parent — journal

## Reprendre ici

_Mis à jour le 2026-10-21, après #1585._

- **État** : phase 0 validée (Q1-Q6 : David suit mes recommandations). **PR 1 mergée (#1585)** : connexion par identifiant (`src/lib/utils/child-account.ts`), aucun courriel vers `@eleves.chiph.re`. Pas en prod.
- **Prochaine action** : PR 2 — écran « J'inscris mon enfant » + lien unique au parent (phase 0 ci-dessous, § « J'inscris mon enfant »). Worktree à recréer : `feat/inscription-parent-ecran`.
- **En attente de David** : null MX chez OVH (`eleves.chiph.re. MX 0 .` + `v=spf1 -all`), avant la PR 2 en prod.
- **Pièges en cours** : compte de l'enfant créé côté serveur (`auth.admin.createUser`, confirmé), jamais `signUp` ; **fermer côté base** un `signUp` GoTrue direct sur `@eleves.chiph.re` (squat d'identifiant, audit PR 1) ; identifiant généré par la même normalisation que la connexion (`normalizeLoginIdentifier`) et unicité sur la forme repliée ; question d'accès avant tout SQL ; tests d'intégration + `code-reviewer` + `security-auditor`.
- **Worktree / branche** : aucun (celui de la PR 1 supprimé).

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
- Une classe de 6e → `consent_required` ; la période de grâce (date fixe 2026-06-30) est passée → **lecture seule** jusqu'au consentement.

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
  bloquant ; Moyen 1 — `signUp` GoTrue direct → PR 2 ; Faible 2 — null MX absent → David/OVH ;
  Faible 3 — même normalisation à la création → PR 2). Mesure prod : 83 comptes, aucune adresse
  en majuscules → personne ne perd sa connexion.
