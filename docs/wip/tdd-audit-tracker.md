# Audit TDD - Suivi de Progression

**Objectif** : Vérifier que les tests existants correspondent aux règles métier attendues.

**Démarré le** : 2025-12-09

---

## Domaines à Auditer

### Priorité HAUTE (Logique métier critique)

| #   | Domaine             | Description                                    | Fichiers tests | Status     |
| --- | ------------------- | ---------------------------------------------- | -------------- | ---------- |
| 1   | **Gidouilles**      | Monnaie virtuelle gagnée/dépensée              | ~5             | ⬜ À faire |
| 2   | **Cartes VIP**      | Système de cartes récompenses avec raretés     | ~10            | ⬜ À faire |
| 3   | **Marketplace**     | Échanges de cartes entre élèves                | ~5             | ⬜ À faire |
| 4   | **Énigmes du jour** | Énigmes quotidiennes avec récompenses          | ~3             | ⬜ À faire |
| 5   | **Évaluations**     | Examens notés avec limites de temps/tentatives | ~15            | ⬜ À faire |
| 6   | **Avertissements**  | Système d'avertissements comportementaux       | ~3             | ⬜ À faire |
| 7   | **Achievements**    | Badges et succès déblocables                   | ~10            | ⬜ À faire |

### Priorité MOYENNE (Fonctionnalités importantes)

| #   | Domaine               | Description                                | Fichiers tests | Status     |
| --- | --------------------- | ------------------------------------------ | -------------- | ---------- |
| 8   | **Exercices**         | Banque d'exercices paramétrés              | ~20            | ⬜ À faire |
| 9   | **Devoirs**           | Assignation d'exercices non notés          | ~5             | ⬜ À faire |
| 10  | **SRS (Révisions)**   | Système de répétition espacée (flashcards) | ~5             | ⬜ À faire |
| 11  | **Navadra (Jeu RPG)** | Combat, sorts, progression                 | ~10            | ⬜ À faire |
| 12  | **Démineur**          | Jeu avec achievements                      | ~3             | ⬜ À faire |
| 13  | **Tuteur IA (Chat)**  | Chat avec Père Ubu, détection triche       | ~5             | ⬜ À faire |
| 14  | **Messages**          | Messagerie privée                          | ~5             | ⬜ À faire |
| 15  | **Notifications**     | Système de notifications                   | ~5             | ⬜ À faire |

### Priorité BASSE (Infrastructure / Admin)

| #   | Domaine                 | Description                        | Fichiers tests | Status     |
| --- | ----------------------- | ---------------------------------- | -------------- | ---------- |
| 16  | **Classes**             | Gestion des classes et élèves      | ~10            | ⬜ À faire |
| 17  | **Google Classroom**    | Synchronisation Google             | ~10            | ⬜ À faire |
| 18  | **Fiches (Worksheets)** | Assignation de PDFs                | ~3             | ⬜ À faire |
| 19  | **Boutique**            | Achat d'items virtuels             | ~3             | ⬜ À faire |
| 20  | **Amis**                | Relations sociales                 | ~2             | ⬜ À faire |
| 21  | **Modération**          | Filtrage contenu, restrictions     | ~3             | ⬜ À faire |
| 22  | **Résumés quotidiens**  | Génération automatique de rapports | ~3             | ⬜ À faire |
| 23  | **Triggers DB**         | Triggers PostgreSQL                | ~11            | ⬜ À faire |

### Priorité HAUTE (Système critique)

| #   | Domaine                | Description                                 | Fichiers tests | Status            |
| --- | ---------------------- | ------------------------------------------- | -------------- | ----------------- |
| 24  | **Authentification**   | Login, sessions, tokens, middleware auth    | ~5             | ✅ Validé (62/62) |
| 25  | **Autorisation (RLS)** | Permissions, accès par rôle, policies DB    | ~10            | ⬜ À faire        |
| 26  | **Realtime**           | Subscriptions Supabase, présence, broadcast | ~5             | ⬜ À faire        |
| 27  | **CSRF Protection**    | Protection contre attaques CSRF             | ~2             | ⬜ À faire        |
| 28  | **Rate Limiting**      | Limitation des requêtes API                 | ~3             | ⬜ À faire        |

### Priorité MOYENNE (Système support)

| #   | Domaine              | Description                            | Fichiers tests | Status     |
| --- | -------------------- | -------------------------------------- | -------------- | ---------- |
| 29  | **Error Monitoring** | Capture et tracking des erreurs        | ~3             | ⬜ À faire |
| 30  | **Logging**          | Journalisation des actions             | ~2             | ⬜ À faire |
| 31  | **Health Checks**    | Vérification santé de l'app            | ~2             | ⬜ À faire |
| 32  | **Cron Jobs**        | Tâches planifiées (summaries, cleanup) | ~3             | ⬜ À faire |
| 33  | **Sanitization**     | Nettoyage HTML, protection XSS         | ~3             | ⬜ À faire |
| 34  | **Validation Zod**   | Schémas de validation des inputs       | ~15            | ⬜ À faire |

### Hors scope (technique pur - algorithmes définis)

| Domaine                    | Raison                                                   |
| -------------------------- | -------------------------------------------------------- |
| MathAST                    | Parsing mathématique - comportement algorithmique défini |
| Parsers Markdown           | Parsing - comportement syntaxique défini                 |
| Constructions géométriques | Animations - rendu visuel                                |
| Python/Notebook            | Exécution code externe                                   |
| Grapheur                   | Visualisation mathématique                               |
| Tableur                    | Calcul tableur standard                                  |

---

## Légende des Status

| Icône | Signification            |
| ----- | ------------------------ |
| ⬜    | À faire                  |
| 🔄    | En cours                 |
| ✅    | Validé (tests conformes) |
| ⚠️    | Corrigé (tests modifiés) |
| ➕    | Étendu (tests ajoutés)   |

---

## Sessions d'Audit

### Session 1 - 2025-12-09

**Domaine** : #24 - Authentification

**Comportements validés** : 60/62

- CRON Auth (8/8) : Configuration, headers, timing attacks, tokens
- CSRF Protection (8/8) : Validation Origin, whitelist domaines
- Rate Limiting (11/11) : Login/Signup limits, notifications
- Login E2E (18/20) : Flows connexion, validation formulaires, sécurité
- RBAC E2E (15/15) : Routes protégées par rôle

**Comportements étendus** : 2

- 4.9 : Tests ajoutés pour protection énumération + timing attack
- 4.14 : Tests ajoutés pour inscription contrôlée (pas de signup public)

**Tests ajoutés** :

- `e2e/auth/login.spec.ts` : test énumération, test absence lien signup, test route signup inaccessible
- `tests/unit/api/auth/login-timing.test.ts` : nouveau fichier timing attack

---

## Statistiques

| Métrique                | Valeur |
| ----------------------- | ------ |
| Domaines total          | 34     |
| Domaines audités        | 1      |
| Domaines validés        | 1      |
| Domaines corrigés       | 0      |
| Tests modifiés          | 1      |
| Tests ajoutés           | 4      |
| Comportements validés   | 60     |
| Comportements étendus   | 2      |
| Comportements invalidés | 0      |

---

## Notes

_Espace pour notes générales durant l'audit_
