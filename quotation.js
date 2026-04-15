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
    volum
