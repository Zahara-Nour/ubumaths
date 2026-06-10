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
2. **Anti-fraud pattern detection** — ✅ **LIVRÉE 2026-06-10**, voir [`docs/ref/srs/anti-fraud.md`](../ref/srs/anti-fraud.md). Désactivée par défaut tant que tagging < 20 templates.
3. Durcir mapping : `success = grade >= 3` (Hard ne compte plus). **Mais** contredit la décision §1.1 actée (Hard compte comme succès car réponse correcte).

---

### V2 — Spec anti-fraud pattern detection (livrée — historique)

> ✅ **Livrée 2026-06-10**. Référence vivante : [`docs/ref/srs/anti-fraud.md`](../ref/srs/anti-fraud.md).
> La spec ci-dessous est conservée en archive (les détails d'implémentation ont pu évoluer — la doc de référence fait foi).

**Quand** : à activer dès que **≥ 20 templates 6ᵉ taggés** ET **≥ 5 capacités avec ≥ 2 templates distincts**, car c'est à partir de là que le verdict BO `is_acquired` devient triable (la règle `distinct_template_successes >= 2` perd son effet protecteur).

**Principes** :

- **Détection silencieuse** (pas de sanction directe). On flagge en BDD + on alerte le prof dans son dashboard.
- **Multi-critères** combinés (jamais un seul signal).
- **Seuils tolérants** + **fenêtre temporelle large** pour minimiser les faux positifs.

**Signaux à combiner** :

| Signal                                                                                      | Seuil indicatif                       | Pondération |
| ------------------------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| Ratio Easy / Total                                                                          | > 90% sur 7j (min 20 reviews)         | Moyen       |
| 0 Again sur 30+ reviews consécutives                                                        | Inviolable pour un vrai apprenant     | Fort        |
| `timeSpent` médian < 2s sur ≥ 10 reviews                                                    | Lecture impossible                    | Fort        |
| Burst > 15 reviews en < 60s                                                                 | Spam évident                          | Très fort   |
| Δ taux réussite SRS vs Monde 1 sur même capacité                                            | > 50 points (ex: 95% SRS vs 30% Quiz) | Très fort   |
| Distribution Easy/Good/Hard/Again très éloignée d'une dist. de référence (Kullback-Leibler) | Divergence > 1.5                      | Faible (V3) |

**Score composite** (esquisse) : weighted sum normalized → 0 (clean) à 1 (très suspect). Seuil d'alerte à 0.7.

**Schéma de stockage** :

```sql
CREATE TABLE srs_anti_fraud_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES profiles(id),
    flag_type       TEXT NOT NULL,   -- 'high_easy_ratio' | 'no_again' | 'fast_burst' | 'srs_vs_quiz_gap'
    severity        SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    score           REAL NOT NULL,   -- composite score 0..1
    window_start    TIMESTAMPTZ NOT NULL,
    window_end      TIMESTAMPTZ NOT NULL,
    sample_size     INTEGER NOT NULL,
    details         JSONB,           -- breakdown des signaux qui ont contribué
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_by     UUID REFERENCES profiles(id),  -- prof qui a marqué "ok"
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Job de calcul** : pg_cron quotidien (ou trigger sur seuil de reviews atteint). Évite le calcul on-demand qui surchargerait le hot path.

**UI prof** :

- Section "Élèves à surveiller" dans le dashboard prof
- Pour chaque flag : élève + type + score + bouton "Voir détails" (graphique reviews) + bouton "Marquer comme OK"
- Filtres par classe, période, type de flag

**UX élève** (option soft à V2.5) :

- Si score > 0.8 sur 3 fenêtres consécutives : afficher une fois un message non-bloquant : "On a remarqué que tu notes beaucoup de cartes en Easy. Réviser ne sert que si tu réponds honnêtement. Voici comment bien noter →" + lien doc.
- Pas de sanction automatique. L'auto-réflexion suffit pour 80% des cas.

**Faux positifs à anticiper** :

- **Petit pool de cartes maîtrisées** (5 cartes connues) → exclure si `sample_size < 20`.
- **Élève très rapide légitime** → croiser avec succès Monde 1 cohérent.
- **Élève en révision de surconfiance** (entraînement) → tolérer ratio Easy élevé si Monde 1 confirme.

**Effort estimé V2** : ~3-5 jours

- 0.5j — Schema + migration + RLS
- 1j — Job de calcul (PL/pgSQL ou Edge Function nocturne)
- 1.5j — UI dashboard prof (page dédiée + intégration)
- 0.5j — UX élève soft warning (V2.5)
- 0.5j — Tests + doc

**Pré-requis** :

- ≥ 20 templates 6ᵉ taggés (sinon faux positifs garantis sur petit pool)
- Métriques de base : `timeSpent` envoyé fiablement par le client (déjà côté `submitReviewSchema`)
- Volume `skill_attempts` suffisant pour le calcul statistique (~50 reviews/élève/semaine en pic scolaire)

**À surveiller en attendant** :

Dashboard prof V1 peut afficher dès maintenant, sans détection automatique :

- Ratio Easy par élève sur 7j (sans interprétation)
- Δ SRS vs Monde 1 par élève par capacité
- Le prof juge à l'œil, en attendant l'algo

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
