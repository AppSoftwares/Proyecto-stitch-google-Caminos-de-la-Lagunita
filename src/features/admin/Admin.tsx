import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { formatBs, formatUSD } from '../../utils/currency'
import { useCurrencyStore } from '../../store/useCurrencyStore'
import { useCommunityStore, Poll } from '../../store/useCommunityStore'
import { supabase } from '../../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import logoPremium from '../../assets/logo_premium.png'

export const Admin: React.FC = () => {
  const navigate = useNavigate()
  const { user, setWhitelist } = useAuthStore()
  const bcvRate = useCurrencyStore(state => state.bcvRate)
  const { addPoll } = useCommunityStore()
  const [activeTab, setActiveTab] = useState<'finance' | 'users' | 'payments' | 'polls'>('finance')
  const [sedematData, setSedematData] = useState<{ aseoBs: number, gasBs: number, aseoUsd: number, gasUsd: number } | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (userError) throw userError
      setUsers(userData.filter(u => u.status === 'active' || !u.status))
      setPendingUsers(userData.filter(u => u.status === 'pending'))

      // Fetch Payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*, profiles(first_name, last_name, house_number)')
        .order('created_at', { ascending: false })

      if (paymentError) throw paymentError
      setPayments(paymentData)

    } catch (err: any) {
      console.error('Error fetching admin data:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId)

      if (error) throw error
      alert('Usuario aprobado con éxito')
      fetchData()
    } catch (err: any) {
      alert('Error al aprobar usuario: ' + err.message)
    }
  }

  const validatePayment = async (paymentId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId)

      if (error) throw error
      alert(`Pago ${status === 'approved' ? 'aprobado' : 'rechazado'} con éxito`)
      fetchData()
    } catch (err: any) {
      alert('Error al validar pago: ' + err.message)
    }
  }

  const miniBtnStyle = { background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-sub)', padding: '6px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }

  const financialData = {
    condominio: "CONDOMINIO CONJUNTO 14 LAS HUERTAS",
    rif: "J-29900732-3",
    mes_relacion: "JUNIO 2026",
    tasa_cambio: 560.00,
    gastos_ordinarios: [
      { concepto: "Aseo Urbano", bs: 75000.00, usd: 133.93 },
      { concepto: "Servicios Básicos", bs: 200000.00, usd: 357.14 },
      { concepto: "Teléfono de Recepción", bs: 5000.00, usd: 8.93 },
      { concepto: "Operadores de Servicio General", bs: 620.00, usd: 1.11 },
      { concepto: "Trabajador Residencial", bs: 130.00, usd: 0.23 },
      { concepto: "Bonos de Alimentación", bs: 672000.00, usd: 1200.00 },
      { concepto: "Beneficios Sociales Trabajadores", bs: 189600.00, usd: 338.57 },
      { concepto: "Artículos de Limpieza", bs: 58800.00, usd: 105.00 },
      { concepto: "Materiales Eléctricos", bs: 41383.00, usd: 73.90 },
      { concepto: "Mantenimiento Portones Eléctricos", bs: 22400.00, usd: 40.00 },
      { concepto: "Material Ferretería", bs: 4500.00, usd: 8.04 },
      { concepto: "Mantenimiento Ascensores", bs: 38200.00, usd: 68.21 },
      { concepto: "Mantenimiento Aire Acondicionado", bs: 30000.00, usd: 53.57 },
      { concepto: "Sistema de Cámaras de Seguridad", bs: 33500.00, usd: 59.82 },
      { concepto: "Jardinería y Áreas Verdes", bs: 44800.00, usd: 80.00 },
      { concepto: "Administración y Seguimiento", bs: 112000.00, usd: 200.00 },
      { concepto: "Fondo de Reserva Ordinario", bs: 134317.30, usd: 239.85 }
    ],
    gastos_sobrevenidos: [
      { concepto: "Reparación bajante sótano", bs: 280000.00, usd: 500.00 },
      { concepto: "2 discos duros 1TB DVR", bs: 212800.00, usd: 380.00 },
      { concepto: "Mantenimiento correctivo planta", bs: 145000.00, usd: 260.00 }
    ]
  }

  // Poll state
  const [newPollTitle, setNewPollTitle] = useState('')
  const [newPollDesc, setNewPollDesc] = useState('')
  const [opt1, setOpt1] = useState('')
  const [opt2, setOpt2] = useState('')

  const handleCreatePoll = () => {
    if (!newPollTitle || !newPollDesc || !opt1 || !opt2) return alert('Por favor, complete todos los campos.')
    const poll: Poll = {
      id: Date.now().toString(),
      title: newPollTitle,
      description: newPollDesc,
      priority: 'Alta',
      endDate: 'Cierra en 3 días',
      totalVotes: 0,
      votedHouses: [],
      options: [{ text: opt1, votes: 0 }, { text: opt2, votes: 0 }]
    }
    addPoll(poll)
    alert('¡Votación publicada exitosamente!')
    setNewPollTitle(''); setNewPollDesc(''); setOpt1(''); setOpt2('');
    setActiveTab('polls')
  }

  const handleProcessSedemat = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      alert(`Procesando recibo: ${fileName}...`);

      // Simulación de extracción de datos del recibo SEDEMAT del usuario
      setTimeout(() => {
        const aseoBs = 240915.64;
        const gasBs = 90343.36;
        const aseoUsd = aseoBs / bcvRate;
        const gasUsd = gasBs / bcvRate;

        setSedematData({ aseoBs, gasBs, aseoUsd, gasUsd });
        alert('¡Recibo SEDEMAT procesado con éxito!\nSe han cargado los montos de Aseo y Gas.');
      }, 1500);
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Header Info
    const header = [
      [financialData.condominio],
      [`RIF: ${financialData.rif}`],
      [`RELACIÓN DE GASTOS - ${financialData.mes_relacion}`],
      [`TASA BCV: ${bcvRate.toFixed(2)} Bs/$`],
      []
    ];

    // Ordinarios
    const ordinariosRows = [
      ["GASTOS ORDINARIOS"],
      ["CONCEPTO", "MONTO BS", "MONTO USD"],
      ...financialData.gastos_ordinarios.map(g => [g.concepto, g.bs, g.usd])
    ];

    // Sobrevenidos
    const sobrevenidosRows = [
      [],
      ["GASTOS SOBREVENIDOS"],
      ["CONCEPTO", "MONTO BS", "MONTO USD"],
      ...financialData.gastos_sobrevenidos.map(g => [g.concepto, g.bs, g.usd])
    ];

    // SEDEMAT if exists
    let sedematRows: any[] = [];
    if (sedematData) {
      sedematRows = [
        [],
        ["DETALLE COMPROBANTE DE PAGO (SEDEMAT)"],
        ["CONCEPTO", "MONTO BS", "MONTO USD"],
        ["Servicio de Aseo", sedematData.aseoBs, sedematData.aseoUsd],
        ["Servicio de Gas", sedematData.gasBs, sedematData.gasUsd],
        ["TOTAL MUNICIPAL", sedematData.aseoBs + sedematData.gasBs, sedematData.aseoUsd + sedematData.gasUsd]
      ];
    }

    const wsData = [...header, ...ordinariosRows, ...sobrevenidosRows, ...sedematRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply some basic column widths
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, "Relacion Mensual");
    XLSX.writeFile(wb, `Relacion_${financialData.mes_relacion.replace(' ', '_')}.xlsx`);
  }

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Relación de Gastos - ${financialData.mes_relacion}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #000; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { font-size: 22px; margin-bottom: 5px; }
            h2 { font-size: 16px; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; }
            .monto { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin-bottom: 2px;">${financialData.condominio}</h1>
            <h2 style="margin-top: 0; border: none; font-size: 14px; margin-bottom: 10px;">RIF: ${financialData.rif}</h2>
            <p style="margin: 5px 0; font-weight: bold; letter-spacing: 1px;">RELACIÓN DE GASTOS Y CUOTAS DE MANTENIMIENTO</p>
            <p style="margin: 5px 0;">MES: ${financialData.mes_relacion} | TASA BCV: ${bcvRate.toFixed(2)} Bs/$</p>
          </div>

          <h2 style="font-size: 16px; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px;">GASTOS ORDINARIOS</h2>
          <table>
            <thead><tr><th>CONCEPTO</th><th class="monto">MONTO BS</th><th class="monto">MONTO USD</th></tr></thead>
            <tbody>
              ${financialData.gastos_ordinarios.map(g => `<tr><td>${g.concepto}</td><td class="monto">${g.bs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td><td class="monto">$${g.usd.toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>

          <h2>GASTOS SOBREVENIDOS</h2>
          <table>
            <thead><tr><th>CONCEPTO</th><th class="monto">MONTO BS</th><th class="monto">MONTO USD</th></tr></thead>
            <tbody>
              ${financialData.gastos_sobrevenidos.map(g => `<tr><td>${g.concepto}</td><td class="monto">${g.bs.toLocaleString('es-VE', {minimumFractionDigits: 2})}</td><td class="monto">$${g.usd.toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>

          ${sedematData ? `
            <div style="margin-top: 30px; border: 1px solid #000; padding: 15px;">
              <h2 style="margin-top: 0; border: none;">DETALLE RECIBO SEDEMAT (PROCESADO)</h2>
              <p style="font-size: 11px;">Monto Aseo: ${sedematData.aseoBs.toLocaleString('es-VE')} Bs. ($${sedematData.aseoUsd.toFixed(2)})</p>
              <p style="font-size: 11px;">Monto Gas: ${sedematData.gasBs.toLocaleString('es-VE')} Bs. ($${sedematData.gasUsd.toFixed(2)})</p>
              <p style="font-size: 12px; font-weight: bold; margin-top: 10px;">TOTAL SERVICIOS MUNICIPALES: ${(sedematData.aseoBs + sedematData.gasBs).toLocaleString('es-VE')} Bs. ($${(sedematData.aseoUsd + sedematData.gasUsd).toFixed(2)})</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  }


  const handleImportResidents = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // El archivo tiene encabezados en la fila 4 (índice 3)
        // Usamos sheet_to_json con range: 4 para empezar a leer desde los datos (fila 5)
        // o range: 3 para leer desde los encabezados.
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { range: 3 });

        const mappedUsers = rawData.map((row: any, index: number) => ({
          id: Date.now() + index,
          name: `${row['NOMBRE'] || ''} ${row['APELLIDO'] || ''}`.trim(),
          email: (row['CORREO'] || '').toLowerCase().trim(),
          role: row['USUARIO'] === 'ADMINISTRADOR' ? 'Administrador' : 'Residente',
          house_number: row['CASA N°'],
          status: "Activo",
          phone: "",
          debt: 0,
          password: row['CONTRASEÑA']
        })).filter(u => u.email);

        setUsers(prev => [...prev, ...mappedUsers]);
        setWhitelist(mappedUsers);
        alert(`¡Éxito! Se han importado ${mappedUsers.length} registros del archivo ${file.name}.`);
      };
      reader.readAsBinaryString(file);
    }
  }

  const generateStatementPDF = (resident: any) => {
    const doc = new jsPDF()

    // Configuración de estilos imitando la referencia
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("CONDOMINIO CONJUNTO 14 LAS HUERTAS", 10, 15)
    doc.text("RIF. J-29900732-3", 10, 20)
    doc.text(`Fecha:  ${new Date().toLocaleDateString('es-VE')}`, 150, 20)

    doc.text("ESTADO DE CUENTA HASTA 31/05/2026", 10, 30)
    doc.line(10, 32, 200, 32)

    doc.text(`PROPIETARIO: ${resident.name.toUpperCase()}`, 10, 40)
    doc.text(`CASA: ${resident.house_number}`, 120, 40)

    // Tabla de movimientos (Simulada según la imagen)
    autoTable(doc, {
      startY: 45,
      head: [['DESCRIPCIÓN', 'MONTO $']],
      body: [
        ['** MÁS SALDO PENDIENTE DE LA JUNTA ANTERIOR', '445,00 $'],
        ['- ABONA EL 19-06-2023 BS. 271,70 SON 10,00 DOLARES', '-10,00 $'],
        ['SALDO PENDIENTE HASTA EL 30-06-2023', '435,00 $'],
        ['- ABONA EL 01-07-2023 BS. 270,50 SON 10,00 DOLARES', '-10,00 $'],
        ['** MAS CUOTAS DESDE JUNIO HASTA DICIEMBRE 2024 (7 MESES X 20$)', '140,00 $'],
        ['** MAS CUOTAS ENERO - MAYO 2026', '120,00 $'],
        ['SALDO PENDIENTE HASTA EL 31/05/2026', `${resident.debt.toFixed(2).replace('.', ',')} $`],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2, font: 'helvetica' },
      headStyles: { fontStyle: 'bold', textColor: [0, 0, 0], fillColor: [240, 240, 240] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(10)
    doc.text("Realizado por:", 10, finalY + 15)
    doc.text("Lcda. Maria Eugenia Urbina", 10, finalY + 22)
    doc.text("Administradora", 10, finalY + 27)

    const fileName = `Estado_de_Cuenta_casa_${resident.house_number}_año_2026.pdf`
    doc.save(fileName)
    return fileName
  }

  const sendWhatsApp = (resident: any) => {
    const message = `Hola ${resident.name}, te adjunto tu Estado de Cuenta de la casa ${resident.house_number}. Saldo pendiente: ${resident.debt}$ a la fecha.`
    const url = `https://wa.me/${resident.phone.replace('+', '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const deleteUser = (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de que desea eliminar a ${name}?`)) {
      setUsers(users.filter(u => u.id !== id));
    }
  }

  const addUser = () => {
    const name = prompt("Nombre completo:");
    const email = prompt("Correo:");
    const role = prompt("Rol (Residente, Tesorero, Administrador, Vigilante):");
    if (name && email && role) {
      setUsers([...users, {
        id: Date.now(),
        name,
        email,
        role,
        status: "Activo",
        phone: "",
        house_number: "",
        debt: 0
      }]);
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(15, 85, 81, 0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-gold)' }}>
            <img src={logoPremium} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '20px', color: 'var(--primary-color)', fontWeight: 700, margin: 0 }}>Caminos Admin</h1>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-sub)', letterSpacing: '1px', fontWeight: 800, textAlign: 'center' }}>PANEL DE CONTROL</p>
          </div>
        </div>
      </header>

      <main style={mainContentStyle}>

        {activeTab === 'finance' && (
          <section style={{ width: '100%' }}>
             <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '32px', fontFamily: "'EB Garamond', serif", margin: '0 0 10px 0' }}>Relación Mensual</h3>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                   {/* Escrito más largo centrado arriba */}
                   <input type="file" id="sedemat-file" style={{ display: 'none' }} accept=".pdf" onChange={handleProcessSedemat} />
                   <button onClick={() => document.getElementById('sedemat-file')?.click()} style={{ ...actionBtnStyle, width: 'fit-content', backgroundColor: sedematData ? 'rgba(37, 211, 102, 0.1)' : 'var(--card-bg)' }}>
                      <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>upload_file</span>
                      {sedematData ? 'COMPROBANTE CARGADO' : 'SUBIR COMPROBANTE DE PAGO'}
                   </button>

                   {/* Otros botones debajo */}
                   <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button onClick={handleExportPDF} style={actionBtnStyle}>
                         <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>picture_as_pdf</span> PDF
                      </button>
                      <button onClick={handleExportExcel} style={actionBtnStyle}>
                         <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>table_view</span> Excel
                      </button>
                   </div>
                </div>
             </div>
             <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '15px' }}>
                   <span style={{ fontWeight: 700 }}>{financialData.condominio}</span>
                   <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>BCV: {bcvRate.toFixed(2)}</span>
                </div>

                {sedematData && (
                  <div style={{ backgroundColor: 'rgba(15, 85, 81, 0.05)', padding: '15px', borderRadius: '15px', marginBottom: '15px', border: '1px dashed var(--primary-color)' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--primary-color)' }}>MUNICIPAL (SEDEMAT)</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px' }}>Aseo Urbano</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatUSD(sedematData.aseoUsd)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px' }}>Gas Doméstico</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatUSD(sedematData.gasUsd)}</span>
                    </div>
                  </div>
                )}

                {financialData.gastos_ordinarios.slice(0, 5).map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--icon-bg)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{g.concepto}</span>
                     <span style={{ fontWeight: 700 }}>{formatUSD(g.usd)}</span>
                  </div>
                ))}

                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '2px dashed var(--border-color)' }}>
                   <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '15px', letterSpacing: '1px' }}>GESTIÓN DE PERSONAL</p>
                   <button onClick={() => navigate('/admin/payroll')} style={{ ...primaryBtnStyleSmall, width: '100%', justifyContent: 'center', backgroundColor: 'var(--primary-color)' }}>
                      <span className="material-symbols-outlined">payments</span>
                      <span>GESTIONAR NÓMINA DE EMPLEADOS</span>
                   </button>
                </div>
             </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section style={{ width: '100%', animation: 'fadeIn 0.5s ease' }}>
             <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '32px', fontFamily: "'EB Garamond', serif", margin: '0 0 10px 0' }}>Gestión de Usuarios</h3>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={addUser} style={primaryBtnStyleSmall}>
                     <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                     <span>Añadir</span>
                  </button>
                  <input type="file" id="import-residents" style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImportResidents} />
                  <button onClick={() => document.getElementById('import-residents')?.click()} style={{ ...primaryBtnStyleSmall, backgroundColor: 'var(--accent-gold)' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
                     <span>Importar Excel</span>
                  </button>
                </div>
             </div>

             {pendingUsers.length > 0 && (
               <div style={{ marginBottom: '30px' }}>
                 <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '15px', letterSpacing: '1px' }}>SOLICITUDES PENDIENTES ({pendingUsers.length})</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingUsers.map(u => (
                      <div key={u.id} style={{ ...cardStyle, padding: '15px 20px', border: '1px solid var(--accent-gold)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                               <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(198, 160, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-gold)' }}>person_search</span>
                               </div>
                               <div>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{u.first_name} {u.last_name}</p>
                                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>Casa {u.house_number} • {u.residential_cluster}</p>
                               </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                               <button onClick={() => approveUser(u.id)} style={{ ...miniBtnStyle, backgroundColor: 'var(--primary-color)', color: 'white', border: 'none' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                               </button>
                               <button onClick={() => deleteUser(u.id, u.first_name)} style={{ ...miniBtnStyle, color: '#ba1a1a' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
             )}

             <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '15px', letterSpacing: '1px' }}>USUARIOS ACTIVOS</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {users.map(u => (
                  <div key={u.id} style={{ ...cardStyle, padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <span className="material-symbols-outlined" style={{ color: 'var(--primary-color)' }}>person</span>
                        </div>
                        <div>
                           <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{u.first_name || u.name} {u.last_name || ''}</p>
                           <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>{u.role} • Casa {u.house_number || 'N/A'}</p>
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => generateStatementPDF(u)} style={{ ...miniBtnStyle, borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }} title="Descargar PDF">
                           <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_as_pdf</span>
                        </button>
                        <button onClick={() => deleteUser(u.id, u.name || u.first_name)} style={{ background: 'none', border: 'none', color: '#ba1a1a', cursor: 'pointer', padding: '8px' }}>
                           <span className="material-symbols-outlined">person_remove</span>
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </section>
        )}

        {activeTab === 'payments' && (
          <section style={{ width: '100%' }}>
             <h3 style={{ fontSize: '32px', fontFamily: "'EB Garamond', serif", textAlign: 'center', marginBottom: '30px' }}>Validación de Pagos</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {payments.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-sub)' }}>No hay pagos registrados para validar.</p>}
                {payments.map(p => (
                  <div key={p.id} style={cardStyle}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div>
                           <p style={{ margin: 0, fontWeight: 700 }}>{p.profiles?.first_name} {p.profiles?.last_name}</p>
                           <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>Casa {p.profiles?.house_number} • {new Date(p.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <p style={{ margin: 0, fontWeight: 800, color: 'var(--primary-color)' }}>{formatUSD(p.amount_usd || 0)}</p>
                           <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: p.status === 'pending' ? '#fff4e5' : p.status === 'approved' ? '#e6f4ea' : '#fce8e6', color: p.status === 'pending' ? '#b45d00' : p.status === 'approved' ? '#1e7e34' : '#c82333', fontWeight: 700 }}>
                              {p.status?.toUpperCase()}
                           </span>
                        </div>
                     </div>

                     {p.screenshot_url && (
                        <div style={{ marginBottom: '15px' }}>
                           <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '8px' }}>COMPROBANTE:</p>
                           <img
                              src={p.screenshot_url}
                              alt="Comprobante"
                              style={{ width: '100%', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                              onClick={() => window.open(p.screenshot_url, '_blank')}
                           />
                        </div>
                     )}

                     {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <button onClick={() => validatePayment(p.id, 'approved')} style={{ ...primaryBtnStyle, padding: '12px', backgroundColor: '#1e7e34' }}>Aprobar Pago</button>
                           <button onClick={() => validatePayment(p.id, 'rejected')} style={{ ...primaryBtnStyle, padding: '12px', backgroundColor: '#c82333' }}>Rechazar</button>
                        </div>
                     )}
                  </div>
                ))}
             </div>
          </section>
        )}

        {activeTab === 'polls' && (
          <section style={{ width: '100%' }}>
             <h3 style={{ fontSize: '24px', fontFamily: "'EB Garamond', serif", marginBottom: '25px' }}>Nueva Votación</h3>
             <div style={cardStyle}>
                <div style={{ marginBottom: '20px' }}>
                   <label style={labelStyle}>Título</label>
                   <input value={newPollTitle} onChange={e => setNewPollTitle(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                   <label style={labelStyle}>Descripción</label>
                   <textarea value={newPollDesc} onChange={e => setNewPollDesc(e.target.value)} style={{ ...inputStyle, height: '100px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                   <div><label style={labelStyle}>Opción 1</label><input value={opt1} onChange={e => setOpt1(e.target.value)} style={inputStyle} /></div>
                   <div><label style={labelStyle}>Opción 2</label><input value={opt2} onChange={e => setOpt2(e.target.value)} style={inputStyle} /></div>
                </div>
                <button onClick={handleCreatePoll} style={primaryBtnStyle}>Publicar</button>
             </div>
          </section>
        )}
      </main>

      <nav style={bottomNavStyle}>
        <NavIcon icon="account_balance_wallet" label="Finanzas" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
        <NavIcon icon="group" label="Usuarios" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        <NavIcon icon="receipt_long" label="Pagos" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
        <NavIcon icon="payments" label="Nómina" active={false} onClick={() => navigate('/admin/payroll')} />
        <NavIcon icon="settings" label="Perfil" active={false} onClick={() => navigate('/profile')} />
      </nav>
    </div>
  )
}

const headerStyle = { position: 'fixed' as any, top: 0, width: '100%', height: '74px', backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const mainContentStyle = { paddingTop: '100px', paddingLeft: '20px', paddingRight: '20px', width: '100%', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' as any }
const actionBtnStyle = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--primary-color)', padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '14px' }
const cardStyle = { backgroundColor: 'var(--card-bg)', padding: '30px', borderRadius: '28px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' as any, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }
const primaryBtnStyleSmall = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' }
const inputStyle = { width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'var(--icon-bg)', color: 'var(--text-color)', outline: 'none', fontSize: '16px' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase' as any, letterSpacing: '0.5px' }
const primaryBtnStyle = { width: '100%', padding: '20px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '18px', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }
const bottomNavStyle = { position: 'fixed' as any, bottom: 0, width: '100%', height: '85px', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 1000 }

const NavIcon = ({ icon, label, active, onClick }: any) => (
  <div onClick={onClick} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ backgroundColor: active ? 'rgba(198, 160, 89, 0.15)' : 'transparent', padding: '8px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span className="material-symbols-outlined" style={{ color: active ? 'var(--accent-gold)' : 'var(--text-sub)', fontSize: '28px', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      <span style={{ fontSize: '10px', color: active ? 'var(--accent-gold)' : 'var(--text-sub)', fontWeight: active ? 700 : 500, marginTop: '4px' }}>{label}</span>
    </div>
  </div>
)
