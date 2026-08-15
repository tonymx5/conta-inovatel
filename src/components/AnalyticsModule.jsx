import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart as PieIcon, TrendingUp, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { storageService } from '../services/storageService';

const SECTOR_COLORS = {
  Trabajo: '#10b981',
  Servicios: '#06b6d4',
  Comida: '#f59e0b',
  Ocio: '#f43f5e',
  Extras: '#6366f1'
};

export default function AnalyticsModule() {
  const [invoices, setInvoices] = useState([]);
  const [cardExpenses, setCardExpenses] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);

  useEffect(() => {
    setInvoices(storageService.getInvoices());
    setCardExpenses(storageService.getCardExpenses());
    setOtherIncome(storageService.getOtherIncome());
  }, []);

  const totalIngresoFacturado = invoices.reduce((sum, i) => sum + (i.total !== undefined ? i.total : (i.subtotal || 0)), 0);
  const totalOtroIngreso = otherIncome.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalIngresoGlobal = totalIngresoFacturado + totalOtroIngreso;

  const totalGastos = cardExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const flujoLibre = Math.max(0, totalIngresoGlobal - totalGastos);

  // Sector breakdown math
  const sectorTotals = {
    Trabajo: 0,
    Servicios: 0,
    Comida: 0,
    Ocio: 0,
    Extras: 0
  };

  cardExpenses.forEach(e => {
    const sec = e.sector || 'Extras';
    if (sectorTotals[sec] !== undefined) {
      sectorTotals[sec] += e.amount;
    } else {
      sectorTotals.Extras += e.amount;
    }
  });

  const pieData = Object.keys(sectorTotals).map(sec => {
    const amount = sectorTotals[sec];
    const pctOfIncome = totalIngresoGlobal > 0 ? ((amount / totalIngresoGlobal) * 100).toFixed(1) : 0;
    return {
      name: sec,
      value: amount,
      pctOfIncome: parseFloat(pctOfIncome)
    };
  }).filter(d => d.value > 0);

  // Quarterly Projections Math
  const q1Actual = totalIngresoGlobal;
  const q2Projected = totalIngresoGlobal * 1.05;
  const q3Projected = totalIngresoGlobal * 1.1025;
  const q4Projected = totalIngresoGlobal * 1.1576;

  const projectionData = [
    { period: 'Trimestre 1 (Actual)', Ingresos: q1Actual, Gastos: totalGastos },
    { period: 'Trimestre 2 (Proj 5%)', Ingresos: q2Projected, Gastos: totalGastos * 1.03 },
    { period: 'Trimestre 3 (Proj 10%)', Ingresos: q3Projected, Gastos: totalGastos * 1.05 },
    { period: 'Trimestre 4 (Proj 15%)', Ingresos: q4Projected, Gastos: totalGastos * 1.08 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Banner */}
      <div className="glass-panel" style={{ padding: '1.35rem 1.75rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BarChart3 color="#6366f1" size={26} /> Métricas & Analíticas Financieras
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
          Visualización de la distribución de gastos por sector y proyecciones de crecimiento estilo Nutrición/Estadísticas
        </p>
      </div>

      {/* 4 Soft Pastel Overview Tiles (inspired by Nutrients Overview) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
        <div className="tile-card tile-card-mint">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>FACTURAS</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            {invoices.length} <span style={{ fontSize: '0.9rem', color: '#047857', fontWeight: '600' }}>Facturas</span>
          </div>
          <span className="badge badge-emerald">Ingreso $${totalIngresoFacturado.toLocaleString('es-MX')}</span>
        </div>

        <div className="tile-card tile-card-cyan">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>MEDIA INGRESO GLOBAL</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            ${totalIngresoGlobal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <span className="badge badge-cyan">Mes en curso</span>
        </div>

        <div className="tile-card tile-card-rose">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#be123c', textTransform: 'uppercase' }}>GASTOS POR TARJETA</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            ${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <span className="badge badge-rose">Egresos totales</span>
        </div>

        <div className="tile-card tile-card-amber">
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase' }}>% GASTO DE INGRESO</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0.3rem 0' }}>
            {totalIngresoGlobal > 0 ? ((totalGastos / totalIngresoGlobal) * 100).toFixed(1) : 0}%
          </div>
          <span className="badge badge-amber">Flujo Libre ${flujoLibre.toLocaleString('es-MX')}</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Sector Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieIcon size={20} color="#f59e0b" /> Gastos por Sector (% del Ingreso Total)
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Monto Gasto</th>
                  <th>% del Ingreso Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(sectorTotals).map(sec => {
                  const amount = sectorTotals[sec];
                  const pct = totalIngresoGlobal > 0 ? ((amount / totalIngresoGlobal) * 100).toFixed(1) : 0;
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

        {/* Circular Donut Ring Chart (Inspired by Nutrition Overview Donut Ring) */}
        <div className="glass-panel" style={{ padding: '1.5rem', height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#64748b', marginBottom: '0.5rem' }}>Distribución Porcentual de Sectores</h4>
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
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-MX')}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart Projections (Inspired by Statistics Bar Chart) */}
      <div className="glass-panel" style={{ padding: '1.5rem', height: '380px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} color="#10b981" /> Proyección Trimestral de Crecimiento (Plan 5% Mensual)
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
