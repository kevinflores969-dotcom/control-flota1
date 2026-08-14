import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaz de Conductores
interface Conductor {
  id: string;
  nombre: string;
  rango: string;
  cedula: string;
  telefono: string;
}

// Interfaz de Vehículos/Motocicletas
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

export function App() {
  const gradosPoliciales = [
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

  // ESTADO DE CIRCUITOS
  const [circuitos, setCircuitos] = useState<string[]>([
    'ESTADIO',
    'CENTRO',
    'NORTE',
    'AMBUQUI',
    'PRESTADA',
    'REMATE',
  ]);
  const [nuevoCircuitoInput, setNuevoCircuitoInput] = useState('');

  // ESTADO DE CONDUCTORES
  const [conductores, setConductores] = useState<Conductor[]>([
    { id: 'C-1', nombre: 'EDWARD MARCELO GOMEZ AGUAS', rango: 'Subteniente', cedula: '1723372001', telefono: '0995292738' },
    { id: 'C-2', nombre: 'EDWIN MAURICIO PEREZ MIRANDA', rango: 'Sargento Segundo', cedula: '1804027001', telefono: '0982514125' },
    { id: 'C-3', nombre: 'JONATHAN PATRICIO CALUÑA GARCIA', rango: 'Policía', cedula: '0605311008', telefono: '0998307665' },
  ]);

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRango, setNuevoRango] = useState('Policía');
  const [nuevaCedula, setNuevaCedula] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [busquedaConductor, setBusquedaConductor] = useState('');

  // ESTADO DE FLOTA
  const [items, setItems] = useState<ItemFlota[]>([
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
  ]);

  // CONTROLES DE INTERFAZ
  const [moduloActivo, setModuloActivo] = useState<'FLOTA' | 'CONDUCTORES'>('FLOTA');
  const [tabActiva, setTabActiva] = useState<'VEHICULO' | 'MOTOCICLETA'>('VEHICULO');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCircuito, setFiltroCircuito] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'DISPONIBLES' | 'ASIGNADOS'>('TODOS');

  // MODAL DE REASIGNACIÓN
  const [itemAReasignar, setItemAReasignar] = useState<ItemFlota | null>(null);
  const [conductorSeleccionadoId, setConductorSeleccionadoId] = useState('');
  const [nuevoCircuitoReasignado, setNuevoCircuitoReasignado] = useState('ESTADIO');

  // NOTIFICACIÓN FLASH
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const mostrarNotificacion = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 3500);
  };

  // GESTIÓN DE CIRCUITOS
  const handleAgregarCircuito = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nuevoCircuitoInput.trim().toUpperCase();
    if (!nombreLimpio) return;

    if (circuitos.includes(nombreLimpio)) {
      mostrarNotificacion('⚠️ Este circuito ya existe.');
      return;
    }

    setCircuitos([...circuitos, nombreLimpio]);
    setNuevoCircuitoInput('');
    mostrarNotificacion(`✅ Circuito "${nombreLimpio}" creado exitosamente.`);
  };

  const handleEliminarCircuito = (circuitoAEliminar: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el circuito "${circuitoAEliminar}"?`)) {
      setCircuitos(circuitos.filter((c) => c !== circuitoAEliminar));
      if (filtroCircuito === circuitoAEliminar) {
        setFiltroCircuito('TODOS');
      }
      mostrarNotificacion(`🗑️ Circuito "${circuitoAEliminar}" eliminado.`);
    }
  };

  // REGISTRO Y ELIMINACIÓN DE CONDUCTORES
  const handleGuardarConductor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevaCedula) {
      mostrarNotificacion('⚠️ Completa el nombre y la cédula del conductor.');
      return;
    }

    const nuevo: Conductor = {
      id: `C-${Date.now()}`,
      nombre: nuevoNombre.toUpperCase(),
      rango: nuevoRango,
      cedula: nuevaCedula,
      telefono: nuevoTelefono,
    };

    setConductores([...conductores, nuevo]);
    setNuevoNombre('');
    setNuevaCedula('');
    setNuevoTelefono('');
    mostrarNotificacion(`✅ Conductor ${nuevo.rango} ${nuevo.nombre} registrado.`);
  };

  const handleEliminarConductor = (id: string, nombre: string) => {
    if (window.confirm(`¿Está seguro de eliminar al conductor ${nombre}?`)) {
      setConductores(conductores.filter((c) => c.id !== id));
      mostrarNotificacion(`🗑️ Conductor ${nombre} eliminado.`);
    }
  };

  // CARGA EXCEL
  const handleCargarExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    event.target.value = '';
  };

  // REASIGNACIÓN Y PDF
  const handleConfirmarReasignacion = () => {
    if (!itemAReasignar) return;

    const conductorEncontrado = conductores.find(
      (c) => String(c.id).trim() === String(conductorSeleccionadoId).trim()
    );

    const nombreNuevoConductor = conductorEncontrado
      ? `${conductorEncontrado.rango} ${conductorEncontrado.nombre}`
      : 'DISPONIBLE / SIN CONDUCTOR';

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemAReasignar.id
          ? {
              ...i,
              conductorCustodio: nombreNuevoConductor,
              circuito: itemAReasignar.categoria === 'VEHICULO' ? nuevoCircuitoReasignado : i.circuito,
            }
          : i
      )
    );

    generarPDFActa(itemAReasignar, conductorEncontrado, nuevoCircuitoReasignado);
    setItemAReasignar(null);
    setConductorSeleccionadoId('');
    mostrarNotificacion('📄 Reasignado y Acta en PDF generada.');
  };

  const generarPDFActa = (item: ItemFlota, conductor?: Conductor, nuevoCircuito?: string) => {
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
  };

  // FILTRADO DINÁMICO DE FLOTA
  const itemsFiltrados = items.filter((item) => {
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

  const conductoresFiltrados = conductores.filter((c) =>
    `${c.rango} ${c.nombre} ${c.cedula}`.toLowerCase().includes(busquedaConductor.toLowerCase())
  );

  // MÉTRICAS KPI
  const totalVehiculos = items.filter((i) => i.categoria === 'VEHICULO').length;
  const totalMotos = items.filter((i) => i.categoria === 'MOTOCICLETA').length;
  const vehiculosDisponibles = items.filter((i) => i.categoria === 'VEHICULO' && i.conductorCustodio.includes('DISPONIBLE')).length;
  const vehiculosAsignados = totalVehiculos - vehiculosDisponibles;

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* NOTIFICACIÓN FLASH */}
      {notificacion && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', zIndex: 9999, fontWeight: 'bold' }}>
          {notificacion}
        </div>
      )}

      {/* HEADER INSTITUCIONAL */}
      <header style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '20px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px' }}>🛡️ POLICÍA NACIONAL DEL ECUADOR</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Distrito Ciudad Blanca — Sistema de Control Vehicular y Logistics</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setModuloActivo('FLOTA')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
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
              transition: 'all 0.2s',
              backgroundColor: moduloActivo === 'CONDUCTORES' ? '#eab308' : '#334155',
              color: moduloActivo === 'CONDUCTORES' ? '#0f172a' : '#ffffff',
            }}
          >
            👮 Conductores y Circuitos ({conductores.length})
          </button>
        </div>
      </header>

      {/* MÓDULO 1: FLOTA VEHICULAR */}
      {moduloActivo === 'FLOTA' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TARJETAS DE MÉTRICAS / KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', borderLeft: '5px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TOTAL VEHÍCULOS</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#1e293b' }}>{totalVehiculos}</h2>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', borderLeft: '5px solid #16a34a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>VEHÍCULOS ASIGNADOS</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#16a34a' }}>{vehiculosAsignados}</h2>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', borderLeft: '5px solid #eab308', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>VEHÍCULOS DISPONIBLES</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#ca8a04' }}>{vehiculosDisponibles}</h2>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '12px', borderLeft: '5px solid #0284c7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TOTAL MOTOCICLETAS</span>
              <h2 style={{ margin: '6px 0 0 0', fontSize: '28px', color: '#0284c7' }}>{totalMotos}</h2>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            
            {/* PESTAÑAS Y CONTROLES */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              
              <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => setTabActiva('VEHICULO')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: tabActiva === 'VEHICULO' ? '#ffffff' : 'transparent',
                    color: tabActiva === 'VEHICULO' ? '#0f172a' : '#64748b',
                    boxShadow: tabActiva === 'VEHICULO' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🚗 Vehículos ({totalVehiculos})
                </button>
                <button
                  onClick={() => setTabActiva('MOTOCICLETA')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: tabActiva === 'MOTOCICLETA' ? '#ffffff' : 'transparent',
                    color: tabActiva === 'MOTOCICLETA' ? '#0f172a' : '#64748b',
                    boxShadow: tabActiva === 'MOTOCICLETA' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🏍️ Motocicletas ({totalMotos})
                </button>
              </div>

              {/* BARRA DE FILTROS Y BÚSQUEDA */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar placa, modelo o custodio..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '260px', outline: 'none' }}
                />

                {tabActiva === 'VEHICULO' && (
                  <>
                    <select
                      value={filtroCircuito}
                      onChange={(e) => setFiltroCircuito(e.target.value)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="TODOS">🏢 Todos los Circuitos</option>
                      {circuitos.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value as any)}
                      style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                    >
                      <option value="TODOS">📌 Todos los Estados</option>
                      <option value="DISPONIBLES">🟡 Solo Disponibles</option>
                      <option value="ASIGNADOS">🟢 Solo Asignados</option>
                    </select>
                  </>
                )}

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
              </div>

            </div>

            {/* TABLA DE UNIDADES */}
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
                          <td style={{ padding: '14px 12px', fontWeight: 'bold', color: '#2563eb' }}>{item.kmActual.toLocaleString()} km</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => {
                                  setItemAReasignar(item);
                                  setNuevoCircuitoReasignado(item.circuito);
                                }}
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
                              <button
                                onClick={() =>
                                  alert(`📜 DETALLE UNIDAD\n\nPlaca: ${item.placa}\nMarca/Modelo: ${item.marcaModelo}\nCustodio: ${item.conductorCustodio}\nEstado: ${item.estado}\nNovedad: ${item.novedad || 'Ninguna'}`)
                                }
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
                                📋 Info
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

          </div>

        </div>
      )}

      {/* MÓDULO 2: CONDUCTORES Y CIRCUITOS */}
      {moduloActivo === 'CONDUCTORES' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          
          {/* PANEL IZQUIERDO: REGISTRO + CIRCUITOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* FORMULARIO REGISTRAR CONDUCTOR */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>➕ Registrar Nuevo Conductor</h3>
              <form onSubmit={handleGuardarConductor}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>Rango / Grado:</label>
                  <select
                    value={nuevoRango}
                    onChange={(e) => setNuevoRango(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {gradosPoliciales.map((grado) => (
                      <option key={grado} value={grado}>{grado}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>Nombres y Apellidos:</label>
                  <input
                    type="text"
                    placeholder="Ej. JUAN CARLOS PÉREZ"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>Cédula de Identidad:</label>
                  <input
                    type="text"
                    placeholder="Ej. 1002630123"
                    value={nuevaCedula}
                    onChange={(e) => setNuevaCedula(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 'bold' }}>Teléfono de Contacto:</label>
                  <input
                    type="text"
                    placeholder="Ej. 0998307665"
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  💾 Guardar Conductor
                </button>
              </form>
            </div>

            {/* GESTIÓN DE CIRCUITOS (EXCLUSIVO VEHÍCULOS) */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>🏢 Circuitos (Exclusivo para Vehículos)</h3>
              
              <form onSubmit={handleAgregarCircuito} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Nombre del nuevo circuito..."
                  value={nuevoCircuitoInput}
                  onChange={(e) => setNuevoCircuitoInput(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Crear
                </button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {circuitos.map((circ) => (
                  <div
                    key={circ}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#334155' }}>🏢 {circ}</span>
                    <button
                      onClick={() => handleEliminarCircuito(circ)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        padding: 0,
                      }}
                      title="Eliminar Circuito"
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* PANEL DERECHO: LISTA DE CONDUCTORES */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>👮 Conductores Registrados ({conductoresFiltrados.length})</h3>
              <input
                type="text"
                placeholder="🔍 Buscar conductor..."
                value={busquedaConductor}
                onChange={(e) => setBusquedaConductor(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '12px' }}>
                    <th style={{ padding: '10px' }}>N°</th>
                    <th style={{ padding: '10px' }}>CONDUCTOR</th>
                    <th style={{ padding: '10px' }}>CÉDULA</th>
                    <th style={{ padding: '10px' }}>TELÉFONO</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {conductoresFiltrados.length > 0 ? (
                    conductoresFiltrados.map((cond, idx) => (
                      <tr key={cond.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', color: '#94a3b8', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e293b' }}>
                          <span style={{ color: '#2563eb', fontSize: '12px' }}>[{cond.rango}]</span>
                          <br />
                          {cond.nombre}
                        </td>
                        <td style={{ padding: '10px', color: '#475569' }}>{cond.cedula}</td>
                        <td style={{ padding: '10px', color: '#475569' }}>{cond.telefono}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEliminarConductor(cond.id, cond.nombre)}
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '12px',
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        No hay conductores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE REASIGNACIÓN Y PDF */}
      {itemAReasignar && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>🔄 Reasignar Custodio / Conductor</h3>
            <p style={{ fontSize: '14px', color: '#475569' }}><strong>Unidad:</strong> {itemAReasignar.placa} — {itemAReasignar.marcaModelo}</p>
            <p style={{ fontSize: '14px', color: '#475569' }}><strong>Custodio Actual:</strong> {itemAReasignar.conductorCustodio}</p>

            <hr style={{ margin: '16px 0', borderColor: '#e2e8f0' }} />

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px' }}>Seleccionar Conductor:</label>
              <select
                value={conductorSeleccionadoId}
                onChange={(e) => setConductorSeleccionadoId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="">🟡 DISPONIBLE / SIN CONDUCTOR</option>
                {conductores.map((c) => (
                  <option key={c.id} value={c.id}>
                    🟢 {c.rango} {c.nombre} (CI: {c.cedula})
                  </option>
                ))}
              </select>
            </div>

            {itemAReasignar.categoria === 'VEHICULO' && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px' }}>Circuito Asignado:</label>
                <select
                  value={nuevoCircuitoReasignado}
                  onChange={(e) => setNuevoCircuitoReasignado(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  {circuitos.map((c) => (
                    <option key={c} value={c}>🏢 {c}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setItemAReasignar(null)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarReasignacion}
                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                📄 Confirmar y Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;