# Chantier `invitation-cours-particulier`

## Reprendre ici

_Mis à jour le 2026-11-25, après #3127._

- **État** : PR 1 (migration) et PR 2 (admin, #3127 : page `/dashboard/admin/cours-particuliers`, courriel, purge à 30 jours) mergées ; rien en prod pour ce chantier · **Prochaine action** : PR 3, la page du parent `/auth/register/invitation/[token]` (création du compte, de la classe, adhésion, consentement, courriel final) ; nouveau worktree `../ubumaths-wt-invitation-cours-particulier-parent`, branche `feat/invitation-cours-particulier-parent` ; tout ce qu'elle doit faire est listé dans « Dette pour les PR 2 et 3 » (§ PR 3), N3 de l'audit et décision 9 ; revue : code-reviewer + security-auditor · **En attente de David** : rien · **Pièges en cours** : ⛔ ne pas déployer avant la PR 3 (le lien du courriel mène à sa page) ; `Referrer-Policy: no-referrer` et aucune ressource tierce sur la page du lien ; phrase de conservation des invitations sur la page de confidentialité ; base locale : réglage `is_private_lessons` posé à la main sur Akadada · **Worktree / branche** : aucun pour l'instant

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

8. **Conservation** (2026-11-25) : une invitation expirée, annulée ou utilisée est **effacée 30 jours
   après sa fin** (date d'expiration, d'annulation ou d'utilisation), par une tâche de nuit. Pendant
   ces 30 jours, une expirée reste dans la liste et peut être renvoyée. Codé avec la PR 2.

9. **Revues de la PR 2** (2026-11-25) : David valide les corrections proposées (annuler refusé
   pendant une réservation, un seul renvoi à la fois, vraie raison du refus, test de la garde,
   refus d'une 2e invitation ouverte même enfant + même adresse, 20 envois/heure/admin, journal
   sans la ligne, message Zod en français). Renvoi refusé par Brevo : l'ancien lien est mort,
   assumé et écrit dans la doc. **Page de confidentialité** : une phrase sur la conservation des
   invitations, livrée avec la PR 3.

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

## Revue de la PR 2 (code-reviewer, 2026-11-25) — corrigée (décision 9 ; point 4 assumé, point 5 laissé)

1. « Annuler » ignore une réservation `claimed_at` de moins de 5 min (`cancelInvitation`) :
   ajouter `.or(claimFreeFilter(now))`, motif `in_use`, et un test.
2. Deux « Renvoyer » simultanés passent tous les deux (la garde `sent_count` ne change pas au
   renouvellement) : garder l'`update` sur l'empreinte lue (`.eq('token_hash', …)`, lue côté
   serveur seulement).
3. Renvoi qui ne touche aucune ligne → « a déjà servi » même si elle est vivante : relire et
   distinguer `in_use` / `ended`.
4. Renvoi refusé par Brevo : l'ancien lien est déjà mort. À assumer dans la doc, ou garder
   l'ancienne empreinte jusqu'à l'envoi.
5. (mineur) Exception de l'expéditeur après l'insertion → 500 « non créée », alors que la ligne existe.
6. (mineur) Champ absent → message Zod en anglais.

## Audit de sécurité de la PR 2 (security-auditor, 2026-11-25) — aucun bloquant ; C1, C2, N1 corrigés ; N3 pour la PR 3

- **C1** : aucun test sur la garde des actions `invite` / `resend` / `cancel` → test serveur :
  prof non élevé et élève → 403, `createServiceRoleClient` et l'expéditeur jamais appelés ; admin élevé passe.
- **C2** : plafond de 5 contournable (N invitations pour la même adresse ; délai d'attente de Brevo
  compté « non parti ») ; quota Brevo partagé (300/jour) → limite de débit par admin sur `invite`
  et `resend` (`rateLimiter.ts`, ex. 20/h) ou refus d'un doublon ouvert (même adresse + prénom).
- N1 : `invitations.ts` journalise l'erreur PostgREST entière dans `sendAndRecord` → `error.code` seul.
- N3 (PR 3) : jeton dans le chemin → `Referrer-Policy: no-referrer` et aucune ressource tierce sur la page du lien.

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
- **PR 3 (ajouts de la PR 2)** : page à l'adresse `/auth/register/invitation/[token]` (déjà écrite dans
  les courriels) ; « Annuler » n'attend pas la fin d'une réservation : la mise à jour finale
  (`used_at` + `student_id` + `class_id`) doit exiger `cancelled_at is null` et la création échouer
  proprement sinon ; « Renvoyer » refuse pendant une réservation de moins de 5 min.
- **Essais en local** : la base locale n'a pas d'Akadada (le réglage n'y est pas posé) → une graine
  ou une école de test réglée à la main pour essayer les PR 2 et 3.
- **Conservation** : tranchée (décision 8, 30 jours après la fin) ; purge à coder en PR 2.

## Historique

- 2026-11-24 : chantier ouvert ; décisions 1 à 7 de David ; phase 0 écrite.
- 2026-11-24 : phase 0 validée par David, point A compris (réglage « école de cours particuliers »).
- 2026-11-24 : PR 1 écrite (migration + 21 tests) ; revues security-auditor (aucun bloquant) et code-reviewer (niveaux, format d'adresse, réservation `claimed_at`, plafond d'envois, assertions strictes : corrigés).
- 2026-11-25 : #3119 mergée (PR 1) ; décision 8 de David (purge à 30 jours) ; `db:migrate` refusé à Claude par le classifieur, lancé par David, vérifié en prod.
- 2026-11-25 : PR 2 écrite (page admin, courriel, renvoi/annulation, purge à 30 jours par un cron Vercel quotidien `api/cron/invitations-cours-particulier`, sans migration) ; 13 tests d'intégration verts ; parcours inviter/renvoyer/annuler vu à l'écran (Playwright, 0 erreur de console).
- 2026-11-25 : revues de la PR 2 (code-reviewer, security-auditor : aucun bloquant) ; décision 9 de David ; corrections commitées (annulation et renvoi gardés, refus du doublon, 20 envois/h/admin, test de la garde, journal sans la ligne).
