import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { Buffer } from 'buffer';
import { randomBytes } from 'crypto';
import fetch from 'node-fetch';

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.EMAIL_PASSWORD
  }
});

// Tabla de precios por zona/región de Santiago
const PRICING_ZONES = {
  'Santiago Centro': { base: 50000, porkm: 5000 },
  'Providencia': { base: 55000, porkm: 4800 },
  'Las Condes': { base: 55000, porkm: 4800 },
  'Ñuñoa': { base: 52000, porkm: 5000 },
  'Macul': { base: 50000, porkm: 5200 },
  'Peñalolén': { base: 48000, porkm: 5500 },
  'La Florida': { base: 45000, porkm: 5800 },
  'La Reina': { base: 60000, porkm: 4500 },
  'Vitacura': { base: 65000, porkm: 4200 },
  'San Isidro': { base: 62000, porkm: 4400 },
  'Estación Central': { base: 48000, porkm: 5300 },
  'Quinta Normal': { base: 47000, porkm: 5400 },
  'Recoleta': { base: 49000, porkm: 5100 },
  'San Bernardo': { base: 42000, porkm: 6000 },
  'Puente Alto': { base: 40000, porkm: 6500 },
  'La Cisterna': { base: 45000, porkm: 5700 },
  'Maipu': { base: 43000, porkm: 5900 },
  'Cerrillos': { base: 46000, porkm: 5600 },
};

// Recargos adicionales
const SURCHARGES = {
  noAscensorOrigen: 80000,
  noAscensorDestino: 80000,
  delicado: 120000,
  estacionamientoLejano: 100000,
};

// CACHÉ LOCAL para geolocalizaciones
const geoCache = {};

// Función: Geolocalizar dirección usando Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
  try {
    // Verificar caché primero
    if (geoCache[address]) {
      return geoCache[address];
    }

    // Llamar a Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Chile')}&format=json&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
      geoCache[address] = coords; // Guardar en caché
      return coords;
    }
    return null;
  } catch (error) {
    console.error('Error geolocalizing address:', address, error);
    return null;
  }
}

// Función: Calcular distancia entre dos puntos (Fórmula Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
}

// Extraer zona de una dirección
function extractZone(address) {
  const zones = Object.keys(PRICING_ZONES);
  for (const zone of zones) {
    if (address.toLowerCase().includes(zone.toLowerCase())) {
      return zone;
    }
  }
  return 'Santiago Centro'; // zona por defecto
}

// Calcular precio base CON GEOLOCALIZACIÓN Y DISTANCIA
async function calculateBasePrice(formData) {
  const origenZone = extractZone(formData.origen.direccion);
  const destinoZone = extractZone(formData.destino.direccion);

  const origPrice = PRICING_ZONES[origenZone];
  const destPrice = PRICING_ZONES[destinoZone];

  // Precio base según volumen (por m³)
  const volumePrice = formData.volumenTotal * 25000; // $25.000 por m³

  // Geolocalizar ambas direcciones
  const origenCoords = await geocodeAddress(formData.origen.direccion);
  const destinoCoords = await geocodeAddress(formData.destino.direccion);

  let distancePrice = 0;
  let distance = 0;

  // Si se pudo geolocalizar, calcular distancia real
  if (origenCoords && destinoCoords) {
    distance = calculateDistance(
      origenCoords.lat, origenCoords.lon,
      destinoCoords.lat, destinoCoords.lon
    );
    // Usar promedio de porkm de ambas zonas
    const avgPorkm = (origPrice.porkm + destPrice.porkm) / 2;
    distancePrice = distance * avgPorkm;
  }

  // Precio base (promedio de las dos zonas)
  const zoneBase = (origPrice.base + destPrice.base) / 2;

  let totalPrice = zoneBase + volumePrice + distancePrice;

  // Agregar recargos si aplican
  if (formData.origen.ascensor === 'No hay ascensor' && formData.origen.tipo !== 'Casa') {
    totalPrice += SURCHARGES.noAscensorOrigen;
  }

  if (formData.destino.ascensor === 'No hay ascensor' && formData.destino.tipo !== 'Casa') {
    totalPrice += SURCHARGES.noAscensorDestino;
  }

  if (formData.delicado === 'si') {
    totalPrice += SURCHARGES.delicado;
  }

  if (formData.estacionamiento.origen.includes('más de 40') ||
      formData.estacionamiento.destino.includes('más de 40')) {
    totalPrice += SURCHARGES.estacionamientoLejano;
  }

  return {
    totalPrice: Math.round(totalPrice),
    basePrice: Math.round(zoneBase),
    volumePrice: Math.round(volumePrice),
    distancePrice: Math.round(distancePrice),
    distance: Math.round(distance * 10) / 10, // Distancia redondeada a 1 decimal
    surcharges: {
      noAscensor: (formData.origen.ascensor === 'No hay ascensor' && formData.origen.tipo !== 'Casa' ? SURCHARGES.noAscensorOrigen : 0) +
                   (formData.destino.ascensor === 'No hay ascensor' && formData.destino.tipo !== 'Casa' ? SURCHARGES.noAscensorDestino : 0),
      delicado: formData.delicado === 'si' ? SURCHARGES.delicado : 0,
      estacionamiento: (formData.estacionamiento.origen.includes('más de 40') || formData.estacionamiento.destino.includes('más de 40') ? SURCHARGES.estacionamientoLejano : 0)
    },
    origenZone,
    destinoZone
  };
}

