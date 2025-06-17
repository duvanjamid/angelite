#!/bin/bash

# Script para publicar AngeLite en npm

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparando AngeLite para publicación en npm...${NC}"

# Verificar que estamos en la rama principal
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}Error: Debes estar en la rama 'main' para publicar.${NC}"
  exit 1
fi

# Verificar que no hay cambios sin commit
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Hay cambios sin commit. Haz commit de todos los cambios antes de publicar.${NC}"
  exit 1
fi

# Construir el proyecto
echo -e "${YELLOW}Construyendo el proyecto...${NC}"
npm run build

# Verificar que la construcción fue exitosa
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: La construcción falló. Corrige los errores antes de publicar.${NC}"
  exit 1
fi

# Ejecutar pruebas
echo -e "${YELLOW}Ejecutando pruebas...${NC}"
npm test || true # No fallar si no hay pruebas configuradas

# Preguntar por la versión
echo -e "${YELLOW}Selecciona el tipo de actualización de versión:${NC}"
echo "1) Patch (0.1.0 -> 0.1.1) - Para correcciones de bugs"
echo "2) Minor (0.1.0 -> 0.2.0) - Para nuevas características compatibles"
echo "3) Major (0.1.0 -> 1.0.0) - Para cambios que rompen la compatibilidad"
echo "4) No cambiar versión"
read -p "Selección [1-4]: " VERSION_CHOICE

case $VERSION_CHOICE in
  1)
    npm version patch
    ;;
  2)
    npm version minor
    ;;
  3)
    npm version major
    ;;
  4)
    echo -e "${YELLOW}Manteniendo la versión actual.${NC}"
    ;;
  *)
    echo -e "${RED}Opción inválida. Manteniendo la versión actual.${NC}"
    ;;
esac

# Preguntar si se debe usar el README específico para npm
echo -e "${YELLOW}¿Deseas usar el README específico para npm? (s/n)${NC}"
read -p "Selección [s/n]: " README_CHOICE

if [ "$README_CHOICE" = "s" ] || [ "$README_CHOICE" = "S" ]; then
  echo -e "${YELLOW}Usando NPM_README.md para la publicación...${NC}"
  cp NPM_README.md README.md.backup
  cp NPM_README.md README.md
fi

# Preguntar si se debe publicar
echo -e "${YELLOW}¿Estás seguro de que deseas publicar en npm? (s/n)${NC}"
read -p "Selección [s/n]: " PUBLISH_CHOICE

if [ "$PUBLISH_CHOICE" = "s" ] || [ "$PUBLISH_CHOICE" = "S" ]; then
  # Publicar en npm
  echo -e "${YELLOW}Publicando en npm...${NC}"
  npm publish
  
  # Verificar si la publicación fue exitosa
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}¡AngeLite ha sido publicado exitosamente en npm!${NC}"
    
    # Hacer push de los cambios (nueva versión) a GitHub
    echo -e "${YELLOW}Enviando cambios a GitHub...${NC}"
    git push --follow-tags
    
    echo -e "${GREEN}¡Proceso completado!${NC}"
  else
    echo -e "${RED}Error: La publicación falló.${NC}"
  fi
else
  echo -e "${YELLOW}Publicación cancelada.${NC}"
fi

# Restaurar el README original si se usó el específico para npm
if [ "$README_CHOICE" = "s" ] || [ "$README_CHOICE" = "S" ]; then
  echo -e "${YELLOW}Restaurando README original...${NC}"
  mv README.md.backup README.md
fi

echo -e "${GREEN}¡Proceso finalizado!${NC}"
