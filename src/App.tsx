import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ============================================================================
   TIPOS E INTERFACES
   ============================================================================ */

type Rol = 'ADMIN' | 'CONSULTA';

interface Usuario {
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
  fecha: string; // ISO
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
    placa: 'IBE4505',
    marcaModelo: 'Volkswagen Virtus',
    tipo: 'Auto',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 18000,
    estado: 'ACTIVO',
  },
  {
    id: 'V-2',
    categoria: 'VEHICULO',
    placa: 'EAU5673',
    marcaModelo: 'KIA SPORTAGE',
    tipo: 'Camioneta',
    conductorCustodio: 'DISPONIBLE / SIN CONDUCTOR',
    circuito: 'ESTADIO',
    kmActual: 502002,
    estado: 'ACTIVO',
  },
];

// Claves de almacenamiento local (persistencia)
const LS_KEYS = {
  circuitos: 'flota_circuitos_v1',
  conductores: 'flota_conductores_v1',
  items: 'flota_items_v1',
  historialKm: 'flota_historial_km_v1',
  usuario: 'flota_usuario_v1',
};

/* ============================================================================
   HOOK: useLocalStorage
   Persiste cualquier estado en localStorage automáticamente.
   ============================================================================ */

function useLocalStorage<T>(key: string, valorInicial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = window.localStorage.getItem(key);
      return guardado ? (JSON.parse(guardado) as T) : valorInicial;
    } catch (error) {
      console.error(`Error leyendo localStorage["${key}"]:`, error);
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(valor));
    } catch (error) {
      console.error(`Error guardando localStorage["${key}"]:`, error);
    }
  }, [key, valor]);

  return [valor, setValor];
}

/* ============================================================================
   HOOK: useNotificacion
   Sistema de notificaciones flash reutilizable.
   ============================================================================ */

function useNotificacion() {
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const mostrarNotificacion = (msg: string) => {
    setNotificacion(msg);
    window.setTimeout(() => setNotificacion(null), 3500);
  };

  return { notificacion, mostrarNotificacion };
}

/* ============================================================================
   HOOK: useConductores
   Encapsula todo el CRUD de conductores.
   ============================================================================ */

function useConductores(mostrarNotificacion: (msg: string) => void) {
  const [conductores, setConductores] = useLocalStorage<Conductor[]>(LS_KEYS.conductores, CONDUCTORES_DEFAULT);
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
      id: `C-${Date.now()}`,
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
    busquedaConductor,
    setBusquedaConductor,
    agregarConductor,
    eliminarConductor,
  };
}

/* ============================================================================
   HOOK: useFlota
   Encapsula el CRUD de vehículos/motocicletas, la edición de kilometraje
   con historial de auditoría, filtros y la carga desde Excel.
   ============================================================================ */

