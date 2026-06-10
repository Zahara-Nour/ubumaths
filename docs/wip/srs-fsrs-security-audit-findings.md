# Audit sécurité — Chantier SRS / FSRS / Référentiel famille A

> Date : 2026-06-10
> Agent : `security-auditor` (Sonnet)
> Périmètre : commits `63f6192e4` → `9389de4bc` sur main
> 5 findings, 3 P2 traités immédiatement, 2 P1 documentés pour V2.

---

## P2 traités (commit `<sha à venir>`)

### P2 #1 — Defense in depth sur endpoints sections

`src/routes/api/srs/decks/[id]/sections/+server.ts` (GET) et `[sectionId]/+server.ts` (PATCH, DELETE) ne vérifiaient pas explicitement l'ownership du deck. La RLS filtrait correctement, mais retournait silencieusement `[]` ou `404` sans contexte. Ajout d'un check explicite `SELECT id FROM srs_decks WHERE id = ? AND owner_id = auth.uid()` au début de chaque handler.

### P2 #2 — `is_auto_managed` check global sur PUT `/api/srs/cards/[id]`

Le check `is_auto_managed` n'était fait que dans la branche `section_id`. Un futur ajout de champ modifiable pourrait oublier le check. Remonté en garde-fou général avant tout dispatch. RLS bloquerait quand même côté DB, mais le check applicatif rend l'erreur explicite.

### P2 #3 — Validation Zod de `deck.config` avant `new FSRS(...)`

`/api/srs/review/submit/+server.ts` passait `deck.config` (JSONB côté DB) directement à `new FSRS()`. Un payload futur malformé (params NaN, longueur ≠ 21) pourrait briser le moteur. Ajout d'une validation `fsrsConfigSchema.safeParse(deck.config)` avec fallback `DEFAULT_FSRS_PARAMS` si invalide.

---

## P1 documentés (risques V1 acceptés)

### P1 #1 — Grade abuse via review SRS sur deck Programme

**Risque** : Un élève peut POSTer `/api/srs/review/submit` avec `grade=4` sur n'importe quelle carte de son deck Programme sans avoir réellement résolu la question. Le serveur écrit `skill_attempts source='srs', success=(grade>=2)=true`, ce qui influence le trigger `update_student_skill_state_a`. Cumul de plusieurs reviews triches → bascule `is_acquired=true` au BO.

**Pourquoi accepté V1** :

- Analogue au modèle Anki : tout SRS self-graded permet à l'élève de se mentir. C'est une caractéristique du modèle, pas un bug.
- L'élève ne fait du mal qu'à lui-même (apprend mal).
- Le verdict BO `is_acquired` exige `distinct_template_successes >= 2` (cf. §6.1) : pour tricher, l'élève doit avoir DEUX templates différents tagués sur la capacité — ce qui n'est pas une option en V1 (3 templates 6ᵉ taggés, peu de capacités avec multi-templates).
- Le prof voit AUSSI les résultats Monde 1 (interactif, non-trichables). La triche SRS est détectable par contraste.

**Mitigations possibles V2** :

1. Tracker `timeSpent` côté serveur et rejeter `grade=4` si `timeSpent < 3s`.
2. Anti-fraud : pattern de grading suspect (toujours Easy, jamais Hard).
3. Durcir mapping : `success = grade >= 3` (Hard ne compte plus). **Mais** contredit la décision §1.1 actée (Hard compte comme succès car réponse correcte).

### P1 #2 — `srs_card_stats` directement writable par l'élève (préexistant, amplifié par chantier)

**Risque** : Les policies INSERT/UPDATE/DELETE de `srs_card_stats` (migration 080, ligne 322-339) autorisent l'élève à écrire arbitrairement `state='review', stability=99999, next_review='2099-01-01'` pour n'importe quelle carte. Le chantier amplifie l'impact : `templateToBadge` (`capacity-badge.ts:122`) dérive le badge directement de ces colonnes → un élève peut self-déclarer `acquise_en_memoire` sans aucun `skill_attempts`.

**Pourquoi accepté V1** :

- Risque **préexistant** (introduit en migration 080 d'octobre 2025), non créé par ce chantier.
- Le verdict BO `is_acquired` reste basé sur `skill_attempts` (non trichable directement par cette voie).
- Le badge FSRS dynamique est un signal **complémentaire** au verdict BO, pas un substitut. Un élève qui falsifie son badge n'affecte pas son LSU / bulletin.
- La fix propre = refonte vers RPC `SECURITY DEFINER` qui contrôle les inputs côté serveur. Refonte significative (touche les 2 endpoints, requiert nouvelle migration).

**Fix V2 recommandé** :

1. Migration follow-up : `REVOKE INSERT, UPDATE, DELETE ON srs_card_stats FROM authenticated`.
2. Créer RPC `upsert_srs_card_stats_self(p_grade INT, p_template_id UUID, ...)` `SECURITY DEFINER` qui :
   - Vérifie `auth.uid()` = student
   - Lit l'état courant
   - Implémente FSRS en PL/pgSQL (TOUTEFOIS spec TDD §3.3 rejette ce portage → re-discuter)
   - OU : continue d'accepter les paramètres pré-calculés côté TS, mais avec un nonce/HMAC signé par le serveur (anti-tamper)
3. Refactor les 2 endpoints pour appeler la RPC.

---

## Non-findings (vérifiés sains)

- **Famille B isolation** : policy `skill_attempts_insert_own_student` (L1:370-374) interdit `code IS NOT NULL` → pas d'auto-déclaration famille B possible.
- **section_id cross-deck** : check `eq('deck_id', card.deck_id)` dans `cards/[id]/+server.ts:160-164` empêche d'assigner une carte à la section d'un autre deck.
- **`update_student_skill_state_a` SECURITY DEFINER** : appelée uniquement par trigger sur INSERT, `student_id` provient de `NEW` (déjà validé par WITH CHECK RLS) → pas d'escalation cross-user.
- **VIEW `student_skill_state_a_v`** : `security_invoker=on` (migration L1:350) → RLS de la table sous-jacente respectée.
- **Pas de service-role usage** dans les endpoints audités. Tous utilisent `locals.supabase` (session élève).
- **`computeCapacityBadges`** : lit via `locals.supabase` filtré par `user_id` (RLS `srs_card_stats`) — pas de cross-user.
