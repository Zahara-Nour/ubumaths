#!/bin/bash

# Navadra Game Assets Setup Script
# Author: Claude Code
# Date: 2025-10-15
#
# This script copies game assets from the original Navadra codebase
# to the UbuMaths static folder for local serving.

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
NAVADRA_SOURCE="extern/navadra-jeu/webroot"
STATIC_DEST="static/game"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Navadra Game Assets Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if source directory exists
if [ ! -d "$NAVADRA_SOURCE" ]; then
    echo -e "${RED}❌ Error: Source directory not found: $NAVADRA_SOURCE${NC}"
    echo -e "${YELLOW}Please ensure the original Navadra codebase is located at:${NC}"
    echo -e "${YELLOW}  $NAVADRA_SOURCE${NC}"
    exit 1
fi

echo -e "${BLUE}Source:${NC} $NAVADRA_SOURCE"
echo -e "${BLUE}Destination:${NC} $STATIC_DEST"
echo ""

# Create destination directories
echo -e "${BLUE}📁 Creating destination directories...${NC}"
mkdir -p "$STATIC_DEST/monsters"
mkdir -p "$STATIC_DEST/spells"
mkdir -p "$STATIC_DEST/characters"
mkdir -p "$STATIC_DEST/sounds"
mkdir -p "$STATIC_DEST/ui"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Copy monster images
if [ -d "$NAVADRA_SOURCE/img/monstres" ]; then
    echo -e "${BLUE}🐉 Copying monster images...${NC}"
    cp -r "$NAVADRA_SOURCE/img/monstres/"* "$STATIC_DEST/monsters/" 2>/dev/null || true
    MONSTER_COUNT=$(find "$STATIC_DEST/monsters" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Copied $MONSTER_COUNT monster images${NC}"
else
    echo -e "${YELLOW}⚠ Monster images directory not found, skipping...${NC}"
fi
echo ""

# Copy spell icons
if [ -d "$NAVADRA_SOURCE/img/spells" ]; then
    echo -e "${BLUE}✨ Copying spell icons...${NC}"
    cp -r "$NAVADRA_SOURCE/img/spells/"* "$STATIC_DEST/spells/" 2>/dev/null || true
    SPELL_COUNT=$(find "$STATIC_DEST/spells" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Copied $SPELL_COUNT spell icons${NC}"
else
    echo -e "${YELLOW}⚠ Spell icons directory not found, skipping...${NC}"
fi
echo ""

# Copy character images
if [ -d "$NAVADRA_SOURCE/img/personnages" ]; then
    echo -e "${BLUE}👤 Copying character images...${NC}"
    cp -r "$NAVADRA_SOURCE/img/personnages/"* "$STATIC_DEST/characters/" 2>/dev/null || true
    CHAR_COUNT=$(find "$STATIC_DEST/characters" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Copied $CHAR_COUNT character images${NC}"
else
    echo -e "${YELLOW}⚠ Character images directory not found, skipping...${NC}"
fi
echo ""

# Copy UI elements
if [ -d "$NAVADRA_SOURCE/img/icones" ]; then
    echo -e "${BLUE}🎨 Copying UI elements...${NC}"
    cp -r "$NAVADRA_SOURCE/img/icones/"* "$STATIC_DEST/ui/" 2>/dev/null || true
    UI_COUNT=$(find "$STATIC_DEST/ui" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Copied $UI_COUNT UI elements${NC}"
else
    echo -e "${YELLOW}⚠ UI elements directory not found, skipping...${NC}"
fi
echo ""

# Copy sounds
if [ -d "$NAVADRA_SOURCE/sons" ]; then
    echo -e "${BLUE}🔊 Copying sound effects...${NC}"
    cp -r "$NAVADRA_SOURCE/sons/"* "$STATIC_DEST/sounds/" 2>/dev/null || true
    SOUND_COUNT=$(find "$STATIC_DEST/sounds" -type f | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Copied $SOUND_COUNT sound files${NC}"
else
    echo -e "${YELLOW}⚠ Sounds directory not found, skipping...${NC}"
fi
echo ""

# Calculate total size
TOTAL_SIZE=$(du -sh "$STATIC_DEST" | cut -f1)

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Asset setup complete!${NC}"
echo -e "${BLUE}Total size:${NC} $TOTAL_SIZE"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run: ${GREEN}pnpm db:migrate${NC} (if not done already)"
echo -e "  2. Run: ${GREEN}pnpm game:import-challenges${NC} (if not done already)"
echo -e "  3. Start dev server: ${GREEN}pnpm dev${NC}"
echo -e "  4. Navigate to: ${GREEN}http://localhost:5173/dashboard/navadra${NC}"
echo ""
echo -e "${BLUE}Happy gaming! 🎮${NC}"
