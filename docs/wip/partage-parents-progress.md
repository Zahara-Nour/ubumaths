# Partage avec les parents — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-16, phase 0 ouverte (aucune PR)._

- **État** : phase 0, tour 1 de questions posé à David (Q1 à Q5, ci-dessous). Rien de tranché.
- **Prochaine action** : consigner les réponses du tour 1 ; tour 2 = « comment partager » (canal).
- **En attente de David** : Q1 à Q5.
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

(aucune encore)
