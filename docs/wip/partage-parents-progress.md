# Partage avec les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-16, après #2724._

- **État** : PR 1 (#2718, migration, en prod) et PR 2 (#2724 : page du carnet, confirmation, vue élève, doc `docs/systeme/carnet-de-liaison.md`) **mergées**. PR 2 pas encore déployée (`deploy:prod` = David). Rien d'autre de codé.
- **Prochaine action** : PR 3 — nouveau worktree ; côté professeur (D1-D3 : activer le carnet par classe, seuils, adresses par élève, révoquer, couper le partage) + envoi des liens et des confirmations par Brevo (A1-A6).
- **En attente de David** : **Q26** — à la confirmation, afficher le carnet (fait aujourd'hui) ou envoyer son lien par courriel (recommandé : un antivirus qui « clique » emporterait sinon le lien) ; **Q27** — garder dans le carnet une évaluation sans échéance non faite de plus de 5 semaines (recommandé, migration en PR 4). Détail : section « PR 2 ».
- **Pièges en cours** : données d'élèves mineurs ; fonctions à lien = `service_role` seul, via `src/lib/server/carnet/` (limite de débit par IP) ; jeton 43 car. base64url, stocké haché, masqué dans `error_logs` et l'analytique (`redactSecretUrl`) ; la confirmation émet le lien : **la PR 3 envoie CE jeton par courriel** (un second révoquerait le premier) ; `23505` sur (élève, empreinte) à traiter ; en-tête `List-Unsubscribe-Post` pour l'arrêt en un clic ; revue `code-reviewer` + `security-auditor` à chaque PR.
- **Ensuite** : PR 4 (courriels d'exception, épisodes, effacement Q21, Q27), PR 5 (versement de la doc, registre RGPD, point 8 de `presentation-parents`).
- **Worktree / branche** : aucun (le prochain : `../ubumaths-wt-partage-parents`, `feat/partage-parents-pr3`).

## Origine

Né du chantier `presentation-parents` (point 8, « Comment le suivre ? »), le 2026-11-16 : « il y a une vraie réflexion à mener sur ce qu'on partage avec les parents, et comment on le fait ». David : chantier **extrêmement important**. Le bloc « Suivre son travail » de `/parents` est retiré en attendant ; il sera réécrit à la fin de ce chantier (`docs/wip/presentation-parents-progress.md`).

## Ce qui existe (vérifié le 2026-11-16)

- **Liens sans compte, par classe** : cahier de textes (`/cahier/[token]`) et cours (`/cours/[token]`, [ADR 0025](../adr/0025-cours-lisible-par-lien-sans-compte.md)). Rien de personnel : ce que voit tout élève de la classe.
- **L'adresse du parent est connue** : consentement parental (`parental_consents.parent_email`) et inscription par le parent (`/auth/register/parent`). Courriels envoyés par Brevo (`src/lib/server/email/brevo.ts`).
- **Pas de compte parent** ; décision 8 du 2026-10-21 : « le parent ne voit rien du compte de l'enfant » (`docs/archive/wip/inscription-parent-progress.md`).
- **Argent** (décision du 2026-10-11, `docs/wip/roue-des-publics-progress.md`) : le « suivi personnalisé » sera payant hors des classes de David.
- Données qui existent sans vue parent : activité et révisions (FSRS), progression par point du programme, évaluations et notes, avertissements C/M/R/T (`docs/systeme/messagerie-et-moderation.md`).

## Tour 1 (posé le 2026-11-16)

- **Q1 — Quoi partager** : (a) vie de la classe ; (b) activité ; (c) résultats ; (d) comportement ; (e) alertes.
- **Q2 — Qui décide de ce qui part** : le professeur, par classe ou par élève ? ou une règle fixe ?
- **Q3 — L'élève voit-il ce que voient ses parents ?**
- **Q4 — 1re et Terminale** (l'élève consent lui-même) : le parent voit-il quelque chose ?
- **Q5 — Parent A / parent B** : même suivi, ou le suivi détaillé est-il l'offre payante ?

## Décisions de David

### 2026-11-16 (tour 1, recommandations suivies)

- **Q1 — Quoi** : (a) vie de la classe + (b) activité + (e) alertes pour commencer ; (c) résultats dans le suivi détaillé (voir Q5) ; (d) comportement écarté pour l'instant (un avertissement mal compris à la maison).
- **Q2 — Qui décide** : le professeur, par classe, avec une règle par défaut.
- **Q3 — Transparence** : l'élève voit ce que reçoivent ses parents (mention dans son Cabinet).
- **Q5 — A / B** : base commune (a)+(b)+(e) pour tous ; le détail (c) en plus dans l'offre payante.
- **Q4** : David conteste la recommandation « seulement si l'élève l'accepte » (« pourquoi donner à l'élève la possibilité de cacher ? »). Rediscutée : l'autorité parentale court jusqu'à 18 ans ; le seuil RGPD de 15 ans porte sur le consentement au traitement, pas sur l'information des parents. Cas limite : un élève **majeur** en Terminale. Chiphre ne connaît aucune date de naissance (aucune colonne dans `database.ts`).
- **Q4 — 1re et Terminale** (tranchée après discussion) : **même partage qu'aux autres niveaux** ; un élève **majeur** peut demander l'arrêt au professeur, qui coupe le partage pour lui. **Pas de date de naissance enregistrée** (minimisation). Écarté : « seulement si l'élève l'accepte » (David : « pourquoi donner à l'élève la possibilité de cacher ? » ; l'autorité parentale court jusqu'à 18 ans, comme l'ENT du lycée) ; arrêt automatique à 18 ans (exige une date de naissance).

## Tour 2 (posé le 2026-11-16) : comment partager

- **Q6 — Canal** : courriel périodique ; lien personnel par élève ; compte parent ; PDF du professeur.
- **Q7 — Rythme** : hebdomadaire seul, ou alertes immédiates en plus ?
- **Q8 — Quelles adresses** : seulement une adresse confirmée (consentement accordé) ; comment l'obtenir en 1re/Tle (pas de consentement, donc pas d'adresse) ; un ou deux parents ?
- **Q9 — Arrêt par le parent** : lien de désinscription dans chaque courriel ?
- **Réaction de David (Q6)** : « pas convaincu de l'efficacité des mails, on est tous déjà submergés ». Q6 reformulée en deux questions : **où le parent consulte** (page) et **quand on le dérange** (rare, sur exception). Q7 à Q9 attendent. Constat : Chiphre n'a ni manifeste PWA ni notifications push (seul `/python` enregistre un service worker).

### 2026-11-16 (tour 2, recommandations suivies)

- **Q6a — Où** : une **page parent personnelle, sans compte**, toujours à jour (activité de la semaine, alertes en cours, liens du cahier et du cours), ajoutable à l'écran d'accueil. Lien délivré **seulement à une adresse confirmée**, révocable par le professeur, expirant chaque année. Écartés pour l'instant : compte parent (lourd, contredit la décision 8 ; à rediscuter pour l'offre payante) ; rien à consulter.
- **Q6b — Quand déranger** : **sur exception seulement** (« pas de nouvelles, bonnes nouvelles »), **par courriel d'abord** (Brevo existe) ; notification push plus tard (à construire : manifeste, push ; iPhone = écran d'accueil). Écartés : bilan hebdomadaire systématique (submerge, objection de David) ; SMS (numéro de plus à collecter).
- La décision 8 du 2026-10-21 tient : le parent reçoit des informations, il ne voit pas le compte de l'enfant.

## Tour 3 (posé le 2026-11-16)

- **Q7 — Exceptions et seuils** (réglables par le professeur, Q2).
- **Q8 — Adresses** : confirmées seulement, jusqu'à deux ; 1re/Tle.
- **Q9 — Arrêt des courriels** par le parent.
- **Q10 — Un lien par parent ou par élève.**
- **Q11 — Vacances** : pas d'alerte pendant les vacances scolaires (`school_holidays` existe).
- **Q12 — Nom** de la page parent (terme pour `CONTEXT.md`).

### 2026-11-16 (tour 3, recommandations suivies)

- **Q7 — Exceptions** (seuils par défaut, réglables par le professeur par classe) : évaluation non faite à son échéance (`evaluations.deadline`) ; révisions en retard depuis plus de 7 jours ; aucune activité depuis 15 jours. **Plus un message positif une fois par trimestre** (que le courriel de Chiphre ne soit pas toujours une mauvaise nouvelle).
- **Q8 — Adresses** : jusqu'à **deux**, **chacune confirmée** par son propre lien ; rien vers une adresse non confirmée. 1re/Tle : saisie par le professeur ou l'élève, confirmation par le parent (sans valeur de consentement).
- **Q9 — Arrêt** : lien « ne plus recevoir » dans chaque courriel ; le carnet reste accessible.
- **Q10 — Un lien par parent** (révocation séparée, ex. parents séparés ; traçabilité d'une fuite).
- **Q11 — Vacances** : aucune alerte pendant les vacances scolaires (`school_holidays`), sauf échéance fixée par le professeur dans la période.
- **Q12 — Nom** : **« Carnet de liaison »** (l'objet scolaire que les parents connaissent) ; le décor du Royaume reste dans l'illustration. Ajouté à `CONTEXT.md` avec « Parent ».

### 2026-11-16 (tour 4, recommandations suivies)

- **Q13 — Contenu du carnet** : (i) jours travaillés, semaine en 7 cases ; (ii) révisions « à jour » ou « N en retard » ; (iii) évaluations à venir (échéance) et passées, faites ou non, **sans la note**. Écarté : (iv) temps passé (mal mesuré : un onglet ouvert compte comme du travail).
- **Q14 — Période** : semaine en cours + 4 précédentes.
- **Q15 — Élève** : voit **le même carnet** depuis son Cabinet, avec « Tes parents voient cette page » ; ne voit pas les adresses de ses parents.
- **Q16 — Question d'accès (validée)** : le détenteur du lien d'un parent lit, pour **un seul élève**, jours d'activité, état des révisions, évaluations (faites ou non, échéance, sans note) et liens de sa classe ; **ni** notes, **ni** réponses, **ni** messages, **ni** avertissements, **ni** profil, **ni** autre élève. L'élève lit son propre carnet (aucun accès nouveau). Le professeur lit les adresses confirmées et l'état des liens. Personne d'autre. Accès par fonction `SECURITY DEFINER` recevant le lien ; aucune policy `anon`.

## Comportements (proposés le 2026-11-16, à valider)

Vocabulaire : **lien du parent** = l'adresse de son carnet ; **adresse confirmée** = le parent a cliqué le lien de confirmation (ou le lien du consentement) ; **jour travaillé** = au moins un exercice, une révision ou une évaluation rendue ce jour-là (une simple connexion ne compte pas).

### A. Adresses et liens

- **A1 (nominal)** : l'adresse d'un consentement accordé compte comme confirmée. Quand le carnet est activé pour la classe de l'élève, cette adresse reçoit **un** courriel avec son lien.
- **A2 (nominal)** : le professeur, ou l'élève depuis son Cabinet, saisit une adresse (2e parent, ou 1re/Tle sans consentement). Elle reçoit **seulement** un courriel de confirmation ; le lien du carnet part après le clic.
- **A3 (limite)** : deux adresses confirmées au plus. Une troisième est refusée : « Deux parents reçoivent déjà ce carnet. »
- **A4 (limite)** : lien de confirmation valable 7 jours ; renvoi possible, 3 envois au plus par adresse.
- **A5 (erreur)** : le destinataire clique « Je ne suis pas le parent de cet élève » : l'adresse est effacée, le professeur le voit, et cette adresse ne peut plus être saisie pour cet élève.
- **A6 (limite)** : « J'ai perdu mon lien » : le parent saisit son adresse ; si elle est confirmée, le lien lui est renvoyé. **Même réponse** à l'écran dans tous les cas (pas de moyen de savoir si une adresse est connue).

### B. Le carnet (page du parent)

- **B1 (nominal)** : lien valide → **palier de régularité par semaine** sur 5 semaines (en cours + 4 ; Q25 remplace les 7 cases), révisions « à jour » ou « N en retard », évaluations à venir (échéance) et passées (faite / non faite, **sans note**), liens du cahier et du cours de la classe s'ils existent. `noindex`.
- **B2 (limite)** : aucune activité → cases vides et phrase neutre (« Pas encore de travail cette semaine »), sans rouge ni alarme.
- **B3 (limite)** : l'élève change de classe → le carnet le suit ; les liens du cahier et du cours sont ceux de sa classe actuelle.
- **B4 (erreur)** : lien révoqué, expiré, inexistant, partage coupé, élève sorti de la classe → **la même page** « Ce lien n'est plus valide. Demandez-en un nouveau au professeur. » (comme l'ADR 0025).
- **B5 (limite)** : le lien expire le 31 août.

### C. Côté élève

- **C1 (nominal)** : dans son Cabinet, « Mon carnet de liaison » montre le même carnet, avec « Tes parents voient cette page ». Sans adresse confirmée : « Aucun parent ne reçoit encore ton carnet. »
- **C2 (nominal)** : l'élève voit la liste des courriels envoyés à ses parents (date et motif), jamais les adresses.
- **C3 (limite)** : partage coupé (élève majeur) : « Le partage avec tes parents est arrêté. »

### D. Côté professeur

- **D1 (nominal)** : par classe : activer le carnet ; seuils (évaluation non faite, révisions en retard depuis N jours, aucune activité depuis N jours) ; message trimestriel oui / non.
- **D2 (nominal)** : par élève : état de chaque adresse (en attente, confirmée, courriels arrêtés par le parent, invalide) ; ajouter une adresse ; renvoyer une confirmation ; révoquer un lien ; envoyer un nouveau lien ; couper le partage.
- **D3 (limite)** : couper le partage révoque les liens et arrête les courriels ; le rétablir envoie de nouveaux liens (les anciens restent morts).

### E. Courriels d'exception

- **E1 (nominal)** : un passage par jour. Exceptions : évaluation non faite le lendemain de son échéance ; révisions en retard depuis plus de 7 jours ; aucun jour travaillé depuis 15 jours.
- **E2 (limite)** : une exception n'est signalée **qu'une fois** par épisode ; elle ne repart que si elle se résout puis revient.
- **E3 (limite)** : vacances scolaires (`school_holidays`) : aucun courriel, et les jours de vacances ne comptent pas dans les 15 jours ; sauf une évaluation dont l'échéance tombe dans les vacances.
- **E4 (nominal)** : message positif en fin de trimestre, seulement s'il y a du vrai à dire (jours travaillés, révisions à jour) ; sinon rien.
- **E5 (nominal)** : le courriel dit le motif en une phrase et donne le lien du carnet ; rien de plus que le carnet. Lien « Ne plus recevoir ces courriels » en un clic ; le carnet reste ouvert ; réabonnement depuis le carnet.
- **E6 (erreur)** : envoi Brevo en échec → nouvel essai au passage suivant, sans doublon. Adresse rejetée définitivement → marquée invalide, le professeur le voit.
- **E7 (invariant)** : jamais de courriel d'exception vers une adresse non confirmée, ni si le partage est coupé, ni si le carnet de la classe est désactivé.

### Questions du tour 5

- **Q17 — Activation** : le carnet part-il seul (activé par défaut) ou au geste du professeur, classe par classe ? Recommandation : **au geste du professeur** (le premier courriel aux familles est une décision humaine).
- **Q18 — Courriel de confirmation** (adresse saisie, peut-être fausse) : que dit-il de l'élève ? Recommandation : **le prénom seul et le nom du professeur** ; ni nom de famille, ni école, ni classe.
- **Q19 — Plafond** : au plus **un courriel par semaine** par parent, qui regroupe les exceptions ? Recommandation : oui.
- **Q20 — Élèves hors classe** : pas de carnet dans la première version (aucun professeur pour le régler) ? Recommandation : oui, à rediscuter avec l'offre payante.
- **Q21 — Rentrée** : les adresses confirmées sont gardées et un nouveau lien part quand l'élève rejoint une classe au carnet activé ; adresses effacées quand l'élève quitte toute classe ou que le consentement expire ? Recommandation : oui.

### 2026-11-16 (tour 5, recommandations suivies)

- **Comportements A à E validés** tels quels.
- **Q17** : le carnet part **au geste du professeur**, classe par classe. **Q18** : courriel de confirmation = prénom seul + nom du professeur. **Q19** : un courriel par semaine au plus, qui regroupe les exceptions. **Q20** : pas de carnet pour les élèves hors classe dans la première version. **Q21** : adresses gardées d'une année à l'autre, nouveau lien à la rentrée ; effacées quand l'élève quitte toute classe ou que le consentement expire.
- ADR écrite : [0040](../adr/0040-carnet-de-liaison-lien-par-parent.md).

## Découpage en PR (validé le 2026-11-16)

1. **Migration** (additive) : adresses des parents (état, confirmation, arrêt des courriels), liens du carnet (un par adresse, expiration 31 août, révocation), réglages par classe, journal des courriels envoyés ; fonctions `SECURITY DEFINER` (lire le carnet par lien, confirmer, « je ne suis pas le parent », arrêter / reprendre les courriels). Tests d'intégration rouges d'abord ; `security-auditor` ; `db:migrate`, `db:types`.
2. **Page du carnet** `(public)/carnet/[token]` (B1-B5) + **vue élève** dans le Cabinet (C1-C3) + pages de confirmation et d'arrêt.
3. **Côté professeur** (D1-D3) + **envoi des liens et des confirmations** par Brevo (A1-A6).
4. **Courriels d'exception** : cron Vercel quotidien (E1-E7), plafond hebdomadaire, message trimestriel.
5. **Doc** : `docs/systeme/` (versement), puis point 8 de `presentation-parents`.

Question Q22 : le lien est-il stocké **haché** (comme un mot de passe) ? Conséquence : « J'ai perdu mon lien » envoie un **nouveau** lien et révoque l'ancien (on ne peut pas renvoyer un lien qu'on ne connaît plus).

### 2026-11-16 (découpage validé, Q22 suivie)

- Découpage en 5 PR validé. **Q22** : le lien est stocké **haché** ; « J'ai perdu mon lien » envoie un nouveau lien et révoque l'ancien. Reporté dans l'ADR 0040.

### 2026-11-16 (PR 1, définitions)

- **Q23 — Jour travaillé** = le **jour actif** déjà tranché au chantier `regularite` (`docs/systeme/analytique-prof.md`, `class_regularity_weeks`) : au moins 5 traces autonomes (`auto` / `srs` / `student_self`) le même jour de Paris, hors contrôle. David : « on avait déjà décidé ».
- **Q24 — Révision en retard** = carte **déjà révisée** (ligne `srs_card_stats`) dont l'échéance (`next_review`) est passée ; une carte jamais vue n'est pas un retard. Alerte « plus de 7 jours » = la plus ancienne échéance dépassée date de plus de 7 jours.
- **Q25 — Régularité du carnet** : **palier par semaine** (0, 1, 2-3, 4+), comme la grille du prof, jamais de date ni de nombre de jours. Remplace les « 7 cases » de Q13-i (la vue par jour avait été retirée de la grille, « trop précise », besoin P5).

## PR 1 — migration (2026-11-16)

- `supabase/migrations/20261116133453_carnet_de_liaison.sql` : tables `class_carnet_settings`, `parent_contacts`, `parent_carnet_links`, `student_carnet_opt_outs`, `parent_notifications` ; fonctions `carnet_payload` et `carnet_student_is_shared` (internes), `get_carnet_by_token`, `issue_parent_carnet_link`, `confirm_parent_contact`, `refuse_parent_contact`, `set_parent_emails_stopped` (service role seul), `get_my_carnet` (élève connecté, liste blanche de la garde DEFINER).
- Tests : `tests/integration/carnet-de-liaison.test.ts`, 25 ; rouges sans la migration (table absente), verts avec ; deux mutations vérifiées (EXECUTE rendu à `anon`, partage toujours ouvert) → les bons tests rougissent.
- Pas dans cette migration : création des adresses depuis les consentements (A1, fait par le serveur à l'activation, PR 3) ; épisodes d'exception et effacement des adresses (Q21) → migration de la PR 4.
- Revues (2026-11-16) : `code-reviewer` et `security-auditor` (Opus), **aucun finding bloquant**. Corrigés : arrêt des courriels qui trahissait un carnet fermé ; empreintes illisibles par le professeur (droits par colonne) ; verrou par élève entre émission d'un lien et coupure du partage ; semaines d'avant la rentrée retirées et vacances lues comme la grille du prof (année active de l'école) ; tests ajoutés (palier 4+, retard au jour de Paris, évaluation rendue par un autre élève, brouillon, assignation individuelle, classe sans carnet, source `teacher`, normalisation de l'adresse, limite par UPDATE, rentrée et vacances). 28 tests ; trois mutations vérifiées rouges.
- Laissés, écrits dans l'ADR : les liens du cahier et du cours vus par un parent survivent à la révocation de son lien. Non corrigé (trace sans effet sur l'accès) : `updated_by` / `stopped_by` posables par le professeur.
- **Pour la PR 3** : l'unicité (élève, empreinte) bloque aussi une adresse `pending` expirée ou `invalid` → le serveur traite `23505` (renvoyer la confirmation sur la ligne existante) ; jeton = 32 octets CSPRNG au moins ; dire à l'écran que couper le partage ne coupe pas les liens de classe.
- **Mergée** le 2026-11-16 (#2718), CI verte ; migration appliquée en prod (`--include-all` : une migration d'une autre session, horodatée après, était déjà passée).

## PR 2 — page du carnet et vue élève (2026-11-16)

- `pnpm db:types` : types du carnet ; les 5 tables classées dans « Établissement et personnes » (`scripts/generate-db-doc.ts`) et dans `JAMAIS` du remplissage local (adresses des parents jamais copiées).
- Module `src/lib/server/carnet/carnet.ts` (seul appelant des fonctions à lien, ajouté à la liste du service role) ; forme du carnet en Zod dans `src/lib/validation/carnet.ts` (retire toute clé hors liste : une note ajoutée côté SQL ne descend pas). Lien émis à la confirmation : `endOfSchoolYear()` (31 août, comme le cahier).
- `/carnet/[token]` (B1-B5, E5) : même 404 pour tout échec, `noindex`, `Cache-Control: private, no-store`, 30 lectures / min / IP ; boutons arrêter / reprendre les courriels ; le jeton ne redescend pas dans `data`. Referer : `<meta name="referrer" content="no-referrer">` sur les deux pages et `rel="noreferrer"` sur les liens cahier / cours (la politique du site, `strict-origin-when-cross-origin`, envoie l'adresse COMPLÈTE vers le site lui-même).
- `/carnet/confirmer/[token]` (A2, A5) : l'affichage n'appelle pas la base (un antivirus de messagerie qui ouvre le lien ne confirme ni ne refuse) ; « Confirmer » et « Je ne suis pas le parent » = boutons (POST), 10 / min / IP. Confirmer → lien émis → redirection vers le carnet `?bienvenue`.
- `/dashboard/student/carnet` (C1-C3) + entrée « Carnet de liaison » dans le menu élève (toujours visible : Q3, l'élève sait ce que voient ses parents).
- Analytique Vercel : `beforeSend` remplace `/carnet/<jeton>` par `/carnet/[token]` (`src/lib/utils/analytics-redact.ts`). Les jetons du cahier, du cours et du consentement partent encore en clair dans l'analytique — hors périmètre, à proposer à David.
- Vérifié en local (port 5177, données fictives) : carnet 200, jeton inconnu ou mal formé 404, confirmation → carnet avec bandeau, arrêt des courriels. Vue élève non vue au navigateur (session de David sur `localhost`) ; couverte par les tests de rendu.
- Tests : module 22, routes 19, rendu 10, analytique et journal 9. CI : deux gardes de dépôt rattrapées au 1er passage (pages publiques exclues du sitemap, `<h1>` de la confirmation).
- **Mergée** le 2026-11-16 (#2724), CI verte.
- Revues (2026-11-16) : `code-reviewer` (Sonnet) et `security-auditor` (Opus), **aucun finding bloquant**. Corrigés : le jeton partait en clair dans `error_logs` (adresse et message, client et serveur) → masqué au point d'écriture unique, `logError` (`redactSecretUrl`) ; Referer interne (ci-dessus) ; confirmation consommée puis émission en échec → « confirmée, le professeur vous enverra le lien » au lieu d'une 500 ; test des évaluations assertant ligne par ligne (mutation vérifiée rouge) ; jeton retiré de `data` ; ordre des blocs et clé d'itération de la page élève ; nombre d'adresses retiré de la phrase de l'élève.
- Laissés : `now` figé au rendu du composant (un onglet resté ouvert classe une évaluation échue en « à venir » jusqu'au rechargement) ; bornes Zod (`evaluations.max(200)`) qui donneraient une 500 au-delà (la fenêtre SQL de 5 semaines borne déjà) ; journaux d'exécution Vercel qui gardent le chemin (inhérent au jeton dans l'URL, à noter au registre RGPD en PR 5).
- **Questions pour David** (non bloquantes, PR 3) : **Q26** — un antivirus de messagerie qui exécute un vrai navigateur peut cliquer « Confirmer » : il reçoit alors le lien du carnet, et le vrai parent voit « lien plus valide ». Recommandation : à la confirmation, **ne plus afficher le carnet** mais envoyer son lien par courriel (PR 3), la page disant « Le lien de votre carnet vient de vous être envoyé ». **Q27** — une évaluation **sans échéance** créée il y a plus de 5 semaines et jamais faite disparaît du carnet (fenêtre de `carnet_payload`). Recommandation : la garder tant qu'elle n'est pas faite (nouvelle migration, PR 4).
