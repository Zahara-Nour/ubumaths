# Chantier `compteur-consentement`

## Reprendre ici

_Mis à jour le 2026-11-12, à l'ouverture de la PR #2586._

- **État** : PR ouverte · **Prochaine action** : merge, archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-compteur-consentement` / `fix/compteur-envois-consentement`

## Historique

- 2026-11-12 : `api/consent/send-email` augmentait `email_count` AVANT l'envoi Brevo ; chaque échec (clé refusée, IP bloquée) mangeait le quota de 5 sans qu'aucun courriel parte. Désormais : demande créée à 0 ; l'envoi est réservé AVANT Brevo par une mise à jour conditionnelle (`.eq('email_count', n)`, zéro ligne → 409, rien ne part), et rendu si Brevo refuse. Revue + audit sécurité : la version « compter après l'envoi » élargissait la course du double clic à toute la durée de l'appel Brevo, et laissait partir des envois non comptés quand la RLS refuse l'update ; la réservation ferme les deux. Test `__tests__/compteur-envois.test.ts` : 5 cas, tous rouges sur le code d'origine.