// Generar PDF de cotización
function generatePDF(formData, pricing, quotationId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(24).font('Helvetica-Bold').text('MUEVELOEXPRESS', 40, 40);
      doc.fontSize(10).font('Helvetica').text('Mudanzas en Todo Chile', 40, 65);
      doc.fontSize(8).text('www.mueveloexpress.cl | +56 9 8334 2334', 40, 78);

      // Línea separadora
      doc.moveTo(40, 95).lineTo(555, 95).stroke();

      // Título
      doc.fontSize(16).font('Helvetica-Bold').text('COTIZACIÓN DE MUDANZA', 40, 115);
      doc.fontSize(10).font('Helvetica').text(`ID: ${quotationId}`, 40, 135);

      // Información del cliente
      doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 40, 160);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nombre: ${formData.nombre}`, 40, 180);
      doc.text(`Email: ${formData.email}`, 40, 195);
      doc.text(`Teléfono: +56 ${formData.telefono}`, 40, 210);
      doc.text(`Fecha estimada: ${formData.fecha}`, 40, 225);

      // Detalles de origen y destino
      const detailsY = 250;
      doc.fontSize(11).font('Helvetica-Bold').text('ORIGEN', 40, detailsY);
      doc.fontSize(10).font('Helvetica');
      doc.text(`${formData.origen.tipo} - ${formData.origen.direccion}`, 40, detailsY + 20);
      doc.text(`Piso: ${formData.origen.piso} | Ascensor: ${formData.origen.ascensor}`, 40, detailsY + 35);

      doc.fontSize(11).font('Helvetica-Bold').text('DESTINO', 300, detailsY);
      doc.fontSize(10).font('Helvetica');
      doc.text(`${formData.destino.tipo} - ${formData.destino.direccion}`, 300, detailsY + 20);
      doc.text(`Piso: ${formData.destino.piso} | Ascensor: ${formData.destino.ascensor}`, 300, detailsY + 35);

      // Inventario
      const inventoryY = 330;
      doc.fontSize(11).font('Helvetica-Bold').text('INVENTARIO', 40, inventoryY);
      doc.fontSize(9).font('Helvetica');

      let itemY = inventoryY + 20;
      const items = Object.entries(formData.inventario);

      if (items.length > 0) {
        items.slice(0, 15).forEach(([name, quantity]) => {
          doc.text(`• ${name}: ${quantity}x`, 40, itemY);
          itemY += 15;
        });

        if (items.length > 15) {
          doc.text(`... y ${items.length - 15} items más`, 40, itemY);
          itemY += 15;
        }
      } else {
        doc.text('No hay items especificados', 40, itemY);
        itemY += 15;
      }

      // Resumen
      const summaryY = Math.min(itemY + 20, 530);
      doc.moveTo(40, summaryY).lineTo(555, summaryY).stroke();
      doc.fontSize(10).font('Helvetica');
      doc.text(`Volumen total: ${formData.volumenTotal.toFixed(1)} m³`, 40, summaryY + 15);
      doc.text(`Cantidad de items: ${formData.itemsTotal}`, 300, summaryY + 15);

      // Desglose de precios
      const priceY = summaryY + 50;
      doc.moveTo(40, priceY).lineTo(555, priceY).stroke();
      doc.fontSize(11).font('Helvetica-Bold').text('DESGLOSE DE PRECIOS', 40, priceY + 15);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Precio base: $${pricing.basePrice.toLocaleString('es-CL')}`, 40, priceY + 35);
      doc.text(`Volumen (${formData.volumenTotal.toFixed(1)} m³ × $25.000): $${pricing.volumePrice.toLocaleString('es-CL')}`, 40, priceY + 50);

      if (pricing.distance > 0) {
        doc.text(`Distancia (${pricing.distance} km): $${pricing.distancePrice.toLocaleString('es-CL')}`, 40, priceY + 65);
      }

      let surchargeLine = pricing.distance > 0 ? 80 : 65;
      if (pricing.surcharges.noAscensor > 0) {
        doc.text(`Recargo sin ascensor: $${pricing.surcharges.noAscensor.toLocaleString('es-CL')}`, 40, priceY + surchargeLine);
        surchargeLine += 15;
      }
      if (pricing.surcharges.delicado > 0) {
        doc.text(`Muebles delicados: $${pricing.surcharges.delicado.toLocaleString('es-CL')}`, 40, priceY + surchargeLine);
        surchargeLine += 15;
      }
      if (pricing.surcharges.estacionamiento > 0) {
        doc.text(`Estacionamiento lejano: $${pricing.surcharges.estacionamiento.toLocaleString('es-CL')}`, 40, priceY + surchargeLine);
      }

      // Precio final (en una caja)
      const finalY = priceY + (pricing.surcharges.noAscensor > 0 ? 125 : pricing.surcharges.delicado > 0 ? 110 : pricing.surcharges.estacionamiento > 0 ? 110 : 70);
      doc.rect(40, finalY, 515, 50).stroke();
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('PRECIO TOTAL:', 50, finalY + 10);
      doc.fontSize(18).text(`$${pricing.totalPrice.toLocaleString('es-CL')}`, 50, finalY + 25);

      // Términos
      doc.fontSize(8).font('Helvetica').text(
        'Esta cotización es válida por 7 días. Para confirmar tu mudanza, contáctanos por WhatsApp o email. La cotización incluye traslado, embalaje básico y seguro de traslado.',
        40, 750, { width: 515, align: 'left' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Enviar email con PDF
async function sendEmail(formData, pricing, quotationId, pdfBuffer) {
  const mailOptions = {
    from: 'administracion@mueveloexpress.cl',
    to: formData.email,
    subject: `Tu cotización de mudanza - Mueveloexpress (ID: ${quotationId})`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D32F2F;">¡Hola ${formData.nombre.split(' ')[0]}!</h2>

            <p>Aquí está tu cotización para tu mudanza a <strong>${formData.destino.tipo}</strong>.</p>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #D32F2F; margin-top: 0;">Resumen de tu mudanza</h3>
              <p><strong>Origen:</strong> ${formData.origen.direccion}</p>
              <p><strong>Destino:</strong> ${formData.destino.direccion}</p>
              <p><strong>Volumen:</strong> ${formData.volumenTotal.toFixed(1)} m³ (${formData.itemsTotal} items)</p>
              <p><strong>Fecha estimada:</strong> ${formData.fecha}</p>
            </div>

            <div style="background: #FFF5F5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D32F2F;">
              <h2 style="margin: 0; color: #D32F2F;">$${pricing.totalPrice.toLocaleString('es-CL')}</h2>
              <p style="margin: 10px 0 0 0; font-size: 14px;">Precio total de tu mudanza</p>
            </div>

            <p style="margin-top: 20px;">El archivo PDF adjunto contiene el desglose completo de precios y detalles de tu cotización.</p>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <strong>¿Quieres confirmar tu mudanza?</strong><br>
              <a href="https://wa.me/56983342334?text=Hola%20Mueveloexpress%2C%20quiero%20confirmar%20mi%20mudanza%20con%20ID%20${quotationId}"
                 style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
                Confirmar por WhatsApp
              </a>
            </p>

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              <strong>Mueveloexpress</strong><br>
              📱 +56 9 8334 2334 (WhatsApp)<br>
              🌐 www.mueveloexpress.cl<br>
              <br>
              Esta cotización es válida por 7 días.
            </p>
          </div>
        </body>
      </html>
    `,
    attachments: [
      {
        filename: `cotizacion-${quotationId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return transporter.sendMail(mailOptions);
}

// Función para generar ID único
function generateQuotationId() {
  return randomBytes(4).toString('hex').toUpperCase();
}

// Función principal de procesamiento
export async function processQuotation(formData) {
  try {
    const quotationId = generateQuotationId();

    // Calcular precio
    const pricing = await calculateBasePrice(formData);

    // Generar PDF
    const pdfBuffer = await generatePDF(formData, pricing, quotationId);

    // Enviar email
    await sendEmail(formData, pricing, quotationId, pdfBuffer);

    console.log(`✅ Cotización procesada: ${quotationId} - ${formData.email}`);

    return {
      success: true,
      quotationId,
      totalPrice: pricing.totalPrice,
      email: formData.email
    };
  } catch (error) {
    console.error('Error procesando cotización:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
