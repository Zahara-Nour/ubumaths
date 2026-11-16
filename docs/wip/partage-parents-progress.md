# Partage avec les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-16, phase 0 ouverte (aucune PR)._

- **État** : phase 0 ; tours 1 et 2 tranchés (quoi, qui, canal) ; tour 3 posé (Q7 à Q12).
- **Prochaine action** : consigner le tour 3 ; ensuite comportements nominal / limite / erreur, question d'accès, découpage.
- **En attente de David** : Q7 à Q12.
- **Pièges en cours** : données d'élèves mineurs (RGPD) ; décision 8 du 2026-10-21 (« le parent ne voit rien du compte de l'enfant ») à rouvrir explicitement, pas en silence ; question d'accès « qui pourra lire quoi » avant tout SQL ; « Parent » absent de `CONTEXT.md`.
- **Worktree / branche** : aucun (phase 0, doc sur `main`).

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
