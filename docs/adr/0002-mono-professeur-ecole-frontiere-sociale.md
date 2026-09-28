# 0002 — Mono-professeur, école = frontière sociale

- **Statut** : acceptée (en production depuis le 2026-06-17, PR #11 ; unification PR #26 à #28)
- **Date** : 2026-06-17 · **Décidée par** : David

## Contexte

Le schéma venait d'un modèle multi-tenant (plusieurs professeurs, la classe comme frontière
d'accès). La plateforme n'a qu'un enseignant, David, qui veut « tout voir ».

## Décision

- **Un seul professeur** (verrou : trigger `enforce_single_teacher`) et un **admin distinct**, joint par
  élévation serveur (mot de passe admin, cookie court, `requireAdmin`).
- **Option B** : le prof voit **tous** les élèves ; la **classe est un dossier**, pas une frontière
  d'accès (`is_my_student()` = `is_teacher_or_admin()`).
- **L'école est la frontière sociale** (safeguarding des mineurs) : tout ce qui met des élèves en
  relation (amitiés, marketplace, classements) est borné par `my_school()` / `same_school()`.

## Écarté

- Démolir le schéma multi-prof : on garde `teacher_id`, le verrou est produit.
- Partage de contenu entre professeurs : retiré (colonnes `is_public` supprimées).

## Conséquences

- Un test qui crée deux professeurs casse (trigger).
- Un élève **hors-classe** doit pouvoir tout faire avec le prof (messagerie, modération) : un helper
  scopé à la classe est un bug, pas un choix.
- Toute nouvelle fonctionnalité sociale élève ↔ élève se borne à l'école.
