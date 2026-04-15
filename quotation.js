import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';

const geoCache = {};

async function geocodeAddress(address) {
  if (geoCache[address]) return geoCache[address];
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Chile')}&format=json&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
      geoCache[address] = coords;
      return coords;
    }
  } catch (error) {
    console.error('Geocoding error for', address, error);
  }
  return null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const zoneConfig = {
  'La Dehesa': { base: 50000, perKm: 1200 },
  'Las Condes': { base: 45000, perKm: 1100 },
  'Vitacura': { base: 48000, perKm: 1150 },
  'La Reina': { base: 42000, perKm: 1000 },
  'Ñuñoa': { base: 40000, perKm: 950 },
  'Providencia': { base: 40000, perKm: 950 },
  'Santiago': { base: 35000, perKm: 850 },
  'Estación Central': { base: 32000, perKm: 800 },
  'San Miguel': { base: 33000, perKm: 820 },
  'La Florida': { base: 38000, perKm: 900 },
  'La Pintana': { base: 36000, perKm: 870 },
  'Puente Alto': { base: 42000, perKm: 1000 },
  'San Bernardo': { base: 40000, perKm: 950 },
  'El Bosque': { base: 34000, perKm: 840 },
  'Maipú': { base: 37000, perKm: 880 },
  'Quilicura': { base: 39000, perKm: 920 },
  'Conchali': { base: 36000, perKm: 870 },
  'Recoleta': { base: 37000, perKm: 880 }
};

function extractZoneFromAddress(address) {
  for (const zone of Object.keys(zoneConfig)) {
    if (address.toLowerCase().includes(zone.toLowerCase())) {
      return zone;
    }
  }
  return 'Santiago';
}

async function calculateBasePrice(origin, destination, volume) {
  const originZone = extractZoneFromAddress(origin);
  const config = zoneConfig[originZone] || zoneConfig['Santiago'];
  
  const zoneBase = config.base || 35000;
  const volumePrice = volume * 25000;
  
  let distancePrice = 0;
  let distanceKm = 0;
  let distanceDetails = '';
  
  try {
    const originCoords = await geocodeAddress(origin);
    const destCoords = await geocodeAddress(destination);
    
    if (originCoords && destCoords) {
      distanceKm = calculateDistance(
        originCoords.lat, originCoords.lon,
        destCoords.lat, destCoords.lon
      );
      distancePrice = distanceKm * config.perKm;
      distanceDetails = `${distanceKm.toFixed(1)} km`;
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
  }
  
  const surcharges = 15000;
  const totalPrice = zoneBase + volumePrice + distancePrice + surcharges;
  
  return {
    base: zoneBase,
    volume: volumePrice,
    distance: distancePrice,
    distanceKm: distanceKm,
    distanceDetails: distanceDetails,
    surcharges: surcharges,
    total: totalPrice,
    zone: originZone
  };
}

async function generateQuotationPDF(quotationData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    
    doc.fontSize(20).text('Cotización de Mudanza', { align: 'center' });
    doc.fontSize(10).text('Mueveloexpress', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text('Detalles de la Mudanza:', { underline: true });
    doc.fontSize(10);
    doc.text(`Origen: ${quotationData.origin}`);
    doc.text(`Destino: ${quotationData.destination}`);
    doc.text(`Volumen: ${quotationData.volume.toFixed(2)} m³`);
    if (quotationData.distanceDetails) {
      doc.text(`Distancia: ${quotationData.distanceDetails}`);
    }
    doc.moveDown();
    
    doc.fontSize(12).text('Desglose de Precios:', { underline: true });
    doc.fontSize(10);
    doc.text(`Base (Zona ${quotationData.zone}): $${quotationData.pricing.base.toLocaleString('es-CL')}`);
    doc.text(`Volumen: $${quotationData.pricing.volume.toLocaleString('es-CL')}`);
    if (quotationData.pricing.distance > 0) {
      doc.text(`Distancia: $${quotationData.pricing.distance.toLocaleString('es-CL')}`);
    }
    doc.text(`Recargos: $${quotationData.pricing.surcharges.toLocaleString('es-CL')}`);
    doc.moveDown();
    
    doc.fontSize(14).text(`TOTAL: $${quotationData.pricing.total.toLocaleString('es-CL')}`, { bold: true });
    
    doc.end();
  });
}

async function sendQuotationEmail(email, quotationData, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
  
  const mailOptions = {
    from: 'administracion@mueveloexpress.cl',
    to: email,
    subject: 'Tu Cotización de Mudanza - Mueveloexpress',
    html: `
      <h2>¡Hola!</h2>
      <p>Adjuntamos tu cotización de mudanza.</p>
      <p><strong>Origen:</strong> ${quotationData.origin}</p>
      <p><strong>Destino:</strong> ${quotationData.destination}</p>
      <p><strong>Total:</strong> $${quotationData.pricing.total.toLocaleString('es-CL')}</p>
      <p>Contáctanos si tienes dudas.</p>
      <p>Saludos,<br>Mueveloexpress</p>
    `,
    attachments: [{
      filename: 'cotizacion.pdf',
      content: pdfBuffer
    }]
  };
  
  return transporter.sendMail(mailOptions);
}

export async function processQuotation(req, res) {
  try {
    const { items, email, originDir, destinoDir, clientName } = req.body;
    
    if (!email || !originDir || !destinoDir) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    let totalVolume = 0;
    if (items && Array.isArray(items)) {
      totalVolume = items.reduce((sum, item) => {
        const itemVolume = (item.quantity || 0) * (item.m3 || 0);
        return sum + itemVolume;
      }, 0);
    }
    
    const pricing = await calculateBasePrice(originDir, destinoDir, totalVolume);
    
    const quotationData = {
      clientName,
      email,
      origin: originDir,
      destination: destinoDir,
      volume: totalVolume,
      distanceDetails: pricing.distanceDetails,
      pricing
    };
    
    const pdfBuffer = await generateQuotationPDF(quotationData);
    await sendQuotationEmail(email, quotationData, pdfBuffer);
    
    res.json({
      success: true,
      message: 'Cotización enviada exitosamente',
      total: pricing.total,
      pricing: pricing
    });
  } catch (error) {
    console.error('Error processing quotation:', error);
    res.status(500).json({ error: 'Error al procesar la cotización' });
  }
}
