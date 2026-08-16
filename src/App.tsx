import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback
} from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  doc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  setDoc,
  onSnapshot,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';

/* ============================================================================
   CONFIGURACIÓN DE FIREBASE
   ============================================================================ */
const COLECCION_DATOS = 'flota_datos';
const COLECCION_HISTORIAL = 'flota_historial_km'; // subcolección independiente (1 doc por cambio)

/* ============================================================================
   TIPOS E INTERFACES
   ============================================================================ */
type Rol = 'ADMIN' | 'CONSULTA';

interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  rol: Rol;
}

interface Conductor {
  id: string;
  nombre: string;
  rango: string;
  cedula: string;
  telefono: string;
}

interface ItemFlota {
  id: string | number;
  categoria: 'VEHICULO' | 'MOTOCICLETA';
  placa: string;
  marcaModelo: string;
  tipo: string;
  conductorCustodio: string;
  circuito: string;
  kmActual: number;
  estado: string;
  novedad?: string;
}

interface HistorialKm {
  id: string;
  itemId: string | number;
  placa: string;
  fecha: string;
  kmAnterior: number;
  kmNuevo: number;
  usuario: string;
}

/* ============================================================================
   CONSTANTES
   ============================================================================ */
const GRADOS_POLICIALES = [
  'Policía',
  'Cabo Segundo',
  'Cabo Primero',
  'Sargento Segundo',
  'Sargento Primero',
  'Suboficial Segundo',
  'Suboficial Primero',
  'Suboficial Mayor',
  'Subteniente',
  'Teniente',
  'Capitán',
  'Mayor',
];

const CIRCUITOS_DEFAULT: string[] = ['ESTADIO', 'CENTRO', 'NORTE', 'AMBUQUI', 'PRESTADA', 'REMATE'];

const CONDUCTORES_DEFAULT: Conductor[] = [
  { id: 'C-1', nombre: 'EDWARD MARCELO GOMEZ AGUAS', rango: 'Subteniente', cedula: '1723372001', telefono: '0995292738' },
  { id: 'C-2', nombre: 'EDWIN MAURICIO PEREZ MIRANDA', rango: 'Sargento Segundo', cedula: '1804027001', telefono: '0982514125' },
  { id: 'C-3', nombre: 'JONATHAN PATRICIO CALUÑA GARCIA', rango: 'Policía', cedula: '0605311008', telefono: '0998307665' },
];

