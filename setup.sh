#!/bin/bash

# setup.sh - Script de configuración automática para Arnexu
# Ejecuta este script después de clonar el repositorio

echo "🚀 Configurando Arnexu..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "ia-mentor.html" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto Arnexu"
    exit 1
fi

# Crear archivo de variables de entorno si no existe
if [ -f "js/env.js" ]; then
    echo "⚠️  El archivo js/env.js ya existe."
    read -p "¿Deseas sobrescribirlo? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "✅ Manteniendo archivo existente"
    else
        cp js/env.example.js js/env.js
        echo "✅ Archivo js/env.js creado desde plantilla"
    fi
else
    cp js/env.example.js js/env.js
    echo "✅ Archivo js/env.js creado desde plantilla"
fi

echo ""
echo "📝 Configuración de API Key de Groq"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para obtener tu API key:"
echo "1. Ve a: https://console.groq.com/keys"
echo "2. Inicia sesión o crea una cuenta"
echo "3. Haz clic en 'Create API Key'"
echo "4. Copia la key generada"
echo ""

read -p "¿Ya tienes tu API key de Groq? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    read -p "Pega tu API key de Groq: " GROQ_KEY
    
    # Reemplazar en el archivo env.js
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/tu_api_key_aqui/$GROQ_KEY/g" js/env.js
    else
        # Linux
        sed -i "s/tu_api_key_aqui/$GROQ_KEY/g" js/env.js
    fi
    
    echo "✅ API key configurada correctamente"
else
    echo "⚠️  Necesitas configurar la API key manualmente"
    echo "   Edita el archivo: js/env.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ ¡Configuración completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Configura Supabase en js/config.js"
echo "2. Crea las tablas en Supabase (ver README.md)"
echo "3. Abre inicio.html en tu navegador"
echo ""
echo "📚 Para más información, consulta README.md"
echo ""
echo "🚀 ¡Listo para comenzar!"