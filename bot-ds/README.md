# Bot de Discord para Análisis de Acciones

Este bot replica la funcionalidad de la app web de análisis de acciones argentinas y CEDEARs en Discord.

## Requisitos
- Node.js 16+
- Token de bot de Discord

## Configuración

1. **Crear un bot en Discord**:
   - Ve a https://discord.com/developers/applications
   - Crea una nueva aplicación
   - Ve a "Bot" y crea un bot
   - Copia el token

2. **Configurar el token**:
   - Edita el archivo `.env` y reemplaza `TU_TOKEN_DE_DISCORD_AQUI` con tu token real.

3. **Instalar dependencias**:
   ```bash
   npm install
   ```

## Ejecutar

```bash
npm start
```

## Comandos Disponibles

- `/analizar [simbolo]` - Analiza una acción completa
- `/mejores` - Muestra mejores oportunidades
- `/precio [simbolo]` - Precio actual rápido

## Invitar al bot
- En la aplicación de Discord, ve a "OAuth2" > "URL Generator"
- Selecciona **"bot"** y **"applications.commands"** (obligatorio para slash commands)
- Selecciona permisos necesarios (leer mensajes, enviar mensajes)
- Copia la URL e invítalo a tu servidor