const ITEMS_DEFAULT: ItemFlota[] = [
  {
    id: 'V-1',
    categoria: 'VEHICULO',
    placa: "XEA3059",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-2',
    categoria: 'VEHICULO',
    placa: "XEA2986",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-3',
    categoria: 'VEHICULO',
    placa: "XEA2981",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-4',
    categoria: 'VEHICULO',
    placa: "XEA2988",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-5',
    categoria: 'VEHICULO',
    placa: "XEA2982",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-6',
    categoria: 'VEHICULO',
    placa: "XEA2984",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-7',
    categoria: 'VEHICULO',
    placa: "XEA3139",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-8',
    categoria: 'VEHICULO',
    placa: "XEA2983",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-9',
    categoria: 'VEHICULO',
    placa: "XEA2987",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-10',
    categoria: 'VEHICULO',
    placa: "XEA3101",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-11',
    categoria: 'VEHICULO',
    placa: "XEA3140",
    marcaModelo: "CHEVROLET D-MAX 3.0 L 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-12',
    categoria: 'VEHICULO',
    placa: "IMA1596",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-13',
    categoria: 'VEHICULO',
    placa: "IMA1580",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-14',
    categoria: 'VEHICULO',
    placa: "IMA1561",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-15',
    categoria: 'VEHICULO',
    placa: "IMA1552",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-16',
    categoria: 'VEHICULO',
    placa: "IMA1588",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-17',
    categoria: 'VEHICULO',
    placa: "IMA1600",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-18',
    categoria: 'VEHICULO',
    placa: "IMA1594",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-19',
    categoria: 'VEHICULO',
    placa: "IMA1569",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-20',
    categoria: 'VEHICULO',
    placa: "IMA1598",
    marcaModelo: "CHEVROLET D-MAX CRDI PREMIER AC 2.5 CD 4X4",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-21',
    categoria: 'VEHICULO',
    placa: "IMA1592",
    marcaModelo: "CHEVROLET D-MAX CRDI HI RIDE AC 2.5L CD 4X2 TM DIESEL",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-22',
    categoria: 'VEHICULO',
    placa: "IMA1568",
    marcaModelo: "CHEVROLET D-MAX CRDI HI RIDE AC 2.5L CD 4X2 TM DIESEL",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-23',
    categoria: 'VEHICULO',
    placa: "S/P",
    marcaModelo: "CHEVROLET NQR 75L CAMION CHASIS CABINADO",
    tipo: "Camión",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-24',
    categoria: 'VEHICULO',
    placa: "IEA1332",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-25',
    categoria: 'VEHICULO',
    placa: "IEA1333",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-26',
    categoria: 'VEHICULO',
    placa: "IEA1329",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-27',
    categoria: 'VEHICULO',
    placa: "IEA1348",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-28',
    categoria: 'VEHICULO',
    placa: "CEA1519",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-29',
    categoria: 'VEHICULO',
    placa: "IEA1330",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-30',
    categoria: 'VEHICULO',
    placa: "CEA1530",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-31',
    categoria: 'VEHICULO',
    placa: "CEA1516",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-32',
    categoria: 'VEHICULO',
    placa: "CEA1494",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-33',
    categoria: 'VEHICULO',
    placa: "CEA1536",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-34',
    categoria: 'VEHICULO',
    placa: "IEA1334",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-35',
    categoria: 'VEHICULO',
    placa: "CEA1538",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-36',
    categoria: 'VEHICULO',
    placa: "CEA1511",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-37',
    categoria: 'VEHICULO',
    placa: "CEA1528",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-38',
    categoria: 'VEHICULO',
    placa: "XEA2634",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-39',
    categoria: 'VEHICULO',
    placa: "XEA3057",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-40',
    categoria: 'VEHICULO',
    placa: "IEA1338",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-41',
    categoria: 'VEHICULO',
    placa: "CEA1510",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-42',
    categoria: 'VEHICULO',
    placa: "CEA1515",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-43',
    categoria: 'VEHICULO',
    placa: "CEA1535",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-44',
    categoria: 'VEHICULO',
    placa: "CEA1498",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-45',
    categoria: 'VEHICULO',
    placa: "CEA1503",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-46',
    categoria: 'VEHICULO',
    placa: "CEA1504",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-47',
    categoria: 'VEHICULO',
    placa: "XEA2985",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-48',
    categoria: 'VEHICULO',
    placa: "IEA1339",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-49',
    categoria: 'VEHICULO',
    placa: "IEA1346",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-50',
    categoria: 'VEHICULO',
    placa: "CEA1531",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-51',
    categoria: 'VEHICULO',
    placa: "IEA1328",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-52',
    categoria: 'VEHICULO',
    placa: "CEA1550",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-53',
    categoria: 'VEHICULO',
    placa: "CEA1520",
    marcaModelo: "KIA CERATO PL AC 1.6 4P 4X2 TM",
    tipo: "Auto",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-54',
    categoria: 'VEHICULO',
    placa: "CEA1517",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-55',
    categoria: 'VEHICULO',
    placa: "CEA1521",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-56',
    categoria: 'VEHICULO',
    placa: "CEA1523",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-57',
    categoria: 'VEHICULO',
    placa: "CEA1522",
    marcaModelo: "KIA SPORTAGE LX DAB AC 2.0 4P 4X2 TM",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-58',
    categoria: 'VEHICULO',
    placa: "IEA1288",
    marcaModelo: "MAZDA BT-50 2,5 DIESEL TURBO",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'V-59',
    categoria: 'VEHICULO',
    placa: "IEA1290",
    marcaModelo: "MAZDA BT-50 2,5 DIESEL TURBO",
    tipo: "Camioneta",
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-1',
    categoria: 'MOTOCICLETA',
    placa: "EA826A",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-2',
    categoria: 'MOTOCICLETA',
    placa: "EA832A",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-3',
    categoria: 'MOTOCICLETA',
    placa: "FA198N",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-4',
    categoria: 'MOTOCICLETA',
    placa: "FA427E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-5',
    categoria: 'MOTOCICLETA',
    placa: "FA421E",
    marcaModelo: "KAWASAKI 650cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-6',
    categoria: 'MOTOCICLETA',
    placa: "EA536E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-7',
    categoria: 'MOTOCICLETA',
    placa: "EA924P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-8',
    categoria: 'MOTOCICLETA',
    placa: "EA537E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-9',
    categoria: 'MOTOCICLETA',
    placa: "EA516E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-10',
    categoria: 'MOTOCICLETA',
    placa: "EA923P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-11',
    categoria: 'MOTOCICLETA',
    placa: "EA922P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-12',
    categoria: 'MOTOCICLETA',
    placa: "EA540E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-13',
    categoria: 'MOTOCICLETA',
    placa: "EA535E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-14',
    categoria: 'MOTOCICLETA',
    placa: "EA894A",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-15',
    categoria: 'MOTOCICLETA',
    placa: "EA539E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-16',
    categoria: 'MOTOCICLETA',
    placa: "FA869A",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-17',
    categoria: 'MOTOCICLETA',
    placa: "EA502E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-18',
    categoria: 'MOTOCICLETA',
    placa: "EA069M",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-19',
    categoria: 'MOTOCICLETA',
    placa: "FA183N",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-20',
    categoria: 'MOTOCICLETA',
    placa: "FA194N",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-21',
    categoria: 'MOTOCICLETA',
    placa: "FA182N",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-22',
    categoria: 'MOTOCICLETA',
    placa: "EA528E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-23',
    categoria: 'MOTOCICLETA',
    placa: "EA520E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-24',
    categoria: 'MOTOCICLETA',
    placa: "EA538E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-25',
    categoria: 'MOTOCICLETA',
    placa: "EA514E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-26',
    categoria: 'MOTOCICLETA',
    placa: "EA513E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-27',
    categoria: 'MOTOCICLETA',
    placa: "EA921P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-28',
    categoria: 'MOTOCICLETA',
    placa: "EA918P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-29',
    categoria: 'MOTOCICLETA',
    placa: "EA938P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-30',
    categoria: 'MOTOCICLETA',
    placa: "EA915P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-31',
    categoria: 'MOTOCICLETA',
    placa: "EA527E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-32',
    categoria: 'MOTOCICLETA',
    placa: "EA524E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-33',
    categoria: 'MOTOCICLETA',
    placa: "EA543E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-34',
    categoria: 'MOTOCICLETA',
    placa: "EA935P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-35',
    categoria: 'MOTOCICLETA',
    placa: "S/P",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-36',
    categoria: 'MOTOCICLETA',
    placa: "EA547E",
    marcaModelo: "HONDA 250cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-37',
    categoria: 'MOTOCICLETA',
    placa: "EA586E",
    marcaModelo: "KAWASAKI 650cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-38',
    categoria: 'MOTOCICLETA',
    placa: "GA702K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-39',
    categoria: 'MOTOCICLETA',
    placa: "GA644K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-40',
    categoria: 'MOTOCICLETA',
    placa: "GA730K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-41',
    categoria: 'MOTOCICLETA',
    placa: "GA678K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-42',
    categoria: 'MOTOCICLETA',
    placa: "GA783K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-43',
    categoria: 'MOTOCICLETA',
    placa: "GA800K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-44',
    categoria: 'MOTOCICLETA',
    placa: "GA808K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-45',
    categoria: 'MOTOCICLETA',
    placa: "GA835K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-46',
    categoria: 'MOTOCICLETA',
    placa: "GA781K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
  {
    id: 'M-47',
    categoria: 'MOTOCICLETA',
    placa: "GE722K",
    marcaModelo: "HONDA 199cc",
    tipo: 'Motocicleta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 0,
    estado: 'ACTIVO',
  },
];

// Claves de documentos en Firestore (dentro de COLECCION_DATOS)
const CLAVES_DOC = {
  circuitos: 'flota_circuitos_v1',
  conductores: 'flota_conductores_v1',
  items: 'flota_items_v1',
};

/* ============================================================================
   HOOK: useNotificacion
   ============================================================================ */
function useNotificacion() {
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const mostrarNotificacion = useCallback((mensaje: string) => {
    setNotificacion(mensaje);
    setTimeout(() => {
      setNotificacion(null);
    }, 3500);
  }, []);

  return { notificacion, mostrarNotificacion };
}

/* ============================================================================
   HOOK: useFirestoreSync
   Guarda un valor completo (array/objeto) en un documento de Firestore y lo
   mantiene sincronizado en tiempo real para todos los usuarios conectados.
   Usa runTransaction para no pisar cambios concurrentes de otros usuarios,
   y revierte el cambio local + notifica si la escritura falla.
   ============================================================================ */
function useFirestoreSync<T>(
  key: string,
  valorInicial: T,
  onError?: (mensaje: string) => void
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [valor, setValorState] = useState<T>(valorInicial);
  const [cargando, setCargando] = useState(true);
  const valorRef = useRef<T>(valorInicial);
  valorRef.current = valor;

  useEffect(() => {
    let desuscribirFirestore: (() => void) | null = null;
    let cancelado = false;

    const esperarAutenticacion = onAuthStateChanged(auth, (firebaseUser) => {
      if (cancelado) return;

      if (!firebaseUser) {
        setCargando(false);
        return;
      }

      const ref = doc(db, COLECCION_DATOS, key);
      if (desuscribirFirestore) {
        desuscribirFirestore();
        desuscribirFirestore = null;
      }

      desuscribirFirestore = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          if (cancelado) return;
          if (snap.exists()) {
            const data = snap.data() as { valor?: T };
            if (data.valor !== undefined) {
              setValorState(data.valor);
              valorRef.current = data.valor;
            }
          } else {
            setValorState(valorInicial);
            valorRef.current = valorInicial;
            setDoc(
              ref,
              { valor: valorInicial },
              { merge: false }
            ).catch((error) => {
              console.error(
                `No se pudo inicializar Firestore[${key}]:`,
                error
              );
              onError?.(`⚠️ No se pudo crear "${key}" en Firebase. Revisa las reglas de seguridad.`);
            });
          }
          setCargando(false);
        },
        (error) => {
          console.error(
            `Error escuchando Firestore[${key}]:`,
            error
          );
          onError?.(`⚠️ Se perdió la conexión en tiempo real con "${key}". Verifica tu red o los permisos.`);
          setCargando(false);
        }
      );
    });

    return () => {
      cancelado = true;
      esperarAutenticacion();
      if (desuscribirFirestore) {
        desuscribirFirestore();
      }
    };
  }, [key]);

  const setValor: React.Dispatch<React.SetStateAction<T>> = (
    accionOValor
  ) => {
    const ref = doc(db, COLECCION_DATOS, key);
    const esFuncion = typeof accionOValor === 'function';
    const valorPrevioConfirmado = valorRef.current; // para poder revertir si falla la escritura
    const optimista = esFuncion
      ? (accionOValor as (prev: T) => T)(valorRef.current)
      : (accionOValor as T);

    valorRef.current = optimista;
    setValorState(optimista);

    if (!auth.currentUser) {
      console.error(
        `No se puede guardar ${key}: no hay usuario autenticado.`
      );
      valorRef.current = valorPrevioConfirmado;
      setValorState(valorPrevioConfirmado);
      onError?.('⚠️ Tu sesión expiró. Inicia sesión nuevamente para guardar cambios.');
      return;
    }

    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const actual = snap.exists()
        ? (snap.data() as { valor?: T }).valor ?? valorInicial
        : valorInicial;
      const siguiente = esFuncion
        ? (accionOValor as (prev: T) => T)(actual)
        : (accionOValor as T);

      tx.set(
        ref,
        { valor: siguiente },
        { merge: false }
      );
      return siguiente;
    })
      .then((guardado) => {
        valorRef.current = guardado;
        setValorState(guardado);
      })
      .catch((error) => {
        console.error(
          `Error guardando Firestore[${key}]:`,
          error
        );
        // Revertimos al último valor confirmado por el servidor para no
        // dejar al usuario creyendo que algo se guardó cuando no fue así.
        valorRef.current = valorPrevioConfirmado;
        setValorState(valorPrevioConfirmado);
        onError?.('⚠️ El cambio no se pudo guardar en Firebase. Verifica tu conexión o permisos e inténtalo de nuevo.');
      });
  };

  return [valor, setValor, cargando];
}

