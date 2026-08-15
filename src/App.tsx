import React, { useState, useEffect } from 'react';
import { 
  Shield, Car, Bike, Search, Filter, RefreshCw, 
  History, Users, Lock, LogOut, CheckCircle2, AlertCircle, Edit2
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, setDoc, getDocs 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

interface Vehiculo {
  id: string;
  placa: string;
  tipo: string;
  marcaModelo: string;
  custodio: string;
  circuito: string;
  kilometraje: number;
  estado: string;
  esMoto: boolean;
}

interface HistorialCambio {
  id: string;
  vehiculoId: string;
  placa: string;
  fecha: string;
  usuario: string;
  custodioAnterior: string;
  custodioNuevo: string;
  circuitoAnterior: string;
  circuitoNuevo: string;
}

interface Conductor {
  id: string;
  nombre: string;
  rango: string;
  circuito: string;
}

// INVENTARIO DE PLANTA FIJO (106 Registros del Excel)
const INVENTARIO_PLANTA: Omit<Vehiculo, 'docId'>[] = [
  { id: 'VEH-001', placa: 'XEA3059', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-002', placa: 'XEA2986', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-003', placa: 'XEA2981', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-004', placa: 'XEA2988', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-005', placa: 'XEA2982', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-006', placa: 'XEA2984', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-007', placa: 'XEA3139', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-008', placa: 'XEA2983', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-009', placa: 'XEA2987', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-010', placa: 'XEA3101', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-011', placa: 'XEA3136', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-012', placa: 'XEA2985', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-013', placa: 'PEA3047', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-014', placa: 'PEA3052', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-015', placa: 'PEA3049', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-016', placa: 'PEA3048', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-017', placa: 'PEA3051', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-018', placa: 'PEA3050', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-019', placa: 'XEA2218', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-020', placa: 'PEA3163', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-021', placa: 'PEA3266', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-022', placa: 'PEA3263', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-023', placa: 'PEA3264', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-024', placa: 'PEA3267', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-025', placa: 'PEA3182', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-026', placa: 'PEA3265', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-027', placa: 'PEA1121', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-028', placa: 'XEA1804', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-029', placa: 'PEA1122', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-030', placa: 'PEA1116', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-031', placa: 'PEA1118', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-032', placa: 'PEA1120', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-033', placa: 'PEA1117', tipo: 'Camioneta', marcaModelo: 'CHEVROLET D-MAX 3.0 L 4X4', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-034', placa: 'EAU5673', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-035', placa: 'IBE4505', tipo: 'Auto', marcaModelo: 'VOLKSWAGEN VIRTUS', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-036', placa: 'EAU5689', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-037', placa: 'EAU5670', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-038', placa: 'EAU5671', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-039', placa: 'EAU5672', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-040', placa: 'EAU5676', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-041', placa: 'EAU5677', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-042', placa: 'EAU5680', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-043', placa: 'EAU5679', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-044', placa: 'EAU5681', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-045', placa: 'EAU5678', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-046', placa: 'EAU5682', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-047', placa: 'EAU5683', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-048', placa: 'EAU5684', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-049', placa: 'EAU5685', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-050', placa: 'EAU5686', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-051', placa: 'EAU5687', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-052', placa: 'EAU5688', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-053', placa: 'EAU5690', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-054', placa: 'EAU5691', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-055', placa: 'EAU5692', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-056', placa: 'EAU5693', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-057', placa: 'EAU5694', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-058', placa: 'EAU5695', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'VEH-059', placa: 'EAU5696', tipo: 'Camioneta', marcaModelo: 'KIA SPORTAGE', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: false },
  { id: 'MOT-001', placa: 'EA826A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-002', placa: 'EA832A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-003', placa: 'FA198N', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-004', placa: 'FA427E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-005', placa: 'FA421E', tipo: 'Motocicleta', marcaModelo: 'KAWASAKI 650cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-006', placa: 'EA536E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-007', placa: 'EA924P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-008', placa: 'EA537E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-009', placa: 'EA516E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-010', placa: 'EA923P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-011', placa: 'EA837A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-012', placa: 'FA425E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-013', placa: 'EA828A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-014', placa: 'EA829A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-015', placa: 'EA831A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-016', placa: 'EA835A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-017', placa: 'EA830A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-018', placa: 'EA834A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-019', placa: 'FA426E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-020', placa: 'FA428E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-021', placa: 'EA836A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-022', placa: 'EA838A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-023', placa: 'EA839A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-024', placa: 'EA827A', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-025', placa: 'FA424E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-026', placa: 'FA423E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-027', placa: 'FA422E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-028', placa: 'FA197N', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-029', placa: 'FA196N', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-030', placa: 'EA538E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-031', placa: 'EA517E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-032', placa: 'EA515E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-033', placa: 'EA514E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-034', placa: 'EA512E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-035', placa: 'EA513E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-036', placa: 'EA518E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-037', placa: 'EA519E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-038', placa: 'EA520E', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-039', placa: 'EA921P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-040', placa: 'EA922P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-041', placa: 'EA925P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-042', placa: 'EA926P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-043', placa: 'EA927P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-044', placa: 'EA928P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-045', placa: 'EA929P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-046', placa: 'EA930P', tipo: 'Motocicleta', marcaModelo: 'HONDA 250cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true },
  { id: 'MOT-047', placa: 'EA931P', tipo: 'Motocicleta', marcaModelo: 'KAWASAKI 650cc', custodio: 'DISPONIBLE', circuito: 'ESTADIO', kilometraje: 0, estado: 'DISPONIBLE', esMoto: true }
];

export function App() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([
    { id: '1', nombre: 'Subteniente EDWARD MARCELO GOMEZ AGUAS', rango: 'Subteniente', circuito: 'ESTADIO' },
    { id: '2', nombre: 'Sargento KEVIN FLORES', rango: 'Sargento', circuito: 'ESTADIO' },
    { id: '3', nombre: 'Cabo LUIS RUIZ', rango: 'Cabo', circuito: 'ESTADIO' }
  ]);
  const [historial, setHistorial] = useState<HistorialCambio[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [tabActual, setTabActual] = useState<'vehiculos' | 'motos' | 'conductores'>('vehiculos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCircuito, setFiltroCircuito] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  
  const [modalReasignar, setModalReasignar] = useState<Vehiculo | null>(null);
  const [modalKm, setModalKm] = useState<Vehiculo | null>(null);
  const [modalHistorial, setModalHistorial] = useState<Vehiculo | null>(null);
  
  const [nuevoCustodio, setNuevoCustodio] = useState('');
  const [nuevoCircuito, setNuevoCircuito] = useState('');
  const [nuevoKm, setNuevoKm] = useState<number>(0);
  
  const [usuarioActual, setUsuarioActual] = useState('ADMIN');

  // Inicialización y Sincronización en Tiempo Real con Firebase
  useEffect(() => {
    const vehiculosRef = collection(db, 'flota_datos');

    // Verificar si Firebase ya tiene los vehículos cargados, si no, subir el inventario inicial
    getDocs(vehiculosRef).then((snapshot) => {
      if (snapshot.empty) {
        INVENTARIO_PLANTA.forEach(async (item) => {
          await setDoc(doc(db, 'flota_datos', item.id), item);
        });
      }
    });

    // Listener en tiempo real para cambios
    const unsubscribe = onSnapshot(vehiculosRef, (snapshot) => {
      const docsData: Vehiculo[] = [];
      snapshot.forEach((docSnap) => {
        docsData.push({ id: docSnap.id, ...docSnap.data() } as Vehiculo);
      });
      setVehiculos(docsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar Historial en Tiempo Real
  useEffect(() => {
    const historialRef = collection(db, 'flota_historial');
    const unsubscribeHist = onSnapshot(historialRef, (snapshot) => {
      const histData: HistorialCambio[] = [];
      snapshot.forEach((docSnap) => {
        histData.push({ id: docSnap.id, ...docSnap.data() } as HistorialCambio);
      });
      setHistorial(histData);
    });
    return () => unsubscribeHist();
  }, []);

  // Guardar Reasignación de Custodio/Circuito
  const guardarReasignacion = async () => {
    if (!modalReasignar) return;

    const estadoNuevo = nuevoCustodio === 'DISPONIBLE' ? 'DISPONIBLE' : 'ASIGNADO';
    const vehiculoRef = doc(db, 'flota_datos', modalReasignar.id);

    await updateDoc(vehiculoRef, {
      custodio: nuevoCustodio,
      circuito: nuevoCircuito,
      estado: estadoNuevo
    });

    // Guardar registro en el historial
    const nuevoRegistroHist: Omit<HistorialCambio, 'id'> = {
      vehiculoId: modalReasignar.id,
      placa: modalReasignar.placa,
      fecha: new Date().toLocaleString('es-EC'),
      usuario: usuarioActual,
      custodioAnterior: modalReasignar.custodio,
      custodioNuevo: nuevoCustodio,
      circuitoAnterior: modalReasignar.circuito,
      circuitoNuevo: nuevoCircuito
    };

    const historialRef = doc(collection(db, 'flota_historial'));
    await setDoc(historialRef, nuevoRegistroHist);

    setModalReasignar(null);
  };

  // Actualizar Kilometraje
  const guardarKilometraje = async () => {
    if (!modalKm) return;
    const vehiculoRef = doc(db, 'flota_datos', modalKm.id);
    await updateDoc(vehiculoRef, {
      kilometraje: Number(nuevoKm)
    });
    setModalKm(null);
  };

  // Filtrado de Datos
  const listaFiltrada = vehiculos.filter((item) => {
    const esTipoCorrecto = tabActual === 'motos' ? item.esMoto : !item.esMoto;
    const coincideBusqueda = 
      item.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.marcaModelo.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.custodio.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideCircuito = filtroCircuito === 'TODOS' || item.circuito === filtroCircuito;
    const coincideEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado;

    return esTipoCorrecto && coincideBusqueda && coincideCircuito && coincideEstado;
  });

  const totalVehiculos = vehiculos.filter(v => !v.esMoto).length;
  const totalMotos = vehiculos.filter(v => v.esMoto).length;
  const vehiculosAsignados = vehiculos.filter(v => v.estado === 'ASIGNADO' && !v.esMoto).length;
  const vehiculosDisponibles = vehiculos.filter(v => v.estado === 'DISPONIBLE' && !v.esMoto).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Sincronizando inventario de planta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Encabezado Principal */}
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-10 h-10 text-yellow-500" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">POLICÍA NACIONAL DEL ECUADOR</h1>
              <p className="text-xs text-slate-400">Distrito Ciudad Blanca — Control Vehicular (Datos de Planta Fijos)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">{usuarioActual}</span>
            <button 
              onClick={() => setUsuarioActual(usuarioActual === 'ADMIN' ? 'CONSULTA' : 'ADMIN')}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
            >
              Cambiar Rol
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Total Vehículos</p>
              <p className="text-2xl font-black text-blue-600">{totalVehiculos}</p>
            </div>
            <Car className="w-8 h-8 text-blue-500 opacity-20" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Total Motocicletas</p>
              <p className="text-2xl font-black text-emerald-600">{totalMotos}</p>
            </div>
            <Bike className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Vehículos Asignados</p>
              <p className="text-2xl font-black text-amber-600">{vehiculosAsignados}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-amber-500 opacity-20" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Disponibles</p>
              <p className="text-2xl font-black text-indigo-600">{vehiculosDisponibles}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-indigo-500 opacity-20" />
          </div>
        </div>

        {/* Pestañas de Navegación y Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setTabActual('vehiculos')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  tabActual === 'vehiculos' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Vehículos ({totalVehiculos})</span>
              </button>

              <button
                onClick={() => setTabActual('motos')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  tabActual === 'motos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Motocicletas ({totalMotos})</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Placas, marcas y modelos están protegidos como **Datos de Planta Fijos**.</span>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por placa, modelo o custodio..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filtroCircuito}
              onChange={(e) => setFiltroCircuito(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los Circuitos</option>
              <option value="ESTADIO">ESTADIO</option>
              <option value="CENTRO">CENTRO</option>
              <option value="NORTE">NORTE</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="DISPONIBLE">DISPONIBLE</option>
              <option value="ASIGNADO">ASIGNADO</option>
            </select>
          </div>
        </div>

        {/* Tabla de Vehículos / Motocicletas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="p-4 font-bold">N°</th>
                  <th className="p-4 font-bold">Placa / Tipo</th>
                  <th className="p-4 font-bold">Marca y Modelo</th>
                  <th className="p-4 font-bold">Custodio Actual</th>
                  <th className="p-4 font-bold">Circuito</th>
                  <th className="p-4 font-bold">Kilometraje</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listaFiltrada.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-400 font-mono text-xs">{index + 1}</td>
                    <td className="p-4 font-bold text-slate-800">
                      <div>{item.placa}</div>
                      <div className="text-xs text-slate-400 font-normal">{item.tipo}</div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{item.marcaModelo}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.custodio === 'DISPONIBLE' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {item.custodio}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-bold">{item.circuito}</td>
                    <td className="p-4 font-mono font-bold text-blue-600">
                      <div className="flex items-center space-x-2">
                        <span>{item.kilometraje.toLocaleString('es-EC')} km</span>
                        <button 
                          onClick={() => {
                            setModalKm(item);
                            setNuevoKm(item.kilometraje);
                          }}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => {
                            setModalReasignar(item);
                            setNuevoCustodio(item.custodio);
                            setNuevoCircuito(item.circuito);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reasignar</span>
                        </button>

                        <button
                          onClick={() => setModalHistorial(item)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                        >
                          <History className="w-3 h-3" />
                          <span>Historial</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL: Reasignar Custodio y Circuito */}
      {modalReasignar && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <span>Reasignar Vehículo {modalReasignar.placa}</span>
            </h3>

            {/* Campos de Planta Fijos (Bloqueados) */}
            <div className="space-y-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Placa (Fijo)</label>
                <input 
                  type="text" 
                  value={modalReasignar.placa} 
                  disabled 
                  className="w-full bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded border border-slate-300 text-sm cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Modelo (Fijo)</label>
                <input 
                  type="text" 
                  value={modalReasignar.marcaModelo} 
                  disabled 
                  className="w-full bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded border border-slate-300 text-sm cursor-not-allowed" 
                />
              </div>
            </div>

            {/* Campos Editables */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Custodio</label>
                <select
                  value={nuevoCustodio}
                  onChange={(e) => setNuevoCustodio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DISPONIBLE">DISPONIBLE (Sin asignar)</option>
                  {conductores.map((c) => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Circuito / Destino</label>
                <select
                  value={nuevoCircuito}
                  onChange={(e) => setNuevoCircuito(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ESTADIO">ESTADIO</option>
                  <option value="CENTRO">CENTRO</option>
                  <option value="NORTE">NORTE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setModalReasignar(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={guardarReasignacion}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Actualizar Kilometraje */}
      {modalKm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Actualizar Kilometraje ({modalKm.placa})</h3>
            <input
              type="number"
              value={nuevoKm}
              onChange={(e) => setNuevoKm(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-base font-mono mb-4 focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setModalKm(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={guardarKilometraje}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Historial de Cambios */}
      {modalHistorial && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Historial de Reasignaciones ({modalHistorial.placa})</span>
            </h3>

            <div className="max-h-80 overflow-y-auto space-y-3">
              {historial.filter(h => h.vehiculoId === modalHistorial.id).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hay historial registrado para este vehículo.</p>
              ) : (
                historial
                  .filter(h => h.vehiculoId === modalHistorial.id)
                  .map((h) => (
                    <div key={h.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400 font-mono">
                        <span>{h.fecha}</span>
                        <span>Por: {h.usuario}</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Custodio: <span className="text-slate-500">{h.custodioAnterior}</span> $\rightarrow$ <span className="text-emerald-600">{h.custodioNuevo}</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Circuito: <span className="text-slate-500">{h.circuitoAnterior}</span> $\rightarrow$ <span className="text-blue-600">{h.circuitoNuevo}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setModalHistorial(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;