# Partage avec les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-17, après le `deploy:prod` v0.93.0._

- **État** : PR 1 à 4 et 6 à 9 mergées (#2718, #2724, #2731, #2736, #2737, #2739, #2745, #2749, #2752), migrations en prod. Q42 faite : journal des courriels effacé au bout d'un an par le passage quotidien, politique v1.4. **Tout le carnet est en prod** (v0.93.0, 2026-11-17).
- **Prochaine action** : vérification manuelle du carnet en prod (point 8 sur `/parents` fait : #2798, en prod v0.95.0).
- **En attente de David** : rien. Échec de l'effacement : on garde le comportement (les autres étapes tournent, passage noté en échec, effacement rejoué le lendemain) — recommandation de Claude, David : « je te suis » (2026-11-17). Vérifications manuelles du carnet automatisées dans le chantier `capture-courriels`.
- **Pièges en cours** : données d'élèves mineurs. 1er trimestre fini le 27 nov. : messages trimestriels dès le 28 (déployé). Base locale en retard sur d'anciennes migrations de contenu. Rejets Brevo différés non marqués `invalid` (pas de webhook). AIPD : l'analyse de risque du carnet reste à y intégrer.
- **Worktree / branche** : aucun.

## Origine

Né du chantier `presentation-parents` (point 8, « Comment le suivre ? »), le 2026-11-16 : « il y a une vraie réflexion à mener sur ce qu'on partage avec les parents, et comment on le fait ». David : chantier **extrêmement important**. Le bloc « Suivre son travail » de `/parents` est retiré en attendant ; il sera réécrit à la fin de ce chantier (`docs/archive/wip/presentation-parents-progress.md`).

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

### 2026-11-16 (Q26, Q27, recommandations suivies)

- **Q26** : à la confirmation, le carnet **n'est plus affiché** ; son lien part par courriel (PR 3). La page dit « Le lien de votre carnet vient de vous être envoyé. »
- **Q27** : une évaluation sans échéance, non faite, reste dans le carnet tant qu'elle n'est pas faite (migration, PR 4).

## PR 3 — côté professeur et envoi par Brevo (2026-11-16)

Worktree `../ubumaths-wt-partage-parents`, branche `feat/partage-parents-pr3`.

Points de mise en œuvre posés à David avant de coder (D1-D3 et A1-A6 sont validés) :

- **Q28 — Où** : une page par classe `/dashboard/teacher/classes/[classId]/carnet` (bouton « Carnet de liaison » à côté d'« Acquisition ») : réglages D1 en haut, tableau par élève D2-D3 dessous.
- **Q29 — Arrivées tardives (A1, Q21)** : à l'activation, chaque consentement accordé d'un élève actif devient une adresse confirmée et reçoit son lien ; un bouton « Envoyer les liens manquants » rejoue ce passage (élève arrivé après, consentement accordé après). L'envoi automatique → cron de la PR 4.
- **Q30 — Quota Brevo** (300 courriels / jour en offre gratuite, partagés avec tous les autres courriels) : avant d'activer, la page dit « Activer enverra N courriels » ; au-delà, les envois en échec restent visibles (E6) et se rejouent par « Envoyer les liens manquants ».
- **Tranché le 2026-11-16 (recommandations suivies)** : Q28 page par classe ; Q29 bouton « Envoyer les liens manquants », automatique en PR 4 ; Q30 annoncer le nombre de courriels avant d'activer.
- Fait (2026-11-16) : `envois.ts` (confirmations, liens, liens manquants, lien perdu) ; Q26 (la confirmation envoie le lien) ; `/carnet/lien-perdu` (A6) ; ajout d'adresse par l'élève (A2) ; page du professeur `classes/[classId]/carnet` (D1-D3) ; tests unitaires et d'intégration ; doc `carnet-de-liaison.md`.
- Revues (2026-11-16) : `code-reviewer` (Opus) et `security-auditor` (Opus). Point bloquant commun : « révoquer » ne coupait pas (l'adresse confirmée récupérait un lien par « lien perdu » ou « liens manquants »), et aucune adresse ne se retirait (deux adresses bidon bloquaient les places). Corrigés sans décision : lien jamais émis vers un carnet fermé (`carnet_student_is_shared` dans `sendCarnetLink`) ; réponse neutre à l'élève pour une adresse connue, et aucun renvoi de confirmation par lui (oracle d'adresses, quota épuisé) ; adresse invalide à 3/3 non remise en attente ; `.select()` vérifié sur le rendu du quota et la révocation du lien non remis ; échec Brevo journalisé sans le corps (jetons) ; réglages non remis à zéro après enregistrement.
- **Q31 (tranchée le 2026-11-16, après explication)** : bouton « Retirer cette adresse », état `removed` par migration (`20261116204753_carnet_adresse_retiree.sql` : deux contraintes élargies, trigger qui révoque les liens). Le besoin est de corriger une adresse fausse, pas d'écarter un parent (David : « pourquoi refuser l'accès à un parent ? » ; un parent qui a l'autorité parentale reste en droit d'être informé). Question d'accès : personne ne lit rien de nouveau (validée). Le professeur seul ressaisit une adresse retirée.
- **Q32 (tranchée le 2026-11-16)** : un lien neuf révoque l'ancien avant l'envoi ; accepté et écrit (doc, ADR), fonction SQL inchangée.
- Migration : intégration rouge sans elle (« retirée » refusée par la contrainte), 35/35 avec ; appliquée en local par psql (jamais `db:migrate` avant le merge).
- **Mergée** le 2026-11-16 (#2731), CI verte au 2e passage (export interdit dans `+page.server.ts`, doc de la base) ; migration `20261116204753` appliquée en prod, vérifiée (contraintes et trigger).

## PR 4 — courriels d'exception, message trimestriel, envois automatiques (2026-11-16)

Worktree `../ubumaths-wt-partage-parents`, branche `feat/partage-parents-pr4`. E1-E7, Q19, Q21, Q27 et Q29 sont validés ; restent les points de mise en œuvre.

Constats (prod, lecture seule, 2026-11-16) :

- Trimestres : `academic_periods` est rempli (2026-2027 : T1 jusqu'au 27 nov., T2 jusqu'au 19 fév., T3 jusqu'au 4 juin). Le 1er message trimestriel tomberait donc le 28 novembre si le code est déployé d'ici là.
- Fin d'année : les classes de 2025-2026 sont inactives et leurs membres `archived`. Entre l'archivage et la rentrée, un élève n'est donc dans **aucune** classe active. Effacer les adresses « quand l'élève quitte toute classe » les effacerait chaque été, ce qui contredit « gardées d'une année à l'autre » (Q21).
- Un consentement **accordé** n'expire pas dans le schéma (`expires_at` ne vaut que pour un consentement en attente). La branche « consentement expiré » de Q21 ne s'applique donc à aucune adresse confirmée.

Questions (recommandation en premier) :

- **Q33 — Heure et regroupement (Q19)** : un passage par jour vers 17 h, heure de Paris. Une exception nouvelle part le jour même si le parent n'a reçu aucun courriel d'exception ni trimestriel depuis 7 jours ; sinon elle attend la fin des 7 jours et part avec les autres exceptions **encore ouvertes** (une exception résolue entre-temps ne part pas). Les courriels de lien et de confirmation ne comptent pas dans le plafond.
- **Q34 — Message trimestriel (E4)** : il part le lendemain de la fin du trimestre (`academic_periods` de l'école). « Du vrai à dire » = (a) un jour travaillé ou plus dans au moins 2 semaines de classe sur 3 du trimestre, hors vacances → « Léa a travaillé régulièrement ce trimestre » ; (b) révisions à jour le dernier jour → « Ses révisions sont à jour ». Le courriel ne contient que la ou les phrases vraies, sans aucun nombre ; si aucune n'est vraie, rien ne part. Il compte dans le plafond hebdomadaire.
- **Q35 — Effacement des adresses (Q21)** : effacer les adresses d'un élève qui n'est membre actif d'**aucune classe active depuis 90 jours** (l'été est couvert ; un départ en cours d'année est effacé en un trimestre). Est effacée la ligne entière (adresse, empreinte, liens) ; le journal des courriels envoyés reste, sans l'adresse. ⚠️ Perte de données voulue (RGPD) : un parent effacé doit être ressaisi et reconfirmé.
- **Q36 — Liens manquants automatiques (Q29)** : chaque passage envoie d'abord les liens manquants (même règle que le bouton du professeur), puis les exceptions. Au plus 150 courriels par passage (la moitié du quota Brevo de 300 par jour) ; le reste part le lendemain.
- **Q37 — Question d'accès de la migration** : (1) la table des épisodes d'exception n'est lue par **personne** via l'API (service role seul) ; (2) Q27 : le détenteur d'un lien lit en plus les évaluations sans échéance non faites, créées avant la fenêtre de 5 semaines (titre, faite ou non) ; (3) effacement : le parent effacé perd son carnet ; personne d'autre ne perd rien. Personne ne lit rien d'autre de nouveau.

### 2026-11-16 (Q33 à Q37, recommandations suivies)

- Q33 à Q37 tranchées comme recommandé, question d'accès Q37 comprise.
- Mise en œuvre de Q35 : `class_members.left_at` est vide sur les 77 lignes archivées en prod. Les « 90 jours » se comptent donc avec une marque posée par le passage quotidien (première fois que l'élève n'est dans aucune classe active, effacée s'il revient), pas avec `left_at`.
- **Q38 (posée)** — le lien du carnet est stocké haché (Q22) : le passage quotidien ne le connaît pas et ne peut pas le mettre dans le courriel (E5). Il ne peut pas non plus construire le lien « Ne plus recevoir ». Recommandation : chaque courriel porte son **propre jeton**, stocké haché sur la ligne du journal des courriels. Ce jeton (a) ouvre le carnet, aux mêmes conditions que le lien du parent (adresse confirmée, lien actif, partage ouvert, expiration le 31 août), et (b) arrête les courriels en un clic (`List-Unsubscribe-Post`). Écartés : un lien neuf à chaque courriel (il tuerait le raccourci de l'écran d'accueil) ; un courriel sans lien qui renvoie vers « J'ai perdu mon lien ». Question d'accès : le détenteur d'un courriel lit le carnet tant que le lien du parent vit, comme celui qui détient le courriel du lien.

### 2026-11-16 (Q38 suivie) et PR 4a

- **Q38** : jeton propre à chaque courriel, stocké haché sur sa ligne de `parent_notifications` ; il ouvre le carnet et arrête les courriels tant que l'adresse a un lien actif.
- Migration `20261116215952_carnet_courriels_exception.sql` : `parent_exception_episodes` (service role seul) ; `parent_notifications.access_token_hash` (la lecture de la table par les comptes passe en droits par colonne, sans l'empreinte) ; `parent_contacts.orphaned_since` ; `carnet_contact_by_token` (lien OU jeton d'un courriel) utilisé par `get_carnet_by_token` et `set_parent_emails_stopped` ; `carnet_payload` (Q27) ; fonctions du cron `carnet_current_exceptions`, `carnet_sync_exception_episodes`, `carnet_exception_plan`, `carnet_quarterly_plan`, `carnet_erase_orphan_contacts`.
- Choix de mise en œuvre (sans décision nouvelle) : une évaluation non faite = un épisode par évaluation, regardée dans les 7 jours après l'échéance (au-delà, plus d'alerte : sinon l'activation du carnet signalerait tout l'historique) ; plusieurs classes au carnet = seuil le plus court ; inactivité = aucun jour actif sur les N derniers jours hors vacances depuis la rentrée (moins de N jours depuis la rentrée → rien) ; plafond = aucun courriel d'exception ou trimestriel **parti** depuis 6 j 12 h (le cron ne passe pas à la minute près) ; trimestriel cherché jusqu'à 30 jours après la fin du trimestre (des vacances peuvent suivre) ; « révisions à jour » lu le jour de l'envoi, pas le dernier jour du trimestre.
- **Découpage** : la règle de `CLAUDE.md` (« fonction SQL + code qui l'appelle = deux PR ») coupe la PR 4 en **4a** (migration + tests) et **4b** (cron + courriels).
- **Q39 (posée)** — `List-Unsubscribe-Post` (désinscription en un geste par la messagerie) : la messagerie envoie un POST de formulaire sans en-tête `Origin` ; SvelteKit le refuse **avant** tout hook (`csrf.checkOrigin`, pas d'exception par chemin). Le permettre = couper la vérification de SvelteKit et ne garder que la nôtre (`csrfHandle`, qui couvre déjà tous les POST) avec une exception pour ce seul chemin. Recommandation : **ne pas le faire** ; mettre `List-Unsubscribe: <lien du carnet#courriels>` (la messagerie ouvre le carnet, le parent clique « Ne plus recevoir »). Le geste unique n'est exigé par Gmail qu'au-delà de 5 000 courriels par jour.
- E6 « adresse rejetée définitivement → invalide » : Brevo signale les rejets définitifs **après** l'envoi (webhook) ; Chiphre n'a pas de webhook Brevo. La 4b journalise l'échec immédiat (le professeur voit « dernier envoi en échec ») ; le marquage `invalid` des rejets différés reste à faire (noté dans `outils-manquants.md` à la 4b).
- Revues de la 4a (2026-11-16), `security-auditor` et `code-reviewer` (Opus) : **aucun finding bloquant**. Corrigés :
  - un jeton de courriel revivait avec un lien plus récent (adresse retirée puis ressaisie, rentrée, lien perdu) → il ne vit qu'avec le lien actif au moment de l'envoi ;
  - contrainte : seuls les courriels d'exception et trimestriels portent un jeton ;
  - classe sans école (vacances inconnues) : pas d'alerte d'inactivité ; aucune classe de la prod n'est dans ce cas (mesuré) ;
  - tests indépendants de la date du jour (classe commune rattachée à une école) ; test « déjà parti » isolé du plafond ; test retrait puis ressaisie.

  Preuves : les nouveaux tests sont rouges avec la version précédente et verts avec celle-ci (58 tests du carnet).

- Laissés, à dire à David :
  - l'effacement après 90 jours efface aussi les adresses « Je ne suis pas le parent » : une telle adresse pourrait être ressaisie ensuite ;
  - Q27 sans borne : une évaluation sans échéance jamais faite reste dans le carnet d'une année sur l'autre ;
  - arrêter puis reprendre les courriels resignale une exception en cours ;
  - un élève arrivé en cours d'année est jugé inactif depuis la rentrée de l'école ;
  - `access_count` du lien compte aussi les ouvertures par un courriel.
- Contrat pour la 4b (écrit dans la migration) : envoyer et journaliser les courriels d'exception **avant** de lire le plan trimestriel.

## PR 4b — passage quotidien (2026-11-16)

- #2736 mergée, CI verte ; `db:migrate` (4 conditions réunies) puis vérification en prod en lecture seule : table, colonnes, contrainte, aucun droit pour `anon` / `authenticated`, service role oui. `db:types` commité sur la 4b.
- `src/lib/server/carnet/courriels.ts` : effacement → liens manquants (plafond) → exceptions (ligne du journal écrite « failed » avec l'empreinte AVANT l'envoi, « sent » après ; épisodes marqués après l'envoi) → trimestriel (lu après les exceptions, contrat de la migration). 150 courriels par passage.
- Route `api/cron/carnet-de-liaison` (`vercel.json` `0 16 * * *`), liste blanche du déclencheur admin, page admin.
- Tests : `tests/integration/carnet-passage-quotidien.test.ts` (3, Brevo simulé ; mutation « échec compté comme envoi » → le test E6 rougit), route (3), gabarits (5 de plus).
- E6 rejets différés : pas de webhook Brevo, écrit en « Limites connues » de `carnet-de-liaison.md` (ce n'est pas un outil pédagogique : rien dans `outils-manquants.md`).
- Revues de la 4b (2026-11-16), `security-auditor` et `code-reviewer` (Opus) : **aucun finding bloquant**. Corrigés :
  - deux passages simultanés (cron + bouton de l'admin) envoyaient deux fois : un passage `running` de moins de 30 min → 409 ;
  - un courriel parti mais resté « failed » échappait au plafond : la ligne est écrite « sent » avant l'envoi et repassée « failed » si Brevo refuse ;
  - budget négatif (des échecs de base comptés comme courriels) : seuls les courriels tentés comptent, budget borné à 0 ; test « les liens épuisent le budget » ;
  - objet du courriel sans caractère de contrôle ; « Votre enfant » en début de phrase ; inactivité « ces N derniers jours de classe » (la règle SQL se déclenche à N exactement) ; trimestriel sans « Une bonne nouvelle ».
- Laissés, à dire à David : plafond par adresse ET par élève (deux enfants → deux courriels possibles le même jour) ; pas de `maxDuration` (la valeur par défaut de Vercel suffit pour un professeur ; à revoir si le passage grossit).
- **Mergée** le 2026-11-17 (#2737), CI verte au 2e passage (filtre de chemins de la suite d'intégration : gabarits de courriels et `validation/carnet.ts` ajoutés). Pas de migration.

## PR 5 — versement de la doc (2026-11-17)

Toute en doc : commit direct sur `main` (pas de worktree, contrairement au plan du bloc précédent).

- `docs/systeme/conformite/registre-traitements.md` 1.2 : fiche **T9 Carnet de liaison** (finalité, données, destinataires, conservation, mesures, droits), Brevo, durées.
- ADR 0040 : statut (mise en œuvre, PR citées) ; amendements Q35 (effacement des 90 jours), Q38 (jeton par courriel), Q39 (pas de `List-Unsubscribe-Post`, en attente de David).
- `docs/systeme/carnet-de-liaison.md` : en-tête de versement, limites connues complétées (effacement des refus, journal sans durée propre).
- `docs/systeme/carte-des-fonctionnalites.md` : le carnet est construit ; ne le promettre qu'en production et « si le professeur l'active ».
- Point 8 de `presentation-parents` : texte proposé (bloc « Suivre son travail »), à valider ; il ne va sur `/parents` qu'après le `deploy:prod` du carnet.

Questions (recommandation en premier) :

- **Q40 — Texte du point 8** : celui de `presentation-parents-progress.md` (2026-11-17). Le code de `/parents` (`views.ts`, bloc `suivi`) reste au chantier `presentation-parents`.
- **Q41 — Politique de confidentialité** (`/legal/confidentialite`) : elle ne dit rien du carnet (adresses des parents, liens, courriels). Recommandation : la compléter **avant** le `deploy:prod` du carnet (§ 3 données, § 4 finalités, § 6 Brevo, § 7 durées), PR de code, texte validé par David.
- **Q42 — Journal des courriels** (`parent_notifications` : date, nature, motifs, sans adresse) : aucune durée propre, il vit avec le profil de l'élève. Recommandation : l'effacer au bout d'**un an** par le passage quotidien (l'élève ne lit que les récents). Effacement voulu (RGPD) : nouvelle fonction SQL, donc migration + PR de code.

### 2026-11-17 (recommandations suivies)

- **Q39** : pas de `List-Unsubscribe-Post` (état actuel). **Q40** : texte du point 8 validé, avec « et, s'il y a de quoi, une bonne nouvelle par trimestre ». **Q41** : politique de confidentialité complétée **avant** le `deploy:prod` du carnet (PR de code). **Q42** : journal des courriels effacé au bout d'un an (migration plus tard, perte voulue acceptée).
- **Q43 — Arrivée en cours d'année** : l'inactivité se compte depuis l'arrivée dans la classe (`class_members.joined_at`), pas depuis la rentrée. **Q27 bornée** : une évaluation sans échéance non faite ne reste dans le carnet que si elle date de l'année scolaire en cours.
- Question d'accès (migration Q43 + Q27) : personne ne lit rien de nouveau ; en miroir, le parent **ne lit plus** les évaluations sans échéance non faites d'une année passée.
- Laissés tels quels : effacement des 90 jours qui efface les refus ; plafond par élève ; resignalement après arrêt puis reprise.
- Ordre : PR 6 (migration Q43 + Q27) → PR 7 (code si besoin, politique de confidentialité, point 8 sur `/parents` après le déploiement) ; avant le 28 novembre.

## PR 6 — arrivée en cours d'année et Q27 bornée (2026-11-17)

Worktree `../ubumaths-wt-partage-parents`, branche `feat/partage-parents-pr6`.

- **Décidé le 2026-11-17** (après question) : les trois — inactivité, alerte d'évaluation, carnet — comptent depuis l'arrivée dans la classe.
- Migration `20261117113154_carnet_arrivee_en_cours_d_annee.sql` : corps de `carnet_payload` et `carnet_current_exceptions` remplacés ; arrivée = plus ancienne adhésion active à une classe au carnet (`joined_at`) ; aucune nouvelle fonction, droits inchangés.
- Tests : 4 nouveaux (`carnet-courriels-exception.test.ts`, Q27 bornée + 3 Q43), **rouges sans la migration**, verts avec ; les aides `nouvelEleve` des trois fichiers posent une arrivée il y a 400 jours (avant toute rentrée). 66/66.
- Revues (2026-11-17), `code-reviewer` et `security-auditor` (Opus) : **aucun finding bloquant**. Corrigés : la borne de Q27 écartait aussi une évaluation préparée l'été (avant la rentrée) → borne seulement sur « non faite hors fenêtre », un mois de marge avant la rentrée (test « Préparée l'été ») ; classe sans carnet ignorée dans le calcul de l'arrivée (test) ; rollback écrit avec ses lignes ; limite « retiré puis remis / changement de classe » complétée dans la doc.
- **Mergée** le 2026-11-17 (#2739), CI verte au 2e passage (garde de doc : `base-de-donnees.md`). `db:migrate` (4 conditions réunies) depuis le dépôt principal (le worktree n'est pas lié à Supabase) ; il a aussi appliqué `20261117113333` (chantier `questions-cm1`, déjà mergée). Vérifié en prod en lecture seule : les deux fonctions lisent `joined_at`, droits inchangés (postgres, service_role).

## PR 7 — politique de confidentialité (2026-11-17)

Worktree `../ubumaths-wt-partage-parents`, branche `feat/partage-parents-pr7`.

- Brouillon du texte perdu (donné en conversation, jamais écrit) : réécrit depuis la fiche T9 du registre.
- `/legal/confidentialite` version 1.3 : § 2 (carnet), § 3.3 nouveau « Données des parents » (tableau, ce que montre le carnet, base légale), ancien 3.3 → 3.4, § 4 finalité « Information des parents », § 5.2 (transparence envers l'élève, élève majeur), § 6 (parent destinataire, Brevo), § 7 (adresse 90 jours, lien 31 août, liste des courriels avec le profil), § 8 (droits des parents).
- **Tranché par David (2026-11-17, recommandations suivies)** : base légale **intérêt légitime** (art. 6.1.f), écrite dans la page et dans le registre ; la durée de la liste des courriels reste « supprimée avec le profil » jusqu'à la PR de Q42, qui la passera à 1 an dans la page.
- Registre T9 : base légale et remarque mises à jour.

## PR 8 — journal des courriels effacé au bout d'un an, migration (Q42, 2026-11-17)

Worktree `../ubumaths-wt-partage-parents`, branche `feat/partage-parents-q42`.

- Phase 0 validée par David (2026-11-17) : effacement chaque jour des lignes de plus d'un an, toutes natures et issues ; nombre effacé au rapport du cron ; fonction séparée `carnet_erase_old_notifications` (recommandation). Question d'accès : personne ne lit rien de nouveau ; en miroir, plus personne ne lit les traces de plus d'un an (perte acceptée, Q42).
- Correction de la phase 0 : une étape du passage en échec n'empêche pas les suivantes ; le passage est alors noté en échec (comportement actuel de l'effacement des adresses, gardé).
- Vérifié : aucune règle ne lit plus d'un an en arrière (plafond 6 j 12 h, trimestriel depuis la fin du trimestre, jeton de courriel avec lien actif jusqu'au 31 août, dernier envoi vu par le professeur).
- Migration `20261117134539_carnet_effacement_journal_courriels.sql` ; deux PR car `db:types` lit la prod. Tests : `carnet-courriels-exception.test.ts` (Q42 + fonction fermée aux comptes), **rouges sans la migration** (PGRST202), 28/28 avec.
- **Mergée** le 2026-11-17 (#2749), CI verte. `db:migrate` (4 conditions réunies) depuis le worktree (le dépôt principal portait les modifications d'une autre session) ; seule cette migration est partie. Vérifié en prod en lecture seule : SECURITY DEFINER, exécution `postgres` et `service_role` seuls ; 0 ligne de plus d'un an aujourd'hui.

## PR 9 — journal des courriels effacé au bout d'un an, code (Q42, 2026-11-17)

Branche `feat/partage-parents-q42-cron`.

- `db:types` (prod) ; `runCarnetDaily` appelle `carnet_erase_old_notifications` après l'effacement des adresses ; rapport `erasedNotifications`. Test `courriels.test.ts` (2), rouge avant, vert après.
- `/legal/confidentialite` version 1.4 : § 7, liste des courriels « chaque courriel en est effacé 1 an après son envoi ; supprimée avec le profil ». Registre 1.3 (T9). Doc `carnet-de-liaison.md`.
- Revues : `code-reviewer` (Sonnet) et `security-auditor` (Opus), aucun finding bloquant. **Mergée** le 2026-11-17 (#2752), CI verte.
