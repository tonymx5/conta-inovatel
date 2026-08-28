import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, PieChart as PieIcon, TrendingUp, Calendar, CalendarRange, History, Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { storageService } from '../services/storageService';
import { MONTH_NAMES } from '../utils/dateFormatter';

const SECTOR_COLORS = {
  Trabajo: '#10b981',
  Servicios: '#06b6d4',
  Comida: '#f59e0b',
  Ocio: '#f43f5e',
  Extras: '#6366f1'
};

const MONTH_OPTIONS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

export default function AnalyticsModule() {
  const [invoices, setInvoices] = useState([]);
  const [cardExpenses, setCardExpenses] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);
  const [deposits, setDeposits] = useState([]);

  // Period Filter States: 'mes' | 'anual' | 'historico'
  const [filterType, setFilterType] = useState('mes');
  
  const currentDate = new Date();
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener('conta_data_synced', handleSync);
    return () => window.removeEventListener('conta_data_synced', handleSync);
  }, []);

  const loadData = () => {
    setInvoices(storageService.getInvoices());
    setCardExpenses(storageService.getCardExpenses());
    setOtherIncome(storageService.getOtherIncome());
    setDeposits(storageService.getAccountDeposits ? storageService.getAccountDeposits() : []);
  };

  // Helper to extract year and month from YYYY-MM-DD or ISO string
  const parseYearMonth = (dateStr) => {
    if (!dateStr) return { year: '', month: '' };
    const str = String(dateStr).trim();
    const cleanDate = str.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length >= 2) {
      return { year: parts[0], month: parts[1].padStart(2, '0') };
    }
    return { year: '', month: '' };
  };

  // Extract all available years from datasets for dropdown selection
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYearStr]);
    const addDateYears = (list) => {
      list.forEach(item => {
        if (item && item.date) {
          const { year } = parseYearMonth(item.date);
          if (year && year.length === 4) yearsSet.add(year);
        }
      });
    };
    addDateYears(invoices);
    addDateYears(cardExpenses);
    addDateYears(otherIncome);
    addDateYears(deposits.filter(d => d.profile === 'edson'));

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [invoices, cardExpenses, otherIncome, deposits, currentYearStr]);

  // Generic item filter by period
  const filterByPeriod = useCallback((items) => {
    if (!items || !Array.isArray(items)) return [];
    if (filterType === 'historico') return items;

    return items.filter(item => {
      if (!item || !item.date) return false;
      const { year, month } = parseYearMonth(item.date);
      if (filterType === 'anual') {
        return year === selectedYear;
      }
      if (filterType === 'mes') {
        return year === selectedYear && month === selectedMonth;
      }
      return true;
    });
  }, [filterType, selectedYear, selectedMonth]);

  // Filtered Datasets (Depósitos vinculados EXCLUSIVAMENTE al perfil Edson)
  const edsonDeposits = useMemo(() => deposits.filter(d => d.profile === 'edson'), [deposits]);
  const filteredInvoices = useMemo(() => filterByPeriod(invoices), [invoices, filterByPeriod]);
  const filteredCardExpenses = useMemo(() => filterByPeriod(cardExpenses), [cardExpenses, filterByPeriod]);
  const filteredOtherIncome = useMemo(() => filterByPeriod(otherIncome), [otherIncome, filterByPeriod]);
  const filteredDeposits = useMemo(() => filterByPeriod(edsonDeposits), [edsonDeposits, filterByPeriod]);

  // Calculations on Filtered Data
  const totalIngresoFacturado = filteredInvoices
    .filter(i => i.status !== 'PENDIENTE')
    .reduce((sum, i) => sum + (i.total !== undefined ? i.total : (i.subtotal || 0)), 0);
  const totalOtroIngreso = filteredOtherIncome.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalIngresoGlobal = totalIngresoFacturado + totalOtroIngreso;

  // Depósitos y Utilidad Real en Banco (Exclusivo Edson / Dinero Real)
  const totalDepositos = filteredDeposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalGastosEquipos = filteredDeposits.reduce((sum, d) => sum + (d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0), 0);
  const totalUtilidadRealEnCuenta = filteredDeposits.reduce((sum, d) => {
    const amt = parseFloat(d.amount) || 0;
    const eq = d.appliesEquipmentExpense ? (parseFloat(d.equipmentExpense) || 0) : 0;
    return sum + (d.realUtility !== undefined ? d.realUtility : (amt - eq));
  }, 0);

  // Base principal de dinero real disponible en cuenta bancaria para el período seleccionado
  const baseUtilidadReal = totalUtilidadRealEnCuenta > 0 ? totalUtilidadRealEnCuenta : totalIngresoGlobal;

  const totalGastos = filteredCardExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const flujoLibre = Math.max(0, baseUtilidadReal - totalGastos);

  // Sector breakdown math
  const sectorTotals = {
    Trabajo: 0,
    Servicios: 0,
    Comida: 0,
    Ocio: 0,
    Extras: 0
  };

  filteredCardExpenses.forEach(e => {
    const sec = e.sector || 'Extras';
    if (sectorTotals[sec] !== undefined) {
      sectorTotals[sec] += (e.amount || 0);
    } else {
      sectorTotals.Extras += (e.amount || 0);
    }
  });

  const pieData = Object.keys(sectorTotals).map(sec => {
    const amount = sectorTotals[sec];
    const pctOfIncome = baseUtilidadReal > 0 ? ((amount / baseUtilidadReal) * 100).toFixed(1) : 0;
    return {
      name: sec,
      value: amount,
      pctOfIncome: parseFloat(pctOfIncome)
    };
  }).filter(d => d.value > 0);

  // Growth Projections Math (Adapts label based on view mode)
  let projectionData = [];
  if (filterType === 'mes') {
    const selectedMonthIdx = parseInt(selectedMonth, 10) - 1;
    const baseMonthName = MONTH_NAMES[selectedMonthIdx] || 'Mes Actual';
    const m1Name = MONTH_NAMES[(selectedMonthIdx + 1) % 12];
    const m2Name = MONTH_NAMES[(selectedMonthIdx + 2) % 12];
    const m3Name = MONTH_NAMES[(selectedMonthIdx + 3) % 12];

    projectionData = [
      { period: `${baseMonthName} (Actual)`, Ingresos: baseUtilidadReal, Gastos: totalGastos },
      { period: `${m1Name} (Proj 5%)`, Ingresos: baseUtilidadReal * 1.05, Gastos: totalGastos * 1.03 },
      { period: `${m2Name} (Proj 10%)`, Ingresos: baseUtilidadReal * 1.1025, Gastos: totalGastos * 1.05 },
      { period: `${m3Name} (Proj 15%)`, Ingresos: baseUtilidadReal * 1.1576, Gastos: totalGastos * 1.08 }
    ];
  } else {
    const periodLabel = filterType === 'anual' ? `Año ${selectedYear}` : 'Histórico';
    projectionData = [
      { period: `${periodLabel} (Base)`, Ingresos: baseUtilidadReal, Gastos: totalGastos },
      { period: 'Trimestre +1 (Proj 5%)', Ingresos: baseUtilidadReal * 1.05, Gastos: totalGastos * 1.03 },
      { period: 'Trimestre +2 (Proj 10%)', Ingresos: baseUtilidadReal * 1.1025, Gastos: totalGastos * 1.05 },
      { period: 'Trimestre +3 (Proj 15%)', Ingresos: baseUtilidadReal * 1.1576, Gastos: totalGastos * 1.08 }
    ];
  }

  // Active filter label summary
  const getFilterSummaryText = () => {
    if (filterType === 'mes') {
      const mName = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || '';
      return `Mes de ${mName} ${selectedYear}`;
    }
    if (filterType === 'anual') {
      return `Año Completo ${selectedYear}`;
    }
    return 'Histórico Completo (Todas las Fechas)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Banner */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 color="#6366f1" size={26} /> Métricas & Analíticas Financieras
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500', marginTop: '0.25rem' }}>
            Visualización y análisis financiero por Período: <strong style={{ color: '#4f46e5' }}>{getFilterSummaryText()}</strong>
          </p>
        </div>

        {/* Filter Badges Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-emerald" style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}>
            {filteredInvoices.length} Facturas | {filteredCardExpenses.length} Gastos | {filteredDeposits.length} Depósitos
          </span>
        </div>
      </div>

      {/* Period Selector Control Panel (Mes, Anual, Histórico) */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Toggle Mode Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
            <Filter size={16} color="#6366f1" /> Filtrar Período:
          </span>

          <button
            type="button"
            onClick={() => setFilterType('mes')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filterType === 'mes' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#e2e8f0',
              color: filterType === 'mes' ? '#ffffff' : '#334155',
              boxShadow: filterType === 'mes' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <Calendar size={16} /> Mes
          </button>

          <button
            type="button"
            onClick={() => setFilterType('anual')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filterType === 'anual' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#e2e8f0',
              color: filterType === 'anual' ? '#ffffff' : '#334155',
              boxShadow: filterType === 'anual' ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none'
            }}
          >
            <CalendarRange size={16} /> Anual
          </button>

          <button
            type="button"
            onClick={() => setFilterType('historico')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: filterType === 'historico' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
              color: filterType === 'historico' ? '#ffffff' : '#334155',
              boxShadow: filterType === 'historico' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            <History size={16} /> Histórico
          </button>
        </div>

        {/* Dynamic Dropdowns based on Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {filterType === 'mes' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Mes:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: '700',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Año:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: '700',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {filterType === 'anual' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Año:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: '700',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'historico' && (
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#047857', background: '#d1fae5', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
              Sin filtro temporal (Totales acumulados)
            </span>
          )}
        </div>
      </div>

      {/* 4 Soft Pastel Overview Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        <div className="tile-card tile-card-mint">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>FACTURAS EMITIDAS</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            {filteredInvoices.length} <span style={{ fontSize: '0.9rem', color: '#047857', fontWeight: '600' }}>Facturas</span>
          </div>
          <span className="badge badge-emerald">Ingreso ${totalIngresoFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="tile-card tile-card-cyan">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>UTILIDAD REAL EN CUENTA</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            ${totalUtilidadRealEnCuenta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="badge badge-cyan">
            {totalGastosEquipos > 0 ? `-$${totalGastosEquipos.toLocaleString('es-MX')} en equipos (de $${totalDepositos.toLocaleString('es-MX')})` : 'Depósitos libres'}
          </span>
        </div>

        <div className="tile-card tile-card-rose">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#be123c', textTransform: 'uppercase' }}>GASTOS POR TARJETA</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            ${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="badge badge-rose">Egresos operativos</span>
        </div>

        <div className="tile-card tile-card-amber">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>FLUJO NETO DISPONIBLE</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            ${flujoLibre.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="badge badge-amber">Capacidad Inversión</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Sector Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieIcon size={20} color="#f59e0b" /> Gastos por Sector ({getFilterSummaryText()})
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Monto Gasto</th>
                  <th>% Utilidad Real en Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(sectorTotals).map(sec => {
                  const amount = sectorTotals[sec];
                  const pct = baseUtilidadReal > 0 ? ((amount / baseUtilidadReal) * 100).toFixed(1) : 0;
                  return (
                    <tr key={sec}>
                      <td style={{ fontWeight: '700' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: SECTOR_COLORS[sec], marginRight: '0.6rem' }}></span>
                        {sec}
                      </td>
                      <td style={{ color: '#be123c', fontWeight: '700' }}>${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className="badge badge-amber" style={{ fontSize: '0.85rem' }}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Circular Donut Ring Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem' }}>Distribución Porcentual por Sectores</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SECTOR_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '600', fontSize: '0.9rem' }}>
              No hay gastos registrados en este período
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart Projections */}
      <div className="glass-panel" style={{ padding: '1.5rem', height: '380px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="#10b981" /> Proyección de Crecimiento ({filterType === 'mes' ? 'Plan Mensual 5%' : 'Plan Trimestral 5%'})
        </h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.5)" />
            <XAxis dataKey="period" stroke="#64748b" tick={{ fontWeight: '600', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontWeight: '600', fontSize: 12 }} />
            <Tooltip formatter={(val) => `$${val.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Gastos" fill="#f43f5e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