/* ============================================================================
   HOOK: useHistorialKm
   El historial vive en su PROPIA colección (1 documento por cambio de km) en
   lugar de un array gigante dentro de un solo documento. Esto evita el límite
   de 1MB por documento de Firestore y hace que agregar un registro sea una
   escritura pequeña y rápida, no una reescritura de todo el historial.
   ============================================================================ */
function useHistorialKm(onError?: (mensaje: string) => void) {
  const [historial, setHistorial] = useState<HistorialKm[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let desuscribir: (() => void) | null = null;
    let cancelado = false;

    const esperarAutenticacion = onAuthStateChanged(auth, (firebaseUser) => {
      if (cancelado) return;
      if (!firebaseUser) {
        setCargando(false);
        return;
      }

      const q = query(
        collection(db, COLECCION_HISTORIAL),
        orderBy('fecha', 'desc'),
        limit(1000) // suficiente para operación diaria; ajustar si se requiere más
      );

      desuscribir = onSnapshot(
        q,
        (snap) => {
          if (cancelado) return;
          const lista: HistorialKm[] = snap.docs.map((d) => {
            const data = d.data() as Omit<HistorialKm, 'id'>;
            return { id: d.id, ...data };
          });
          setHistorial(lista);
          setCargando(false);
        },
        (error) => {
          console.error('Error escuchando historial de km:', error);
          onError?.('⚠️ No se pudo sincronizar el historial de kilometraje.');
          setCargando(false);
        }
      );
    });

    return () => {
      cancelado = true;
      esperarAutenticacion();
      if (desuscribir) desuscribir();
    };
  }, []);

  const registrarCambioKm = async (
    item: ItemFlota,
    kmNuevo: number,
    nombreUsuario: string
  ) => {
    try {
      await addDoc(collection(db, COLECCION_HISTORIAL), {
        itemId: String(item.id),
        placa: item.placa,
        fecha: new Date().toISOString(),
        kmAnterior: item.kmActual,
        kmNuevo,
        usuario: nombreUsuario,
      });
      return true;
    } catch (error) {
      console.error('Error guardando historial de km:', error);
      onError?.('⚠️ El kilometraje se actualizó, pero el registro de historial no se pudo guardar.');
      return false;
    }
  };

  return { historial, registrarCambioKm, cargando };
}

/* ============================================================================
   HOOK: useConductores
   ============================================================================ */
