# 🚚 Mueveloexpress - Sistema de Cotización de Mudanzas

Sistema web completo para cotizar mudanzas con generación automática de PDFs y envío de presupuestos por email.

## ✨ Características

- ✅ Formulario interactivo de cotización
- ✅ Cálculo automático de metros cúbicos (m³)
- ✅ Análisis de fotos con IA (opcional)
- ✅ Generación de PDF con presupuesto detallado
- ✅ Envío automático de emails con cotización
- ✅ Precios variables según zona geográfica
- ✅ Recargos automáticos (sin ascensor, muebles delicados, etc.)

## 🛠 Instalación Local

### Requisitos
- Node.js 16+ ([descargar](https://nodejs.org/))
- npm (viene con Node.js)

### Pasos de instalación

1. **Clonar o descargar el proyecto**
```bash
# Si tienes git:
git clone <tu-repositorio>
cd mueveloexpress-backend

# O simplemente descarga la carpeta
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de email:
```
PORT=3000
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_contraseña_app
```

4. **Ejecutar el servidor**
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Desarrollo
Para ejecutar en modo desarrollo con auto-reload:
```bash
npm run dev
```

## 📧 Configurar Email

### Opción 1: Gmail (Recomendado)
1. Usa tu email de Gmail
2. Habilita autenticación de dos factores
3. Genera una [contraseña de aplicación](https://myaccount.google.com/apppasswords)
4. Usa esa contraseña en `EMAIL_PASSWORD`

### Opción 2: Outlook / Hotmail
```
EMAIL_SERVICE=outlook
EMAIL_USER=tu_email@hotmail.com
EMAIL_PASSWORD=tu_contraseña
```

### Opción 3: SendGrid (Para producción)
```
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=tu_api_key_sendgrid
```

[Crear cuenta SendGrid gratuita](https://sendgrid.com)

## 🚀 Publicación en Hosting Gratuito

### Opción 1: Render.com (Recomendado - Gratuito)

1. **Crear cuenta en Render**
   - Ve a [https://render.com](https://render.com)
   - Regístrate con GitHub o email

2. **Crear nuevo Web Service**
   - Dashboard → New → Web Service
   - Conecta tu repositorio de GitHub (o sube los archivos)

3. **Configurar el servicio**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables: Agrega los valores de tu `.env`
     - `EMAIL_USER`
     - `EMAIL_PASSWORD`
     - `EMAIL_SERVICE`
   - Escala: Select Free (gratis)

4. **Deploy**
   - Click en "Create Web Service"
   - Espera a que se deployed (~2 minutos)

URL final: `https://tu-servicio.onrender.com`

### Opción 2: Railway.app

1. Ve a [https://railway.app](https://railway.app)
2. Conecta tu repositorio GitHub
3. Selecciona Node.js
4. Agrega variables de entorno
5. Railway detectará `package.json` y hará deploy automáticamente

### Opción 3: Vercel (solo frontend)

Para solo servir el HTML en Vercel:
1. Sube la carpeta `public` a tu repositorio
2. Ve a [https://vercel.com](https://vercel.com)
3. Importa tu repositorio
4. Deploy automático

Para el backend, necesitarás Render o Railway.

### Opción 4: Heroku (antiguo pero sigue funcionando)

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Crear app
heroku create tu-app-name

# Configurar variables
heroku config:set EMAIL_USER=tu@email.com
heroku config:set EMAIL_PASSWORD=tu_contraseña

# Deploy
git push heroku main
```

## 📊 Estructura de Precios

El sistema calcula automáticamente los precios según:

- **Precio base**: Varía por zona ($40,000 - $65,000)
- **Volumen**: $25,000 por m³
- **Recargos**:
  - Sin ascensor: +$80,000 (origen y/o destino)
  - Muebles delicados: +$120,000
  - Estacionamiento lejano: +$100,000

### Zonas incluidas
- Santiago Centro, Providencia, Las Condes
- Ñuñoa, Macul, Peñalolén
- La Florida, La Reina, Vitacura
- San Isidro, Estación Central, Quinta Normal
- Recoleta, San Bernardo, Puente Alto
- La Cisterna, Maipú, Cerrillos

**Nota**: Puedes editar las zonas y precios en `quotation.js` → `PRICING_ZONES`

## 📝 Estructura del Proyecto

```
mueveloexpress-backend/
├── public/
│   └── index.html              # Página principal (formulario)
├── server.js                   # Servidor Express
├── quotation.js                # Lógica de cotización y email
├── package.json                # Dependencias
├── .env.example                # Variables de entorno (ejemplo)
└── README.md                   # Este archivo
```

## 🔧 API Endpoints

### POST `/api/cotizar`
Procesa una cotización y envía email

**Request body:**
```json
{
  "nombre": "Juan Pérez",
  "fecha": "2024-03-15",
  "email": "juan@example.com",
  "telefono": "912345678",
  "origen": {
    "tipo": "Casa",
    "direccion": "Av. Providencia 1234, Santiago",
    "numero": "305",
    "piso": "3",
    "ascensor": "Sí, hay ascensor"
  },
  "destino": {
    "tipo": "Departamento",
    "direccion": "Las Condes 5678, Santiago",
    "numero": "102",
    "piso": "1",
    "ascensor": "No hay ascensor"
  },
  "inventario": {
    "Cama 2 Plazas (incluye colchón)": 1,
    "Sofá 3 cuerpos": 1
  },
  "volumenTotal": 3.5,
  "itemsTotal": 2,
  "delicado": "no",
  "estacionamiento": {
    "origen": "Sí, a menos de 40 metros",
    "destino": "No, a más de 40 metros"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cotización procesada correctamente",
  "quotationId": "A1B2C3D4"
}
```

### GET `/api/health`
Verifica que el servidor está funcionando

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-15T10:30:00.000Z"
}
```

## 🐛 Troubleshooting

### "No se envía el email"
1. Verifica que `EMAIL_USER` y `EMAIL_PASSWORD` estén correctos
2. Para Gmail, asegúrate de usar contraseña de aplicación
3. Revisa los logs: `console.error`

### "Error: ENOENT: no such file or directory, open 'public/index.html'"
Asegúrate de que la carpeta `public` existe y tiene `index.html`

### "Port already in use"
Cambia el `PORT` en `.env` a otro número (3001, 3002, etc.)

### "No se ve el formulario"
1. Verifica que estés en `http://localhost:3000`
2. Abre la consola del navegador (F12) para ver errores

## 🤝 Soporte

Para problemas o preguntas:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Prueba con `curl` o Postman

## 📄 Licencia

MIT

## 🎉 Próximos pasos

1. ✅ Despliega a producción
2. ✅ Comparte el enlace con tus clientes
3. ✅ Monitorea los emails que llegan
4. ✅ Personaliza los precios según tus costos reales
5. ✅ Agrega más zonas geográficas

---

**Última actualización**: 2024
**Versión**: 1.0.0
