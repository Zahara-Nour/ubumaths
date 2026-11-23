# Procédure en cas de violation de données (RGPD art. 33-34)

> Rédigée le 2026-11-03 (écart T15, plan d'action de l'[AIPD](aipd-dpia.md) n° 6). **Brouillon à
> relire par David** : tant qu'il ne l'a pas validée, elle sert de pense-bête, pas d'engagement.
> Document interne (non publié). Utilisateurs = **élèves mineurs** : le risque pour les personnes
> est à estimer **élevé par défaut** dès que des données d'élèves sont exposées.

## Ce qui compte comme violation

Toute **perte de confidentialité, d'intégrité ou de disponibilité** de données personnelles,
accidentelle ou non (art. 4.12). Exemples propres à Chiphre :

- une policy RLS trop large, découverte en prod (un élève lit les données d'un autre, d'une
  autre école) : c'est une violation **même sans preuve que quelqu'un l'a exploitée** ;
- une clé `SUPABASE_SERVICE_ROLE_KEY` (ou un autre secret de `.env`) publiée : dépôt **public**,
  log, capture d'écran ;
- un lien signé de pièce jointe ou une exportation qui part au mauvais destinataire ;
- une suppression ou une altération de données non voulue (migration, script), sans sauvegarde
  qui permette de restaurer ;
- un incident annoncé par un sous-traitant (Supabase, Vercel, Sentry, Groq, Google, Brevo :
  [registre](registre-sous-traitants.md)). Il doit nous prévenir « dans les meilleurs délais »
  (art. 33.2) ; le délai de 72 h court **à partir du moment où nous le savons**.

## Les 72 heures, dans l'ordre

| Quand          | Quoi                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **H0**         | Noter l'heure de la découverte : elle fait partir le délai de 72 h. Ouvrir une fiche dans le registre des violations (plus bas).                                                                                                                                                                                                                     |
| **H0 → H+2**   | **Contenir.** Selon le cas : `pnpm maintenance:on` (la prod répond 503) ; rotation du secret exposé (dashboard Supabase → API keys, Vercel → Environment Variables, puis redéploiement) ; retrait de la policy fautive par une migration ; révocation des liens signés (ils expirent en 1 h). Garder les preuves (logs, captures) avant de corriger. |
| **H+2 → H+24** | **Évaluer.** Quelles données (identité, scores, messages du chat, pièces jointes), combien d'élèves, de quelles écoles, depuis quand, consultées ou non (logs Supabase, `audit_logs`). Le risque pour les personnes : nul, réel ou élevé (critères plus bas).                                                                                        |
| **≤ H+72**     | **Notifier la CNIL**, sauf si la violation n'entraîne **aucun risque** (à justifier dans le registre). Téléservice : [notifications.cnil.fr](https://notifications.cnil.fr/notifications/index). Une notification incomplète est permise : compléter ensuite (art. 33.4). Au-delà de 72 h, motiver le retard.                                        |
| **Sans délai** | **Informer les personnes** si le risque est **élevé** (art. 34) : les élèves **et leurs parents** (mineurs), en langage simple. Canal : email aux parents (Brevo, comme le consentement parental), message dans l'appli. Le contenu est donné plus bas.                                                                                              |
| **Après**      | Corriger la cause, ajouter le test qui l'aurait vue (RLS → test d'intégration), compléter la fiche et réviser l'[AIPD](aipd-dpia.md).                                                                                                                                                                                                                |

### Risque élevé : présumé si…

- les données touchent des **élèves mineurs** et sortent de leur école (frontière sociale,
  [CONTEXT.md](../../../CONTEXT.md)) ;
- des **messages** (chat, messagerie privée) ou des **pièces jointes** sont exposés ;
- des identifiants de connexion ou des emails de parents sont exposés ;
- la donnée a pu être **copiée** (secret publié, accès public), pas seulement mal rangée.

Aucun risque (pas de notification, mais fiche obligatoire) : donnée chiffrée et clé non
compromise, exposition limitée à une personne déjà autorisée, erreur corrigée avant tout accès
**prouvé** par les logs.

## Ce que disent la notification et l'information

Notification CNIL (art. 33.3) : nature de la violation, catégories et nombre approximatif de
personnes et d'enregistrements, contact (contact@chiph.re), conséquences probables, mesures prises
ou prévues.

Information des personnes (art. 34.2) : la même chose, **en langage clair**, adressée aux parents :
ce qui s'est passé, ce qui a été exposé, ce que nous avons fait, ce qu'ils peuvent faire (par
exemple changer le mot de passe), qui contacter.

## Registre des violations (art. 33.5)

**Obligatoire, même pour une violation non notifiée.** Une fiche par violation, conservée hors du
dépôt (le dépôt est public) dans le dossier privé de conformité, à côté des DPA. Contenu de chaque
fiche :

- date et heure de la découverte, de la violation (si connue), de la fin ;
- faits : quoi, comment, données et personnes touchées (nombres) ;
- évaluation du risque et sa raison ;
- notification CNIL : date et numéro, ou raison de ne pas notifier ;
- information des personnes : date et moyen, ou raison de ne pas informer ;
- mesures prises (contenir, corriger, prévenir).

## Points ouverts (pour David)

- **Qui** est le responsable de traitement, et qui agit si David est absent : [À COMPLÉTER] (même
  champ que l'AIPD et les mentions légales, T14).
- **Emplacement** du registre des violations : même dossier privé que les DPA.
- La restauration de la prod n'a jamais été jouée : [procedure-restauration.md](../../pratiques/procedure-restauration.md),
  « Reste à établir ». Une perte de données ne se répare donc pas encore de façon sûre.