function useConductores(mostrarNotificacion: (msg: string) => void) {
  const [conductores, setConductores, conductoresCargando] = useFirestoreSync<Conductor[]>(
    CLAVES_DOC.conductores,
    CONDUCTORES_DEFAULT,
    mostrarNotificacion
  );
  const [busquedaConductor, setBusquedaConductor] = useState('');

  const agregarConductor = (datos: Omit<Conductor, 'id'>) => {
    if (!datos.nombre.trim() || !datos.cedula.trim()) {
      mostrarNotificacion('⚠️ Completa el nombre y la cédula del conductor.');
      return false;
    }
    const yaExiste = conductores.some((c) => c.cedula === datos.cedula.trim());
    if (yaExiste) {
      mostrarNotificacion('⚠️ Ya existe un conductor registrado con esa cédula.');
      return false;
    }
    const nuevo: Conductor = {
      id: `C-${crypto.randomUUID()}`,
      nombre: datos.nombre.trim().toUpperCase(),
      rango: datos.rango,
      cedula: datos.cedula.trim(),
      telefono: datos.telefono.trim(),
    };
    setConductores((prev) => [...prev, nuevo]);
    mostrarNotificacion(`✅ Conductor ${nuevo.rango} ${nuevo.nombre} registrado.`);
    return true;
  };

  const eliminarConductor = (id: string, nombre: string) => {
    setConductores((prev) => prev.filter((c) => c.id !== id));
    mostrarNotificacion(`🗑️ Conductor ${nombre} eliminado.`);
  };

  const conductoresFiltrados = useMemo(
    () =>
      conductores.filter((c) =>
        `${c.rango} ${c.nombre} ${c.cedula}`.toLowerCase().includes(busquedaConductor.toLowerCase())
      ),
    [conductores, busquedaConductor]
  );

  return {
    conductores,
    conductoresFiltrados,
    conductoresCargando,
    busquedaConductor,
    setBusquedaConductor,
    agregarConductor,
    eliminarConductor,
  };
}

/* ============================================================================
   HOOK: useFlota
   ============================================================================ */
function useFlota(mostrarNotificacion: (msg: string) => void, usuario: Usuario | null) {
  const [items, setItems, itemsCargando] = useFirestoreSync<ItemFlota[]>(
    CLAVES_DOC.items,
    ITEMS_DEFAULT,
    mostrarNotificacion
  );
  const { historial: historialKm, registrarCambioKm, cargando: historialCargando } = useHistorialKm(mostrarNotificacion);
  const [tabActiva, setTabActiva] = useState<'VEHICULO' | 'MOTOCICLETA'>('VEHICULO');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCircuito, setFiltroCircuito] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'DISPONIBLES' | 'ASIGNADOS'>('TODOS');

  const actualizarKm = async (item: ItemFlota, kmNuevo: number): Promise<boolean> => {
    if (Number.isNaN(kmNuevo) || kmNuevo < 0) {
      mostrarNotificacion('⚠️ Ingresa un kilometraje válido.');
      return false;
    }
    if (kmNuevo < item.kmActual) {
      const confirmar = window.confirm(
        `El nuevo kilometraje (${kmNuevo.toLocaleString()} km) es menor al actual (${item.kmActual.toLocaleString()} km).\n¿Confirmas el cambio de todos modos?`
      );
      if (!confirmar) return false;
    }
    // 1) Guardamos el registro histórico (documento independiente, no bloqueante para el km actual)
    await registrarCambioKm(item, kmNuevo, usuario?.nombre || 'Usuario desconocido');
    // 2) Actualizamos el kilometraje actual en el documento de items (con transacción segura)
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, kmActual: kmNuevo } : i)));
    mostrarNotificacion(`✅ Kilometraje de ${item.placa} actualizado a ${kmNuevo.toLocaleString()} km.`);
    return true;
  };

  const historialDe = (itemId: string | number) =>
    historialKm
      .filter((h) => String(h.itemId) === String(itemId))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const reasignar = (
    item: ItemFlota,
    nombreNuevoConductor: string,
    nuevoCircuito: string
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              conductorCustodio: nombreNuevoConductor,
              circuito: item.categoria === 'VEHICULO' ? nuevoCircuito : i.circuito,
            }
          : i
      )
    );
  };

  const itemsFiltrados = useMemo(() => {
    return items.filter((item) => {
      const coincideCategoria = item.categoria === tabActiva;
      const coincideTexto =
        item.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.marcaModelo.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.conductorCustodio.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCircuito =
        tabActiva === 'MOTOCICLETA' ||
        filtroCircuito === 'TODOS' ||
        item.circuito.toUpperCase() === filtroCircuito.toUpperCase();
      const esDisponible = item.conductorCustodio.includes('DISPONIBLE');
      const coincideEstado =
        filtroEstado === 'TODOS' ||
        (filtroEstado === 'DISPONIBLES' && esDisponible) ||
        (filtroEstado === 'ASIGNADOS' && !esDisponible);
      return coincideCategoria && coincideTexto && coincideCircuito && coincideEstado;
    });
  }, [items, tabActiva, busqueda, filtroCircuito, filtroEstado]);

  const totalVehiculos = items.filter((i) => i.categoria === 'VEHICULO').length;
  const totalMotos = items.filter((i) => i.categoria === 'MOTOCICLETA').length;
  const vehiculosDisponibles = items.filter(
    (i) => i.categoria === 'VEHICULO' && i.conductorCustodio.includes('DISPONIBLE')
  ).length;
  const vehiculosAsignados = totalVehiculos - vehiculosDisponibles;

  return {
    items,
    itemsFiltrados,
    itemsCargando,
    historialCargando,
    tabActiva,
    setTabActiva,
    busqueda,
    setBusqueda,
    filtroCircuito,
    setFiltroCircuito,
    filtroEstado,
    setFiltroEstado,
    actualizarKm,
    historialDe,
    reasignar,
    totalVehiculos,
    totalMotos,
    vehiculosDisponibles,
    vehiculosAsignados,
  };
}

/* ============================================================================
   GENERADOR DE PDF DEL ACTA DE REASIGNACIÓN
   ============================================================================ */
