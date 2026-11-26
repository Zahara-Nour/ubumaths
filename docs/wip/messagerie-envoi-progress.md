---
title: Messagerie privée, l'envoi refusé (V130) — journal
date: 2026-11-26
status: PR en cours
---

## Reprendre ici

_Mis à jour le 2026-11-26, avant la PR._

- **État** : correction écrite et vérifiée dans un navigateur (parcours `e2e/verifs/messagerie.spec.ts` vert) ; revues puis PR à faire.
- **Prochaine action** : après le merge, barrer V130 au registre (commit de doc sur `main`), archiver ce journal, le dire dans [ecarts-a-trier](ecarts-a-trier-progress.md).
- **En attente de David** : son essai de la messagerie (V104) reprend une fois la correction en prod (`pnpm deploy:prod` sur sa demande) ou par le lien du serveur de la branche.
- **Pièges en cours** : `pnpm test:verifs messagerie` dans ce worktree joue TOUTES les specs (le filtre est lu sur le chemin entier, qui contient « messagerie ») : écrire `verifs/messagerie.spec`.
- **Worktree / branche** : `ubumaths-wt-messagerie-envoi` · `fix/messagerie-envoi`.

---

Trouvé par David le 2026-11-26 en essayant la messagerie en prod (essai demandé pour V104) : à l'envoi, 400 « chaîne de caractères attendu, objet reçu ».

## Cause

La page d'écriture (`messages/compose/+page.svelte`) envoie le document de l'éditeur riche, un objet ; `sendMessageSchema` attendait une chaîne depuis son écriture (2025-10-28). La base attend bien le document (`send_private_message(p_content jsonb)`). Les tests du schéma passaient des chaînes, jamais ce que la page envoie ; #3100 n'avait réparé que la lecture.

## Comportements (validés par David, « go » du 2026-11-26)

- Normal : un élève écrit au prof, le message part, le prof le lit.
- Limites : document borné (10 000 caractères de texte, 100 000 une fois en JSON, 20 niveaux) ; message vide refusé, une formule seule acceptée.
- Erreur : tout ce qui n'est pas un document de l'éditeur → 400, message en français.
- Rendu inchangé (`RestrictedRichText`).

## Fait

- `src/lib/server/validation/messages.ts` : `messageDocumentProblem` + `sendMessageSchema.content`.
- `src/routes/api/messages/send/__tests__/send.test.ts` : 14 cas par la vraie route, rouges avant.
- `e2e/verifs/messagerie.spec.ts` : l'aller-retour dans un navigateur, sur la base locale.
- **Seconde panne trouvée par ce parcours** : la page d'écriture du prof plantait (erreur 500 en dev, `each_key_duplicate`) dès qu'il a plusieurs destinataires : la liste était indexée par `recipient.id`, que `get_allowed_recipients` ne rend pas. Indexée par `user_id`, et `id` retiré du type `MessageRecipient`. En prod, Svelte ne contrôle pas les clés : pas de plantage constaté, non vérifié.
- Doc : `docs/systeme/messagerie-et-moderation.md` (§ validation).

## Revues (avant la PR)

**code-reviewer** :

- Corrigé : un brouillon repris puis envoyé sans toucher l'éditeur partait avec le HTML du brouillon en texte (repli de la page). `RichTextEditor` rend maintenant le document dès qu'il pose un contenu venu de `htmlValue` (`syncJsonFromHtml`, seulement quand la page lie `jsonValue` à `null`) ; la page n'a plus de repli et refuse d'envoyer sans document. Second parcours dans `e2e/verifs/messagerie.spec.ts`.
- Corrigé : bloc de code vide compté comme contenu ; message à part pour un document trop lourd (image collée).
- Laissé, à inscrire au registre : `src/routes/api/messages/__tests__/api-routes.test.ts` valide encore une chaîne par un assistant de test, pas par le schéma (test vert qui décrit l'ancien contrat).

**security-auditor** : aucun finding bloquant ; personne ne gagne ni ne perd d'accès (la RPC acceptait déjà tout jsonb). Rendu de lecture sûr (deux lieux, `RestrictedRichText`).

- Corrigé : `JSON.stringify` qui lèverait sur des attributs très emboîtés rend « Message illisible » (400) au lieu d'un 500.
- À inscrire au registre (préexistants, atteignables maintenant que l'envoi marche) : `plain_text` ne contient pas ce que montrent les formules, légendes et blocs spéciaux, et il est coupé à 5 000 caractères quand la route en accepte 10 000, donc un signalement lu sur `plain_text` est incomplet ; `send_private_message` ne vérifie pas que l'expéditeur a accès au message parent d'une réponse (pas de fuite en lecture).
