# Chantier `invitation-cours-particulier`

## Reprendre ici

_Mis à jour le 2026-11-24, PR 1 prête (migration + tests), avant ouverture._

- **État** : PR 1 sur la branche — migration `20261124224822` (table `private_lesson_invitations`, `schools.is_private_lessons` posé sur Akadada, `get_private_lesson_invitation`), 21 tests d'intégration verts (rouges sans la migration), security-auditor sans bloquant, code-reviewer corrigé · **Prochaine action** : PR ouverte → CI → merge → `db:migrate` ; puis PR 2 (admin) · **En attente de David** : durée de conservation des invitations expirées / annulées (purge, cf. « Dette pour les PR 2 et 3 ») · **Pièges en cours** : voir « Dette pour les PR 2 et 3 » ; le trigger `handle_new_user` ne range un compte dans une classe que si ses inscriptions sont ouvertes (classe d'invitation née fermée → adhésion côté serveur) · **Worktree / branche** : `../ubumaths-wt-invitation-cours-particulier` / `feat/invitation-cours-particulier`

## But

Ajouter un élève de cours particulier de **moins de 15 ans** depuis l'admin, sans code de classe à
transmettre : l'admin saisit prénom, adresse du parent et niveau ; le parent reçoit un lien qui crée
le compte, la classe et recueille CGU + consentement en une fois.

## Décisions de David (2026-11-24)

1. **Consentement dans le même formulaire** que la création du compte (l'ouverture du lien reçu à
   son adresse confirme l'adresse du parent) : pas de second courriel, accès complet dès la création.
2. **Lien valable 7 jours**, usage unique ; l'admin peut le renvoyer ou l'annuler tant qu'il n'a pas servi.
3. **École : toujours Akadada.**
4. **Niveau donné par l'admin** dans le formulaire.
5. **Une classe par élève** ; ajouter un enfant à un groupe existant viendra plus tard.
6. Formulaire réservé aux **moins de 15 ans** (consentement toujours exigé, quel que soit le niveau).
7. **Question d'accès** : seuls l'admin et le prof lisent les invitations (prénom, adresse du parent) ;
   la page du parent ne voit que l'invitation de son propre lien.

## Phase 0 — comportements (validés le 2026-11-24)

**Nominal**

- Admin → « Cours particuliers » → « Inviter un élève » : prénom, adresse du parent, niveau →
  « Envoyer l'invitation ». Courriel Brevo au parent : « Créez l'espace de <prénom> sur Chiphre ».
- Liste des invitations en attente : prénom, adresse du parent, envoyée le, expire le ;
  boutons « Renvoyer » (nouveau lien de 7 jours, l'ancien ne marche plus) et « Annuler ».
- Le parent ouvre le lien : prénom de l'enfant déjà écrit (non modifiable), mot de passe de l'enfant
  (deux fois), case CGU, case consentement → « Créer l'espace de <prénom> ».
- À la validation : identifiant `jade123` (règle actuelle), classe `JADE123` dans Akadada, du niveau
  donné, année active d'Akadada, **inscriptions fermées** ; l'enfant est dans la classe, approuvé,
  consentement accordé (preuve : IP, navigateur, date, comme le lien actuel). Écran final :
  identifiant + adresse de connexion, et un courriel au parent qui les redit.
- L'invitation passe à « utilisée » et disparaît de la liste des invitations en attente ; Jade
  apparaît dans « Mes classes ».

**Limites**

- Lien déjà utilisé, expiré ou annulé → page « Ce lien n'est plus valable, demandez-en un nouveau
  à <prof> », sans rien révéler (ni prénom ni adresse).
- Deux validations du même lien (double clic, deux onglets) → un seul compte.
- Akadada sans année active → l'admin est prévenu à l'envoi de l'invitation et ne peut pas l'envoyer.
- Prénom : mêmes règles qu'aujourd'hui (lettres, espaces, tirets, apostrophes).

**Erreurs**

- Courriel d'invitation refusé par Brevo → message à l'admin, invitation non comptée comme envoyée,
  bouton « Renvoyer ».
- Échec au milieu de la création (compte créé, classe impossible…) → tout est annulé, le lien reste
  valable, message « Réessayez dans un instant ».
- Mot de passe trop faible → message sur le champ, comme aujourd'hui.

**Point A (tranché : réglage sur l'école) : comment le code reconnaît Akadada.** Recommandation : un réglage sur
l'école (« école de cours particuliers »), posé sur Akadada par la migration. Il resservira au
social borné au groupe (décision du 2026-10-21). Autre choix : le nom « Akadada » écrit dans le code.

## Découpage prévu

- **PR 1** — migration : table des invitations (lecture admin/prof seulement), réglage d'école,
  fonction de lecture par le lien ; tests d'intégration (rouges sans la migration) ; security-auditor.
- **PR 2** — admin : formulaire, liste, renvoyer/annuler, courriel d'invitation (nouveau modèle
  dans `src/lib/email-templates/`).
- **PR 3** — page du parent : création du compte, de la classe, adhésion, consentement ; courriel final.
  code-reviewer + security-auditor.

## Dette pour les PR 2 et 3 (revues de la PR 1)

- **PR 2** : écrire en service role après la garde de rôle admin ; poser `created_by` (id de l'admin
  vérifié : `auth.uid()` est null en service role) ; lister les colonnes à la lecture (droits par
  colonne : `select('*')` → 42501) ; « Renvoyer » = nouvelle empreinte + `email_sent_at` à null,
  posé seulement si Brevo accepte, `sent_count` + 1 (plafond 5 en base) ; refuser une école qui
  n'est pas `is_private_lessons` (rien ne l'interdit en base) ; niveaux au format de la base
  (`'5'`, pas `'5e'`).
- **PR 3** : réserver le lien par un `update … set claimed_at = now() where … and (claimed_at is
null or claimed_at < now() - interval '5 minutes') returning` atomique ; la retirer si la
  création échoue ; `used_at` + `student_id` + `class_id` ensemble à la fin.
- **Essais en local** : la base locale n'a pas d'Akadada (le réglage n'y est pas posé) → une graine
  ou une école de test réglée à la main pour essayer les PR 2 et 3.
- **Conservation** : rien ne purge les invitations expirées, annulées ou utilisées (prénom +
  adresse du parent). Question à David : au bout de combien de temps les effacer ?

## Historique

- 2026-11-24 : chantier ouvert ; décisions 1 à 7 de David ; phase 0 écrite.
- 2026-11-24 : phase 0 validée par David, point A compris (réglage « école de cours particuliers »).
- 2026-11-24 : PR 1 écrite (migration + 21 tests) ; revues security-auditor (aucun bloquant) et code-reviewer (niveaux, format d'adresse, réservation `claimed_at`, plafond d'envois, assertions strictes : corrigés).