function generarPDFActa(item: ItemFlota, conductor?: Conductor, nuevoCircuito?: string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('POLICÍA NACIONAL DEL ECUADOR', 105, 15, { align: 'center' });
  doc.setFontSize(11);
  doc.text('DISTRITO CIUDAD BLANCA - LOGÍSTICA', 105, 22, { align: 'center' });
  doc.text('ACTA DE ENTREGA - RECEPCIÓN Y REASIGNACIÓN', 105, 29, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC')}`, 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [['PARÁMETRO', 'DETALLE DE LA UNIDAD']],
    body: [
      ['Categoría', String(item.categoria)],
      ['Placa', String(item.placa)],
      ['Marca / Modelo', String(item.marcaModelo)],
      ['Tipo', String(item.tipo)],
      ['Kilometraje Actual', `${item.kmActual} km`],
      ['Circuito Asignado', String(item.categoria === 'VEHICULO' ? (nuevoCircuito || item.circuito) : item.circuito)],
      ['Estado Técnico', String(item.estado)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 25, 44] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: finalY,
    head: [['PARÁMETRO', 'DATOS DEL NUEVO CUSTODIO / CONDUCTOR']],
    body: [
      ['Nombres y Apellidos', conductor?.nombre ? String(conductor.nombre) : 'DISPONIBLE / SIN CONDUCTOR'],
      ['Rango / Grado', conductor?.rango ? String(conductor.rango) : 'N/A'],
      ['Cédula de Identidad', conductor?.cedula ? String(conductor.cedula) : 'N/A'],
      ['Teléfono de Contacto', conductor?.telefono ? String(conductor.telefono) : 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [27, 94, 32] },
  });

  const clausulaY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.text(
    'El nuevo custodio declara recibir el bien antes detallado en las condiciones descritas, comprometiéndose\na velar por el buen uso, mantenimiento y conservación del vehículo público asignado.',
    14,
    clausulaY
  );

  const firmaY = clausulaY + 35;
  doc.line(20, firmaY, 80, firmaY);
  doc.text('ENTREGUE CONFORME\nJefe de Logística / Administrador', 25, firmaY + 5);
  doc.line(130, firmaY, 190, firmaY);
  const textoFirma = conductor ? `${conductor.rango} ${conductor.nombre}` : 'Nuevo Custodio';
  doc.text(`RECIBÍ CONFORME\n${textoFirma}`, 135, firmaY + 5);

  doc.save(`Acta_Reasignacion_${item.placa}.pdf`);
}

/* ============================================================================
   ESTILOS COMPARTIDOS
   ============================================================================ */
const estilos = {
  tarjeta: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
  } as React.CSSProperties,
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  botonPrimario: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  } as React.CSSProperties,
  botonSecundario: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '9px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  } as React.CSSProperties,
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  } as React.CSSProperties,
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
  } as React.CSSProperties,
};

/* ============================================================================
   COMPONENTE: LoginGate
   ============================================================================ */
function LoginGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Correo o contraseña incorrectos.');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos e inténtalo nuevamente.');
      } else {
        setError('No fue posible iniciar sesión. Revisa la configuración de Firebase Authentication.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '16px' }}>
      <form onSubmit={handleSubmit} style={{ ...estilos.tarjeta, width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '20px', margin: '0 0 6px 0', color: '#0f172a' }}>🛡️ Control Vehicular</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
          Distrito Ciudad Blanca — Acceso seguro
        </p>
        <div style={{ marginBottom: '14px' }}>
          <label style={estilos.label}>Correo electrónico:</label>
          <input type="email" autoComplete="username" placeholder="usuario@institucion.gob.ec" value={email} onChange={(e) => setEmail(e.target.value)} style={estilos.input} autoFocus />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={estilos.label}>Contraseña:</label>
          <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={estilos.input} />
        </div>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={cargando} style={{ ...estilos.botonPrimario, width: '100%', opacity: cargando ? 0.7 : 1 }}>
          {cargando ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

/* ============================================================================
   COMPONENTE: Notificacion
   ============================================================================ */
function Notificacion({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        zIndex: 9999,
        fontWeight: 'bold',
        maxWidth: '360px',
      }}
    >
      {mensaje}
    </div>
  );
}

/* ============================================================================
   COMPONENTE: Header
   ============================================================================ */
function Header({
  moduloActivo,
  setModuloActivo,
  totalConductores,
  usuario,
  onCerrarSesion,
  online,
  sincronizando,
}: {
  moduloActivo: 'FLOTA' | 'CONDUCTORES';
  setModuloActivo: (m: 'FLOTA' | 'CONDUCTORES') => void;
  totalConductores: number;
  usuario: Usuario;
  onCerrarSesion: () => void;
  online: boolean;
  sincronizando: boolean;
}) {
  return (
    <header
      style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '20px 24px',
        borderRadius: '12px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          🛡️ POLICÍA NACIONAL DEL ECUADOR
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
          Distrito Ciudad Blanca — Sistema de Control Vehicular y Logística
        </p>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setModuloActivo('FLOTA')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: moduloActivo === 'FLOTA' ? '#eab308' : '#334155',
            color: moduloActivo === 'FLOTA' ? '#0f172a' : '#ffffff',
          }}
        >
          🚘 Control de Flota
        </button>
        <button
          onClick={() => setModuloActivo('CONDUCTORES')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: moduloActivo === 'CONDUCTORES' ? '#eab308' : '#334155',
            color: moduloActivo === 'CONDUCTORES' ? '#0f172a' : '#ffffff',
          }}
        >
          👮 Conductores y Circuitos ({totalConductores})
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: !online ? '#7f1d1d' : sincronizando ? '#78350f' : '#14532d',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
          title={sincronizando ? 'Sincronizando datos con Firebase...' : 'Datos sincronizados con Firebase en tiempo real'}
        >
          {!online ? '🔴 SIN INTERNET' : sincronizando ? '🟡 SINCRONIZANDO...' : '🟢 SINCRONIZADO'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#1e293b',
            padding: '6px 12px',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '12px' }}>
            {usuario.rol === 'ADMIN' ? '🔑' : '👁️'} {usuario.nombre}
          </span>
          <button
            onClick={onCerrarSesion}
            title="Cerrar sesión"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   COMPONENTE: KpiCards
   ============================================================================ */
