import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processQuotation } from './quotation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug: mostrar dónde estamos buscando
console.log('Directorio actual:', __dirname);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos - intentar múltiples ubicaciones
app.use(express.static(join(__dirname)));
app.use(express.static(join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  const indexPath = join(__dirname, 'index.html');
  console.log('Buscando index.html en:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sirviendo index.html:', err);
      res.status(404).send('index.html no encontrado');
    }
  });
});

// API para procesar cotización
app.post('/api/cotizar', async (req, res) => {
  try {
    const formData = req.body;

    // Validar datos básicos
    if (!formData.email || !formData.nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Procesar la cotización (genera PDF y envía email)
    const result = await processQuotation(formData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Cotización procesada correctamente',
        quotationId: result.quotationId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Error procesando la cotización'
      });
    }
  } catch (error) {
    console.error('Error en /api/cotizar:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando la cotización'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Mueveloexpress ejecutándose en puerto ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});
