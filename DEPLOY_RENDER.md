# 🚀 Guía Rápida: Publicar en Render.com (5 minutos)

## Paso 1: Preparar el código en GitHub

### 1.1 Crear repositorio en GitHub
1. Ve a [https://github.com/new](https://github.com/new)
2. Nombre: `mueveloexpress` (o similar)
3. Descripción: "Sistema de cotización de mudanzas"
4. Selecciona "Public" o "Private" (según prefieras)
5. **NO** inicialices con README (ya tienes uno)
6. Click en "Create repository"

### 1.2 Subir archivos a GitHub
En tu terminal/Git Bash:
```bash
cd /ruta/a/mueveloexpress-backend

# Inicializar git
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit: Mueveloexpress backend"

# Agregar remote (copia la URL de tu repo en GitHub)
git remote add origin https://github.com/TU_USUARIO/mueveloexpress.git

# Push
git branch -M main
git push -u origin main
```

**Nota**: Crea un archivo `.gitignore` antes de hacer push:
```
node_modules/
.env
.DS_Store
*.log
```

## Paso 2: Crear cuenta en Render.com

1. Ve a [https://render.com](https://render.com)
2. Click en "Sign up"
3. Registrate con GitHub (recomendado) o email
4. Verifica tu email si es necesario

## Paso 3: Crear Web Service en Render

1. **Dashboard** → Click en "New +"
2. Selecciona **"Web Service"**
3. **"Connect a repository"**
   - Selecciona tu repositorio `mueveloexpress`
   - Click en "Connect"

## Paso 4: Configurar el servicio

Completar los siguientes campos:

| Campo | Valor |
|-------|-------|
| **Name** | mueveloexpress-api |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Region** | Singapore (o la más cercana a ti) |

## Paso 5: Agregar variables de entorno

1. Desplaza hasta la sección **"Environment"**
2. Click en "Add Environment Variable"
3. Agrega estas tres variables:

```
Email del servidor:
KEY: EMAIL_USER
VALUE: tu_email@gmail.com

Contraseña (app password de Gmail):
KEY: EMAIL_PASSWORD
VALUE: tu_contraseña_de_app

Servicio de email:
KEY: EMAIL_SERVICE
VALUE: gmail
```

**¿De dónde obtengo la contraseña de Gmail?**
1. Ve a [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Selecciona:
   - App: Mail
   - Device: Windows PC (o lo que uses)
3. Google te da una contraseña de 16 caracteres
4. Cópiala en `EMAIL_PASSWORD`

## Paso 6: Cambiar Plan (Importante)

⚠️ **Por defecto Render cobra dinero**. Para usar gratis:

1. Desplaza hasta **"Instance Type"**
2. Cambia a **"Free"**
   - Nota: El servidor se dormirá después de 15 minutos sin uso
   - Se reactiva automáticamente cuando recibe solicitudes

## Paso 7: Deploy

1. Click en **"Create Web Service"**
2. Espera a que compile (2-3 minutos)
3. Verás un enlace como: `https://mueveloexpress-api.onrender.com`

## ✅ Verificar que funciona

1. Abre en navegador: `https://mueveloexpress-api.onrender.com`
   - Deberías ver el formulario

2. Prueba con la solicitud de salud:
   - `https://mueveloexpress-api.onrender.com/api/health`
   - Deberías ver: `{"status":"ok","timestamp":"..."}`

## 🎉 ¡Listo!

Tu sitio está publicado. Comparte el enlace:
- Formulario: `https://mueveloexpress-api.onrender.com`
- WhatsApp: `https://wa.me/56983342334` (actualiza el número)

## 📝 Editar variables después

Si necesitas cambiar EMAIL_USER o EMAIL_PASSWORD:
1. Dashboard de Render
2. Tu servicio → Environment
3. Edita la variable
4. Render hace re-deploy automáticamente

## 🐛 Troubleshooting

### "Build failed"
- Revisa los logs en Render (pestaña "Logs")
- Asegúrate que `package.json` está en la raíz
- Verifica que no hay errores de sintaxis

### "H13 error - Connection refused"
- El servidor tardó en iniciar (es normal en plan free)
- Espera 30 segundos e intenta de nuevo

### "Emails no llegan"
- Verifica que EMAIL_USER y EMAIL_PASSWORD son correctos
- Prueba en local primero con: `npm start`
- Revisa la bandeja de spam

### "Port error"
- Render asigna puerto automáticamente
- No cambies `PORT` en .env de Render, déjalo que use el que asigna

## 💰 Costos

- **Plan Free**: Gratis pero con limitaciones
  - Se duerme después de 15 min sin uso
  - 100 horas/mes

- **Plan Starter**: $7/mes
  - Siempre activo
  - Mejor para producción

Para producción (muchos clientes), considera cambiar a Starter.

## 📞 Soporte

- Documentación Render: [docs.render.com](https://docs.render.com)
- Comunidad: [Community Discord](https://discord.gg/render)

---

**¡Ya está! Tu sistema de cotizaciones está vivo en internet** 🎉