function KpiCards({
  totalVehiculos,
  vehiculosAsignados,
  vehiculosDisponibles,
  totalMotos,
}: {
  totalVehiculos: number;
  vehiculosAsignados: number;
  vehiculosDisponibles: number;
  totalMotos: number;
}) {
  const tarjetas = [
    { titulo: 'TOTAL VEHÍCULOS', valor: totalVehiculos, color: '#2563eb' },
    { titulo: 'VEHÍCULOS ASIGNADOS', valor: vehiculosAsignados, color: '#16a34a' },
    { titulo: 'VEHÍCULOS DISPONIBLES', valor: vehiculosDisponibles, color: '#ca8a04' },
    { titulo: 'TOTAL MOTOCICLETAS', valor: totalMotos, color: '#0284c7' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {tarjetas.map((t) => (
        <div
          key={t.titulo}
          style={{
            backgroundColor: '#ffffff',
            padding: '18px',
            borderRadius: '12px',
            borderLeft: `5px solid ${t.color}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{t.titulo}</span>
          <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: t.color }}>{t.valor}</h2>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   COMPONENTE: HistorialModal
   ============================================================================ */
function HistorialModal({
  item,
  historial,
  onCerrar,
}: {
  item: ItemFlota;
  historial: HistorialKm[];
  onCerrar: () => void;
}) {
  return (
    <div style={estilos.modalOverlay} onClick={onCerrar}>
      <div style={estilos.modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>🕒 Historial de kilometraje</h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '-8px' }}>
          {item.placa} — {item.marcaModelo}
        </p>
        {historial.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aún no hay cambios registrados para esta unidad.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {historial.map((h) => (
              <div
                key={h.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span style={{ color: '#2563eb' }}>
                    {h.kmAnterior.toLocaleString()} km → {h.kmNuevo.toLocaleString()} km
                  </span>
                  <span style={{ color: h.kmNuevo < h.kmAnterior ? '#dc2626' : '#16a34a' }}>
                    {h.kmNuevo < h.kmAnterior ? '↓ disminuyó' : '↑ aumentó'}
                  </span>
                </div>
                <div style={{ color: '#64748b', marginTop: '4px' }}>
                  {new Date(h.fecha).toLocaleString('es-EC')} · por {h.usuario}
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onCerrar} style={{ ...estilos.botonSecundario, width: '100%', marginTop: '18px' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENTE: ReasignarModal
   ============================================================================ */
function ReasignarModal({
  item,
  conductores,
  circuitos,
  onConfirmar,
  onCerrar,
}: {
  item: ItemFlota;
  conductores: Conductor[];
  circuitos: string[];
  onConfirmar: (conductorId: string, nuevoCircuito: string) => void;
  onCerrar: () => void;
}) {
  const [conductorSeleccionadoId, setConductorSeleccionadoId] = useState('');
  const [nuevoCircuito, setNuevoCircuito] = useState(item.circuito);

  return (
    <div style={estilos.modalOverlay} onClick={onCerrar}>
      <div style={estilos.modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, color: '#0f172a' }}>🔄 Reasignar unidad</h3>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '-8px' }}>
          {item.placa} — {item.marcaModelo}
        </p>
        <div style={{ marginBottom: '14px' }}>
          <label style={estilos.label}>Nuevo custodio / conductor:</label>
          <select
            value={conductorSeleccionadoId}
            onChange={(e) => setConductorSeleccionadoId(e.target.value)}
            style={estilos.input}
          >
            <option value="">DISPONIBLE / SIN CONDUCTOR</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rango} {c.nombre}
              </option>
            ))}
          </select>
        </div>
        {item.categoria === 'VEHICULO' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={estilos.label}>Circuito:</label>
            <select value={nuevoCircuito} onChange={(e) => setNuevoCircuito(e.target.value)} style={estilos.input}>
              {circuitos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onConfirmar(conductorSeleccionadoId, nuevoCircuito)}
            style={{ ...estilos.botonPrimario, flex: 1 }}
          >
            ✔ Confirmar y generar acta
          </button>
          <button onClick={onCerrar} style={{ ...estilos.botonSecundario, flex: 1 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENTE: FilaKilometraje
   ============================================================================ */
function FilaKilometraje({
  item,
  puedeEditar,
  onGuardar,
}: {
  item: ItemFlota;
  puedeEditar: boolean;
  onGuardar: (item: ItemFlota, kmNuevo: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [kmTemporal, setKmTemporal] = useState(String(item.kmActual));
  const [guardando, setGuardando] = useState(false);

  const iniciar = () => {
    setKmTemporal(String(item.kmActual));
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setKmTemporal(String(item.kmActual));
  };

  const guardar = async () => {
    const nuevo = Number(kmTemporal);
    setGuardando(true);
    await onGuardar(item, nuevo);
    setGuardando(false);
    setEditando(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') guardar();
    if (e.key === 'Escape') cancelar();
  };

  if (editando) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          type="number"
          autoFocus
          min={0}
          value={kmTemporal}
          onChange={(e) => setKmTemporal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={guardando}
          style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #2563eb', outline: 'none' }}
        />
        <button
          onClick={guardar}
          disabled={guardando}
          style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', opacity: guardando ? 0.6 : 1 }}
        >
          {guardando ? '…' : '✔'}
        </button>
        <button
          onClick={cancelar}
          disabled={guardando}
          style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>{item.kmActual.toLocaleString()} km</span>
      {puedeEditar && (
        <button
          onClick={iniciar}
          title="Editar kilometraje"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}
        >
          ✏️
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   COMPONENTE: FlotaTable
   ============================================================================ */
function FlotaTable({
  itemsFiltrados,
  puedeEditar,
  onGuardarKm,
  onAbrirHistorial,
  onAbrirReasignar,
}: {
  itemsFiltrados: ItemFlota[];
  puedeEditar: boolean;
  onGuardarKm: (item: ItemFlota, kmNuevo: number) => Promise<boolean>;
  onAbrirHistorial: (item: ItemFlota) => void;
  onAbrirReasignar: (item: ItemFlota) => void;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '13px' }}>
            <th style={{ padding: '12px' }}>N°</th>
            <th style={{ padding: '12px' }}>PLACA / TIPO</th>
            <th style={{ padding: '12px' }}>MARCA Y MODELO</th>
            <th style={{ padding: '12px' }}>CUSTODIO ACTUAL</th>
            <th style={{ padding: '12px' }}>CIRCUITO</th>
            <th style={{ padding: '12px' }}>KILOMETRAJE</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {itemsFiltrados.length > 0 ? (
            itemsFiltrados.map((item, index) => {
              const esDisponible = item.conductorCustodio.includes('DISPONIBLE');
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 12px', color: '#94a3b8', fontSize: '13px' }}>{index + 1}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.placa}</span>
                    <br />
                    <small style={{ color: '#64748b' }}>{item.tipo}</small>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#334155' }}>{item.marcaModelo}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span
                      style={{
                        backgroundColor: esDisponible ? '#fef3c7' : '#dcfce7',
                        color: esDisponible ? '#b45309' : '#15803d',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                      }}
                    >
                      {esDisponible ? '🟡 DISPONIBLE' : `🟢 ${item.conductorCustodio}`}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#1e293b' }}>{item.circuito}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#2563eb' }}>
                    <FilaKilometraje item={item} puedeEditar={puedeEditar} onGuardar={onGuardarKm} />
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {puedeEditar && (
                        <button
                          onClick={() => onAbrirReasignar(item)}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '12px',
                          }}
                        >
                          🔄 Reasignar
                        </button>
                      )}
                      <button
                        onClick={() => onAbrirHistorial(item)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        🕒 Historial
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                No se encontraron unidades con los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
   COMPONENTE: ConductoresPanel
   ============================================================================ */
function ConductoresPanel({
  puedeEditar,
  conductoresFiltrados,
  busquedaConductor,
  setBusquedaConductor,
  onAgregar,
  onEliminar,
}: {
  puedeEditar: boolean;
  conductoresFiltrados: Conductor[];
  busquedaConductor: string;
  setBusquedaConductor: (v: string) => void;
  onAgregar: (datos: Omit<Conductor, 'id'>) => boolean;
  onEliminar: (id: string, nombre: string) => void;
}) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRango, setNuevoRango] = useState('Policía');
  const [nuevaCedula, setNuevaCedula] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onAgregar({ nombre: nuevoNombre, rango: nuevoRango, cedula: nuevaCedula, telefono: nuevoTelefono });
    if (ok) {
      setNuevoNombre('');
      setNuevaCedula('');
      setNuevoTelefono('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {puedeEditar && (
        <div style={estilos.tarjeta}>
          <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>➕ Registrar Nuevo Conductor</h3>
          <form onSubmit={handleGuardar}>
            <div style={{ marginBottom: '12px' }}>
              <label style={estilos.label}>Rango / Grado:</label>
              <select value={nuevoRango} onChange={(e) => setNuevoRango(e.target.value)} style={estilos.input}>
                {GRADOS_POLICIALES.map((grado) => (
                  <option key={grado} value={grado}>
                    {grado}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={estilos.label}>Nombres y Apellidos:</label>
              <input
                type="text"
                placeholder="Ej. JUAN CARLOS PÉREZ"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                style={estilos.input}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={estilos.label}>Cédula de Identidad:</label>
              <input
                type="text"
                placeholder="Ej. 1002630123"
                value={nuevaCedula}
                onChange={(e) => setNuevaCedula(e.target.value)}
                style={estilos.input}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={estilos.label}>Teléfono de Contacto:</label>
              <input
                type="text"
                placeholder="Ej. 0998307665"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                style={estilos.input}
              />
            </div>
            <button type="submit" style={{ ...estilos.botonPrimario, width: '100%', backgroundColor: '#16a34a' }}>
              💾 Guardar Conductor
            </button>
          </form>
        </div>
      )}
      <div style={estilos.tarjeta}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>👮 Lista de Conductores</h3>
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={busquedaConductor}
            onChange={(e) => setBusquedaConductor(e.target.value)}
            style={{ ...estilos.input, width: '200px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {conductoresFiltrados.length > 0 ? (
            conductoresFiltrados.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>
                    {c.rango} {c.nombre}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    CI: {c.cedula} · Tel: {c.telefono || 'N/A'}
                  </div>
                </div>
                {puedeEditar && (
                  <button
                    onClick={() => onEliminar(c.id, c.nombre)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No hay conductores registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENTE: CircuitosPanel
   ============================================================================ */
function CircuitosPanel({
  puedeEditar,
  circuitos,
  onAgregar,
  onEliminar,
}: {
  puedeEditar: boolean;
  circuitos: string[];
  onAgregar: (nombre: string) => void;
  onEliminar: (nombre: string) => void;
}) {
  const [nuevoCircuitoInput, setNuevoCircuitoInput] = useState('');

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCircuitoInput.trim()) return;
    onAgregar(nuevoCircuitoInput);
    setNuevoCircuitoInput('');
  };

  return (
    <div style={estilos.tarjeta}>
      <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>🏢 Gestión de Circuitos</h3>
      {puedeEditar && (
        <form onSubmit={handleAgregar} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Nombre del nuevo circuito"
            value={nuevoCircuitoInput}
            onChange={(e) => setNuevoCircuitoInput(e.target.value)}
            style={{ ...estilos.input, flex: 1 }}
          />
          <button type="submit" style={estilos.botonPrimario}>
            ➕ Agregar
          </button>
        </form>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {circuitos.map((c) => (
          <div
            key={c}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 14px',
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>{c}</span>
            {puedeEditar && (
              <button
                onClick={() => onEliminar(c)}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   COMPONENTE PRINCIPAL: App
   ============================================================================ */
export function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [authCargando, setAuthCargando] = useState(true);
  const [authError, setAuthError] = useState('');
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  const { notificacion, mostrarNotificacion } = useNotificacion();
  const [circuitos, setCircuitos, circuitosCargando] = useFirestoreSync<string[]>(
    CLAVES_DOC.circuitos,
    CIRCUITOS_DEFAULT,
    mostrarNotificacion
  );
  const conductoresHook = useConductores(mostrarNotificacion);
  const flota = useFlota(mostrarNotificacion, usuario);

  const [moduloActivo, setModuloActivo] = useState<'FLOTA' | 'CONDUCTORES'>('FLOTA');
  const [itemAReasignar, setItemAReasignar] = useState<ItemFlota | null>(null);
  const [itemHistorial, setItemHistorial] = useState<ItemFlota | null>(null);

  // Se considera "sincronizando" mientras cualquiera de las 4 fuentes de datos
  // (circuitos, conductores, vehículos/motos, historial) aún no ha recibido
  // su primera respuesta de Firestore.
  const sincronizando =
    circuitosCargando || conductoresHook.conductoresCargando || flota.itemsCargando || flota.historialCargando;

  useEffect(() => {
    const quitar = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setAuthError('');
      if (!firebaseUser) {
        setUsuario(null);
        setAuthCargando(false);
        return;
      }
      try {
        const perfilSnap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
        if (!perfilSnap.exists()) {
          await signOut(auth);
          setAuthError('Tu usuario está autenticado, pero no tiene un perfil autorizado en Firestore (colección "usuarios").');
          setUsuario(null);
          return;
        }
        const perfil = perfilSnap.data() as Partial<Usuario>;
        if (perfil.rol !== 'ADMIN' && perfil.rol !== 'CONSULTA') {
          await signOut(auth);
          setAuthError('El perfil no tiene un rol válido (debe ser ADMIN o CONSULTA).');
          setUsuario(null);
          return;
        }
        setUsuario({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          nombre: String(perfil.nombre || firebaseUser.email || 'USUARIO').toUpperCase(),
          rol: perfil.rol,
        });
      } catch (error) {
        console.error('Error cargando perfil de usuario:', error);
        setAuthError('No se pudo cargar tu perfil de acceso. Revisa las reglas de seguridad de Firestore.');
        setUsuario(null);
      } finally {
        setAuthCargando(false);
      }
    });

    const actualizarConexion = () => setOnline(navigator.onLine);
    window.addEventListener('online', actualizarConexion);
    window.addEventListener('offline', actualizarConexion);

    return () => {
      quitar();
      window.removeEventListener('online', actualizarConexion);
      window.removeEventListener('offline', actualizarConexion);
    };
  }, []);

  if (authCargando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        Verificando sesión y conexión con la base de datos...
      </div>
    );
  }

  if (!usuario) {
    return (
      <>
        {authError && (
          <div style={{ position: 'fixed', top: 16, left: 16, right: 16, zIndex: 10000, backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }}>
            {authError}
          </div>
        )}
        <LoginGate />
      </>
    );
  }

  const puedeEditar = usuario.rol === 'ADMIN';

  const handleAgregarCircuito = (nombreInput: string) => {
    const nombreLimpio = nombreInput.trim().toUpperCase();
    if (circuitos.includes(nombreLimpio)) {
      mostrarNotificacion('⚠️ Este circuito ya existe.');
      return;
    }
    setCircuitos((prev) => [...prev, nombreLimpio]);
    mostrarNotificacion(`✅ Circuito "${nombreLimpio}" creado exitosamente.`);
  };

  const handleEliminarCircuito = (circuito: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el circuito "${circuito}"?`)) {
      setCircuitos((prev) => prev.filter((c) => c !== circuito));
      if (flota.filtroCircuito === circuito) {
        flota.setFiltroCircuito('TODOS');
      }
      mostrarNotificacion(`🗑️ Circuito "${circuito}" eliminado.`);
    }
  };

  const handleEliminarConductor = (id: string, nombre: string) => {
    if (window.confirm(`¿Está seguro de eliminar al conductor ${nombre}?`)) {
      conductoresHook.eliminarConductor(id, nombre);
    }
  };

  const handleConfirmarReasignacion = (conductorId: string, nuevoCircuito: string) => {
    if (!itemAReasignar) return;
    const conductorEncontrado = conductoresHook.conductores.find((c) => String(c.id) === String(conductorId));
    const nombreNuevoConductor = conductorEncontrado
      ? `${conductorEncontrado.rango} ${conductorEncontrado.nombre}`
      : 'DISPONIBLE / SIN CONDUCTOR';
    flota.reasignar(itemAReasignar, nombreNuevoConductor, nuevoCircuito);
    generarPDFActa(itemAReasignar, conductorEncontrado, nuevoCircuito);
    setItemAReasignar(null);
    mostrarNotificacion('📄 Reasignado y Acta en PDF generada.');
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' }}>
      <Notificacion mensaje={notificacion} />
      <Header
        moduloActivo={moduloActivo}
        setModuloActivo={setModuloActivo}
        totalConductores={conductoresHook.conductores.length}
        usuario={usuario}
        onCerrarSesion={() => signOut(auth)}
        online={online}
        sincronizando={sincronizando}
      />
      {/* MÓDULO 1: FLOTA VEHICULAR */}
      {moduloActivo === 'FLOTA' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <KpiCards
            totalVehiculos={flota.totalVehiculos}
            vehiculosAsignados={flota.vehiculosAsignados}
            vehiculosDisponibles={flota.vehiculosDisponibles}
            totalMotos={flota.totalMotos}
          />
          <div style={estilos.tarjeta}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => flota.setTabActiva('VEHICULO')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: flota.tabActiva === 'VEHICULO' ? '#ffffff' : 'transparent',
                    color: flota.tabActiva === 'VEHICULO' ? '#0f172a' : '#64748b',
                    boxShadow: flota.tabActiva === 'VEHICULO' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🚗 Vehículos ({flota.totalVehiculos})
                </button>
                <button
                  onClick={() => flota.setTabActiva('MOTOCICLETA')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: flota.tabActiva === 'MOTOCICLETA' ? '#ffffff' : 'transparent',
                    color: flota.tabActiva === 'MOTOCICLETA' ? '#0f172a' : '#64748b',
                    boxShadow: flota.tabActiva === 'MOTOCICLETA' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🏍️ Motocicletas ({flota.totalMotos})
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar placa, modelo o custodio..."
                  value={flota.busqueda}
                  onChange={(e) => flota.setBusqueda(e.target.value)}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '260px', outline: 'none' }}
                />
                {flota.tabActiva === 'VEHICULO' && (
                  <>
                    <select
                      value={flota.filtroCircuito}
                      onChange={(e) => flota.setFiltroCircuito(e.target.value)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="TODOS">🏢 Todos los Circuitos</option>
                      {circuitos.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={flota.filtroEstado}
                      onChange={(e) => flota.setFiltroEstado(e.target.value as any)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="TODOS">📌 Todos los Estados</option>
                      <option value="DISPONIBLES">🟡 Solo Disponibles</option>
                      <option value="ASIGNADOS">🟢 Solo Asignados</option>
                    </select>
                  </>
                )}
              </div>
            </div>
            <FlotaTable
              itemsFiltrados={flota.itemsFiltrados}
              puedeEditar={puedeEditar}
              onGuardarKm={flota.actualizarKm}
              onAbrirHistorial={setItemHistorial}
              onAbrirReasignar={setItemAReasignar}
            />
          </div>
        </div>
      )}
      {/* MÓDULO 2: CONDUCTORES Y CIRCUITOS */}
      {moduloActivo === 'CONDUCTORES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          <ConductoresPanel
            puedeEditar={puedeEditar}
            conductoresFiltrados={conductoresHook.conductoresFiltrados}
            busquedaConductor={conductoresHook.busquedaConductor}
            setBusquedaConductor={conductoresHook.setBusquedaConductor}
            onAgregar={conductoresHook.agregarConductor}
            onEliminar={handleEliminarConductor}
          />
          <CircuitosPanel
            puedeEditar={puedeEditar}
            circuitos={circuitos}
            onAgregar={handleAgregarCircuito}
            onEliminar={handleEliminarCircuito}
          />
        </div>
      )}
      {/* MODALES */}
      {itemAReasignar && (
        <ReasignarModal
          item={itemAReasignar}
          conductores={conductoresHook.conductores}
          circuitos={circuitos}
          onConfirmar={handleConfirmarReasignacion}
          onCerrar={() => setItemAReasignar(null)}
        />
      )}
      {itemHistorial && (
        <HistorialModal
          item={itemHistorial}
          historial={flota.historialDe(itemHistorial.id)}
          onCerrar={() => setItemHistorial(null)}
        />
      )}
    </div>
  );
}

export default App;