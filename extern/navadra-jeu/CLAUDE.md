# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Navadra is an educational web game built with PHP that teaches mathematics through an RPG-style adventure. Players fight monsters by solving math challenges, collect spells, and progress through a tutorial-driven storyline.

## Architecture

### MVC Pattern

The codebase follows a classic Model-View-Controller pattern:

- **Models** (`app/classes/`): Domain objects (e.g., `Joueur`, `Monstre`, `Combat`) with corresponding Manager classes for database operations
- **Controllers** (`app/controllers/`): Handle request logic and orchestrate models/views
- **Views** (`app/views/`): PHP templates for rendering HTML

### Key Architectural Components

**Global Controller Flow**: Every authenticated request flows through:
1. `index.php` → `webroot/index.php` → `app/controllers/include_path.php`
2. `app/controllers/controleur_global.php` is included for logged-in users
3. `controleur_global.php` handles:
   - Session management and player state
   - Tutorial progression logic
   - Combat state management
   - Daily/seasonal game mechanics
   - Redirection rules based on tutorial stage

**Database Access Pattern**:
- Two PDO connections: `$db_RO` (read-only) and `$db_RW` (read-write)
- Manager classes follow the pattern: `get()`, `add()`, `update()`, `delete()`
- All serialized data (positions, contacts, etc.) is handled in Manager classes

**Challenge System**:
- Math challenges are stored as JSON files in `generators/challenges/` organized by element (fire, water, earth, wind)
- On Linux production, challenges are loaded into Memcached for performance
- See `generators/readme.txt` for challenge variable/condition syntax

### Session and State Management

- `$_SESSION["joueur"]` holds the current player object
- Tutorial state is tracked via `joueur->tuto()` with values like "cinematique_0", "index_1", "combattre_2", etc.
- Combat state is tracked via `$_SESSION["combat_en_cours"]`
- The global controller enforces strict tutorial progression via redirects

### Manager Classes

All Manager classes follow this pattern:
```php
class FooManager {
    private $_db_RO;  // Read-only database connection
    private $_db_RW;  // Read-write database connection

    public function __construct($db_RO, $db_RW)
    public function get($info)           // Retrieve by ID/pseudo/email
    public function add(Foo $foo)        // Insert new record
    public function update(Foo $foo)     // Update existing record
    public function delete(Foo $foo)     // Delete record
}
```

Manager instances are created once in `include_path.php` and available globally:
- `$manager` (JoueursManager)
- `$monstres_manager`, `$combats_manager`, `$challenges_manager`, etc.

## Development Commands

### Database Setup

Initialize the database:
```bash
mysql -u root -p < DB/NAVADRA_INIT.sql
```

Update database credentials in `app/controllers/include_path.php`:
```php
$db_RO = new PDO('mysql:host=localhost;port=3306;dbname=navadra;charset=utf8', 'navadra', 'YOUR_PASSWORD');
```

### Deployment (Development Server)

Configure SSH credentials:
```bash
cp dev-config.json_base dev-config.json
# Edit dev-config.json with your SSH credentials
```

Deploy using Gulp:
```bash
npm install
gulp app        # Deploy app folder only
gulp webroot    # Deploy webroot folder only
gulp all        # Deploy everything (excludes node_modules)
gulp rights     # Fix permissions on remote server
```

### Dependencies

Install PHP dependencies:
```bash
composer install
```

Required PHP extensions:
- PDO with MySQL driver
- mbstring
- For WebSocket chat server: `pcntl`, `sockets`

## Development Guidelines

### Working with Player Objects

Always reload player data from database before operations to avoid stale state:
```php
$joueur = $manager->get($joueur->id());
```

After modifying a player object, persist changes:
```php
$joueur->setSomeValue($value);
$manager->update($joueur);
```

### Tutorial System

Tutorial stages are tracked in `$joueur->tuto()`. The progression is:
```php
["cinematique_0", "index_1", "combattre_2", "index_3", "accueil_defi_4",
 "fin_defi_5", "grimoire_6", "grimoire_7", "index_8", "prepa_combats_9",
 "combats_decks_10", "combattre_11", "index_12", "fini"]
```

Tutorial advancement happens in `controleur_global.php` when `$_GET["tuto"] == "next"`.

### Combat System

Combats involve:
1. **Monster Creation** (`Monstre` class) - defines monster stats and element
2. **Combat Setup** (`Combat` class) - tracks participants and state
3. **Combat Flow** - stored as serialized string in `deroulement` field
4. Combat resolution modifies player prestige and XP

Combat abandonment is handled in `controleur_global.php` via `$_SESSION["combat_en_cours"]`.

### Challenge System

Math challenges use a custom JSON format with:
- Variable definitions (geometric, numeric, arrays)
- Conditions for validation
- Show answer logic

Refer to `generators/readme.txt` for the complete challenge syntax documentation.

### Email System

The codebase uses Mailjet for emails via `Joueur->send_email()`:
- Template IDs are hardcoded (e.g., "34640" for welcome email)
- Parent email confirmation logic for underage players
- Subscription/payment confirmation emails

### WebSocket Chat

A Ratchet-based WebSocket server for real-time chat is implemented in:
- `app/controllers/chat_server.php`

Start the server with:
```bash
php app/controllers/chat_server.php
```

## Common Pitfalls

1. **Serialized Data**: Player contacts, position, viewed stories, and music settings are serialized in the database. Always use Manager methods to handle these.

2. **Tutorial Locks**: During tutorial, `controleur_global.php` aggressively redirects players to the correct page. Test with `joueur->tuto() == "fini"` for post-tutorial features.

3. **Combat State**: Leaving a combat without finishing triggers automatic loss logic. Be careful with redirects during active combat.

4. **Windows vs Linux**: JSON challenge loading from Memcached is disabled on Windows. Development on Windows uses direct file reads.

5. **Autoloading**: The custom autoloader in `include_path.php` expects class files named exactly as the class name (e.g., `Joueur.php` for class `Joueur`).

6. **Database Connections**: Always use appropriate connection (`$db_RO` for reads, `$db_RW` for writes) in Manager methods.

## File Organization

- `app/classes/` - Domain models and managers (42 files)
- `app/controllers/` - Page controllers and AJAX endpoints (44 files)
- `app/views/` - PHP templates (40+ files)
- `generators/challenges/` - JSON challenge definitions (organized by element)
- `generators/monsters/` - Monster generation configurations
- `webroot/` - Public assets (CSS, JS, images, sounds)
- `DB/` - Database initialization script
- `vendor/` - Composer dependencies

## Key Domain Concepts

- **Joueur (Player)**: Central entity with tutorial progress, level, XP, prestige, element affinities
- **Monstre (Monster)**: Enemies with elements, difficulty, solo/multi-player mode
- **Combat (Fight)**: Instance of a battle with participants and turn-by-turn state
- **Challenge**: Math exercises with levels, generated from JSON templates
- **Sort (Spell)**: Unlockable abilities used in combat
- **Saison (Season)**: Monthly leaderboard resets with rewards
- **Classroom**: Teacher-created groups for student management
- **Timeslot**: Scheduled challenge availability for classrooms