function useFlota(mostrarNotificacion: (msg: string) => void, usuario: Usuario | null) {
  const [items, setItems] = useLocalStorage<ItemFlota[]>(LS_KEYS.items, ITEMS_DEFAULT);
  const [historialKm, setHistorialKm] = useLocalStorage<HistorialKm[]>(LS_KEYS.historialKm, []);

  const [tabActiva, setTabActiva] = useState<'VEHICULO' | 'MOTOCICLETA'>('VEHICULO');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCircuito, setFiltroCircuito] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'DISPONIBLES' | 'ASIGNADOS'>('TODOS');

  const registrarCambioKm = (item: ItemFlota, kmNuevo: number) => {
    const entrada: HistorialKm = {
      id: `H-${Date.now()}`,
      itemId: item.id,
      placa: item.placa,
      fecha: new Date().toISOString(),
      kmAnterior: item.kmActual,
      kmNuevo,
      usuario: usuario?.nombre || 'Usuario desconocido',
    };
    setHistorialKm((prev) => [entrada, ...prev]);
  };

  const actualizarKm = (item: ItemFlota, kmNuevo: number): boolean => {
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

    registrarCambioKm(item, kmNuevo);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, kmActual: kmNuevo } : i)));
    mostrarNotificacion(`✅ Kilometraje de ${item.placa} actualizado a ${kmNuevo.toLocaleString()} km.`);
    return true;
  };

  const historialDe = (itemId: string | number) =>
    historialKm
      .filter((h) => h.itemId === itemId)
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

  const cargarDesdeExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const nuevaLista: ItemFlota[] = [];

        const sheetVeh = workbook.Sheets['VEHICULOS'];
        if (sheetVeh) {
          const rawVeh: any[] = XLSX.utils.sheet_to_json(sheetVeh, { defval: '' });
          rawVeh.forEach((row, idx) => {
            const placa = row['PLACA'] || row['PLACA '] || row['Placa'];
            const marca = row['MARCA'] || row['MARCA '] || row['Marca'] || '';
            const modelo = row['MODELO'] || row['MODELO '] || row['Modelo'] || '';

            if (placa || marca) {
              const asignado = row['ASIGANDO A'] || row['ASIGNADO A'] || row['CIRCUTIO'] || 'ESTADIO';
              const km = row['km actual '] || row['km actual'] || row['KM CAMBIO DE ACEITE'] || 0;

              nuevaLista.push({
                id: `V-${idx + 1}`,
                categoria: 'VEHICULO',
                placa: String(placa || 'SIN PLACA').trim(),
                marcaModelo: `${marca} ${modelo}`.trim() || 'VEHÍCULO',
                tipo: String(row['TIPO'] || row['Tipo'] || 'CAMIONETA').trim(),
                conductorCustodio: String(row['OBSERVACIÓN'] || row['A NOMBRE DE'] || 'DISPONIBLE / SIN CONDUCTOR').trim(),
                circuito: String(asignado).trim() !== '' ? String(asignado).trim() : 'ESTADIO',
                kmActual: Number(km) || 0,
                estado: String(row['MANTENIMIENTO'] || row['OBSERVACIÓN'] || 'ACTIVO').trim(),
                novedad: String(row['NOVEDAD'] || '').trim(),
              });
            }
          });
        }

        const sheetMoto = workbook.Sheets['MOTOCICLETAS'];
        if (sheetMoto) {
          const rawMoto: any[] = XLSX.utils.sheet_to_json(sheetMoto, { defval: '' });
          rawMoto.forEach((row, idx) => {
            const placa = row['PLACA'] || row['PLACA '] || row['Placa'];
            const marca = row['MARCA'] || row['MARCA '] || row['Marca'] || '';
            const modelo = row['MODELO'] || row['MODELO '] || row['Modelo'] || '';

            if (placa || marca) {
              const custodio = row['CUSTODIOS'] || row['Custodios'] || row['CUSTODIO'] || 'DISPONIBLE / SIN CONDUCTOR';
              const km = row['km actual '] || row['km actual'] || row['KM CAMBIO DE ACEITE'] || 0;

              nuevaLista.push({
                id: `M-${idx + 1}`,
                categoria: 'MOTOCICLETA',
                placa: String(placa || 'SIN PLACA').trim(),
                marcaModelo: `${marca} ${modelo}`.trim() || 'MOTOCICLETA',
                tipo: 'MOTOCICLETA',
                conductorCustodio: String(custodio).trim() !== '' ? String(custodio).trim() : 'DISPONIBLE / SIN CONDUCTOR',
                circuito: 'ESTADIO',
                kmActual: Number(km) || 0,
                estado: String(row['CIRCULANDO/\nESTACIONADO'] || row['OBSERVACIÓN'] || 'CIRCULANDO').trim(),
                novedad: String(row['NOVEDAD'] || '').trim(),
              });
            }
          });
        }

        if (nuevaLista.length > 0) {
          setItems(nuevaLista);
          mostrarNotificacion(`📂 Carga exitosa: ${nuevaLista.length} unidades registradas.`);
        }
      } catch (err) {
        console.error(err);
        mostrarNotificacion('❌ Error al procesar el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
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
    cargarDesdeExcel,
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
   ESTILOS COMPARTIDOS (evita repetir objetos inline)
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
   Control de acceso simple por nombre + rol. No es autenticación real de
   backend: sirve para diferenciar quién puede editar y dejar rastro en el
   historial de auditoría.
   ============================================================================ */

function LoginGate({ onIngresar }: { onIngresar: (usuario: Usuario) => void }) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<Rol>('CONSULTA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onIngresar({ nombre: nombre.trim().toUpperCase(), rol });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <form onSubmit={handleSubmit} style={{ ...estilos.tarjeta, width: '100%', maxWidth: '380px' }}>
        <h1 style={{ fontSize: '18px', margin: '0 0 4px 0', color: '#0f172a' }}>🛡️ Control Vehicular</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
          Distrito Ciudad Blanca — Ingresa tu nombre y rol para continuar
        </p>

        <div style={{ marginBottom: '14px' }}>
          <label style={estilos.label}>Nombre de usuario:</label>
          <input
            type="text"
            placeholder="Ej. JUAN PÉREZ"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={estilos.input}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={estilos.label}>Rol de acceso:</label>
          <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} style={estilos.input}>
            <option value="ADMIN">🔑 Administrador (puede editar)</option>
            <option value="CONSULTA">👁️ Solo consulta (solo lectura)</option>
          </select>
        </div>

        <button type="submit" style={{ ...estilos.botonPrimario, width: '100%' }}>
          Ingresar
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
}: {
  moduloActivo: 'FLOTA' | 'CONDUCTORES';
  setModuloActivo: (m: 'FLOTA' | 'CONDUCTORES') => void;
  totalConductores: number;
  usuario: Usuario;
  onCerrarSesion: () => void;
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
   Muestra el historial de cambios de kilometraje de una unidad.
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
   Celda de la tabla con edición inline del kilometraje.
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

  const iniciar = () => {
    setKmTemporal(String(item.kmActual));
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setKmTemporal(String(item.kmActual));
  };

  const guardar = () => {
    const nuevo = Number(kmTemporal);
    onGuardar(item, nuevo);
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
          style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #2563eb', outline: 'none' }}
        />
        <button
          onClick={guardar}
          style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
        >
          ✔
        </button>
        <button
          onClick={cancelar}
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
  onGuardarKm: (item: ItemFlota, kmNuevo: number) => void;
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
  const [usuario, setUsuario] = useLocalStorage<Usuario | null>(LS_KEYS.usuario, null);
  const { notificacion, mostrarNotificacion } = useNotificacion();

  const [circuitos, setCircuitos] = useLocalStorage<string[]>(LS_KEYS.circuitos, CIRCUITOS_DEFAULT);
  const conductoresHook = useConductores(mostrarNotificacion);
  const flota = useFlota(mostrarNotificacion, usuario);

  const [moduloActivo, setModuloActivo] = useState<'FLOTA' | 'CONDUCTORES'>('FLOTA');
  const [itemAReasignar, setItemAReasignar] = useState<ItemFlota | null>(null);
  const [itemHistorial, setItemHistorial] = useState<ItemFlota | null>(null);

  // Si no hay usuario en sesión, mostrar la pantalla de acceso
  if (!usuario) {
    return <LoginGate onIngresar={setUsuario} />;
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

  const handleCargarExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    flota.cargarDesdeExcel(file);
    event.target.value = '';
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
        onCerrarSesion={() => setUsuario(null)}
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

                {puedeEditar && (
                  <>
                    <label
                      htmlFor="excel-upload"
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      📂 Cargar Excel
                    </label>
                    <input id="excel-upload" type="file" accept=".xlsx, .xls" onChange={handleCargarExcel} style={{ display: 'none' }} />
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