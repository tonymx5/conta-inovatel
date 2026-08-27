import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Circle, 
  Search, 
  Sparkles, 
  CalendarCheck, 
  Layers, 
  ListOrdered,
  AlertCircle
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatDate, MONTH_NAMES } from '../utils/dateFormatter';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'fiscal', label: 'Fiscal SAT' },
  { id: 'pago', label: 'Pagos & Cobros' },
  { id: 'reunion', label: 'Reuniones' },
  { id: 'general', label: 'General / Operativo' }
];

const COLOR_THEMES = [
  { id: 'red', label: 'Rojo / Rosa Vibrante', bg: '#f43f5e', text: '#fff' },
  { id: 'blue', label: 'Azul Corporativo', bg: '#e0e7ff', text: '#1e1b4b' },
  { id: 'yellow', label: 'Amarillo Pastel', bg: '#fef9c3', text: '#1e1b4b' },
  { id: 'green', label: 'Verde Esmeralda', bg: '#dcfce7', text: '#064e3b' },
  { id: 'pink', label: 'Rosa Suave', bg: '#fce7f3', text: '#831843' },
  { id: 'indigo', label: 'Índigo Moderno', bg: '#ede9fe', text: '#3730a3' }
];

export default function AgendaModule({ userRole = 'admin' }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'agenda'
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00 PM',
    category: 'fiscal',
    colorTheme: 'blue'
  });

  useEffect(() => {
    loadEvents();

    const handleSync = () => {
      loadEvents();
    };

    window.addEventListener('conta_data_synced', handleSync);
    return () => window.removeEventListener('conta_data_synced', handleSync);
  }, []);

  const loadEvents = () => {
    const list = storageService.getAgendaEvents();
    setEvents(list);
  };

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Form Submit (Save / Edit)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const itemToSave = {
      id: editingId || undefined,
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: formData.date,
      time: formData.time || '12:00 PM',
      category: formData.category,
      colorTheme: formData.colorTheme,
      completed: false
    };

    const updated = storageService.saveAgendaEvent(itemToSave, userRole === 'admin' ? 'edson' : 'karla');
    setEvents(updated);
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (evt) => {
    setEditingId(evt.id);
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      date: evt.date || new Date().toISOString().split('T')[0],
      time: evt.time || '12:00 PM',
      category: evt.category || 'general',
      colorTheme: evt.colorTheme || 'blue'
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Confirmas que deseas eliminar este evento de la agenda?')) {
      const updated = storageService.deleteAgendaEvent(id, userRole === 'admin' ? 'edson' : 'karla');
      setEvents(updated);
    }
  };

  const handleToggleStatus = (id) => {
    const updated = storageService.toggleAgendaEventStatus(id, userRole === 'admin' ? 'edson' : 'karla');
    setEvents(updated);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      date: selectedDateStr || new Date().toISOString().split('T')[0],
      time: '12:00 PM',
      category: 'fiscal',
      colorTheme: 'blue'
    });
  };

  const openCreateModalForDate = (dateStr) => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      date: dateStr,
      time: '12:00 PM',
      category: 'fiscal',
      colorTheme: 'blue'
    });
    setShowModal(true);
  };

  // Calendar Month Grid Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true
      });
    }

    // Next month filler days to complete 35 or 42 cells grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextDate = new Date(year, month + 1, j);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        dayNum: j,
        dateStr,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  // Events on selected date
  const eventsOnSelectedDate = useMemo(() => {
    return events.filter(e => e.date === selectedDateStr);
  }, [events, selectedDateStr]);

  // Week days based on selectedDateStr
  const currentWeekDays = useMemo(() => {
    const baseDate = new Date(selectedDateStr + 'T12:00:00');
    const dayOfWeek = baseDate.getDay(); // 0 = Dom, 1 = Lun, etc.
    const sunday = new Date(baseDate);
    sunday.setDate(baseDate.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      week.push({
        dayName: WEEKDAYS[i],
        dayNum: d.getDate(),
        dateStr,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDateStr
      });
    }
    return week;
  }, [selectedDateStr]);

  // Filtered events for Agenda view
  const filteredAgendaEvents = useMemo(() => {
    return events.filter(evt => {
      const matchCategory = selectedCategoryFilter === 'all' || evt.category === selectedCategoryFilter;
      const matchSearch = !searchQuery || 
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (evt.description && evt.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [events, selectedCategoryFilter, searchQuery]);

  // General Statistics
  const totalEvents = events.length;
  const pendingEvents = events.filter(e => !e.completed).length;
  const completedEvents = events.filter(e => e.completed).length;
  const fiscalEvents = events.filter(e => e.category === 'fiscal').length;

  return (
    <div className="agenda-container">
      {/* Top Header Control Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem' }}>
        <div className="agenda-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #004ac6, #2563eb)', padding: '0.65rem', borderRadius: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0, 74, 198, 0.25)' }}>
              <CalendarIcon size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Agenda & Calendario Inteligente
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500', margin: 0 }}>
                Control Cronológico, Fechas SAT, Vencimientos & Sincronización Nube
              </p>
            </div>
          </div>

          {/* Sub-view Switcher & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="agenda-view-selector">
              <button 
                className={`agenda-view-btn ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
              >
                <CalendarDays size={16} />
                <span>Mes</span>
              </button>

              <button 
                className={`agenda-view-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              >
                <Layers size={16} />
                <span>Semana</span>
              </button>

              <button 
                className={`agenda-view-btn ${viewMode === 'day' ? 'active' : ''}`}
                onClick={() => setViewMode('day')}
              >
                <Clock size={16} />
                <span>Día</span>
              </button>

              <button 
                className={`agenda-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
                onClick={() => setViewMode('agenda')}
              >
                <ListOrdered size={16} />
                <span>Agenda</span>
              </button>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => { resetForm(); setShowModal(true); }}
              style={{
                background: 'linear-gradient(135deg, #004ac6, #2563eb)',
                boxShadow: '0 8px 20px rgba(0, 74, 198, 0.3)',
                padding: '0.6rem 1.2rem',
                fontSize: '0.86rem',
                fontWeight: '700'
              }}
            >
              <Plus size={18} /> Agregar
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(226, 232, 240, 0.7)' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>Total Eventos:</span>
            <b style={{ color: '#0f172a', fontSize: '1rem' }}>{totalEvents}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#dc2626', fontWeight: '600' }}>Pendientes:</span>
            <b style={{ color: '#dc2626', fontSize: '1rem' }}>{pendingEvents}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: '600' }}>Completados:</span>
            <b style={{ color: '#16a34a', fontSize: '1rem' }}>{completedEvents}</b>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#2563eb', fontWeight: '600' }}>Obligaciones SAT:</span>
            <b style={{ color: '#2563eb', fontSize: '1rem' }}>{fiscalEvents}</b>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VISTA MENSUAL (MES) */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Main Month Calendar Grid (Glassmorphism Card) */}
          <div className="glass-panel" style={{ gridColumn: 'span 2', padding: '1.5rem' }}>
            {/* Header: Month / Year Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={handlePrevMonth}
                  className="btn-icon"
                  style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', padding: '0.45rem', cursor: 'pointer' }}
                  title="Mes Anterior"
                >
                  <ChevronLeft size={20} color="#004ac6" />
                </button>

                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                  {MONTH_NAMES[month]} <span style={{ color: '#64748b', fontWeight: '500' }}>{year}</span>
                </h3>

                <button 
                  onClick={handleNextMonth}
                  className="btn-icon"
                  style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', padding: '0.45rem', cursor: 'pointer' }}
                  title="Mes Siguiente"
                >
                  <ChevronRight size={20} color="#004ac6" />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={handleToday}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', fontWeight: '700', borderRadius: '9999px' }}
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.4rem', background: 'rgba(241, 245, 249, 0.6)', borderRadius: '12px', padding: '0.4rem 0' }}>
              {WEEKDAYS.map((w, idx) => (
                <div key={idx} className="calendar-weekday-header" style={{ color: idx === 0 || idx === 6 ? '#94a3b8' : '#004ac6' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="calendar-month-grid">
              {calendarDays.map((day, idx) => {
                const dayEvents = events.filter(e => e.date === day.dateStr);
                const isSelected = day.dateStr === selectedDateStr;
                const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={idx}
                    className={`calendar-day-box ${!day.isCurrentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    onDoubleClick={() => openCreateModalForDate(day.dateStr)}
                    title={dayEvents.length > 0 ? `${dayEvents.length} evento(s) en este día. Doble clic para agregar.` : 'Doble clic para agregar evento'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="calendar-day-number">{day.dayNum}</span>
                      {isToday && (
                        <span style={{ fontSize: '0.65rem', background: '#004ac6', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '9999px', fontWeight: '700' }}>
                          Hoy
                        </span>
                      )}
                    </div>

                    {dayEvents.length > 0 && (
                      <div className="calendar-events-dots">
                        {dayEvents.slice(0, 4).map((evt) => {
                          const theme = COLOR_THEMES.find(t => t.id === evt.colorTheme) || COLOR_THEMES[0];
                          return (
                            <span 
                              key={evt.id} 
                              className="calendar-event-dot" 
                              style={{ background: theme.bg }} 
                              title={`${evt.time} - ${evt.title}`}
                            />
                          );
                        })}
                        {dayEvents.length > 4 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b' }}>
                            +{dayEvents.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Selected Day Overview & Quote Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Day Overview Card */}
            <div className="glass-panel" style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '0.65rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {formatDate(selectedDateStr)}
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '500' }}>
                    {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? 'evento programado' : 'eventos programados'}
                  </span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => openCreateModalForDate(selectedDateStr)}
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={14} /> Nueva Tarea
                </button>
              </div>

              {eventsOnSelectedDate.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  <CalendarCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.6rem auto' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>Sin tareas en este día</p>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0.3rem 0 0 0' }}>Haz clic en "+ Nueva Tarea" para programar.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
                  {eventsOnSelectedDate.map(evt => (
                    <div 
                      key={evt.id} 
                      className={`agenda-card theme-${evt.colorTheme || 'blue'}`}
                      style={{ padding: '0.85rem 1rem', opacity: evt.completed ? 0.65 : 1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <button 
                            onClick={() => handleToggleStatus(evt.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                            title={evt.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            {evt.completed ? (
                              <CheckCircle2 size={18} color="#16a34a" />
                            ) : (
                              <Circle size={18} color="#94a3b8" />
                            )}
                          </button>
                          <div>
                            <h5 className="card-title" style={{ fontSize: '0.92rem', fontWeight: '700', margin: 0, textDecoration: evt.completed ? 'line-through' : 'none' }}>
                              {evt.title}
                            </h5>
                            {evt.description && (
                              <p className="card-desc" style={{ fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                                {evt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                          <span className="card-time" style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                            {evt.time}
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button onClick={() => handleEdit(evt)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Editar">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Eliminar">
                              <Trash2 size={14} color="#f43f5e" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspiration & SAT Alert Quote Block (Chronos Precision Aesthetic) */}
            <div className="tile-card tile-card-peach" style={{ padding: '1.25rem', border: '1px solid rgba(254, 215, 170, 0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', color: '#c2410c' }}>
                <Sparkles size={18} />
                <span style={{ fontSize: '0.82rem', fontWeight: '800' }}>Enfoque y Productividad Conta Inovatel</span>
              </div>
              <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#7c2d12', margin: '0 0 0.8rem 0', lineHeight: 1.4 }}>
                "En el aquí y ahora, tocamos la belleza atemporal del orden y la precisión financiera."
              </p>
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '0.55rem 0.8rem', border: '1px solid rgba(254, 215, 170, 0.9)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} color="#ea580c" />
                <span style={{ fontSize: '0.76rem', color: '#9a3412', fontWeight: '700' }}>
                  Recordatorio SAT: Declaración mensual el día 17 de cada mes.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VISTA SEMANAL (SEMANA) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {/* Week Strip Navigation */}
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '1rem' }}>
            <div className="agenda-week-strip">
              {currentWeekDays.map((day, idx) => {
                const dayEvts = events.filter(e => e.date === day.dateStr);
                return (
                  <button
                    key={idx}
                    className={`agenda-week-day-btn ${day.isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                  >
                    <span className="agenda-week-day-label" style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
                      {day.dayName}
                    </span>
                    <span className="agenda-week-day-num" style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                      {day.dayNum}
                    </span>
                    {dayEvts.length > 0 && (
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#004ac6', marginTop: '2px' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline of Week / Selected Date */}
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Tareas para {formatDate(selectedDateStr)}
              </h3>
              <button 
                className="btn-primary" 
                onClick={() => openCreateModalForDate(selectedDateStr)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
              >
                <Plus size={15} /> Agregar Evento
              </button>
            </div>

            {eventsOnSelectedDate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <CalendarCheck size={42} color="#cbd5e1" style={{ margin: '0 auto 0.8rem auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>No hay tareas asignadas a este día de la semana.</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.4rem 0 0 0' }}>Usa el botón "+ Agregar Evento" para agendar.</p>
              </div>
            ) : (
              <div className="timeline-track" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {eventsOnSelectedDate.map((evt, idx) => (
                  <div key={evt.id} style={{ position: 'relative' }}>
                    <div className={`timeline-node ${idx === 0 ? 'active' : ''}`} />
                    <div className={`agenda-card theme-${evt.colorTheme || 'blue'}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <button 
                            onClick={() => handleToggleStatus(evt.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {evt.completed ? <CheckCircle2 size={20} color="#16a34a" /> : <Circle size={20} color="#94a3b8" />}
                          </button>
                          <h4 className="card-title" style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, textDecoration: evt.completed ? 'line-through' : 'none' }}>
                            {evt.title}
                          </h4>
                        </div>
                        <span className="card-time" style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '8px' }}>
                          {evt.time}
                        </span>
                      </div>

                      {evt.description && (
                        <p className="card-desc" style={{ fontSize: '0.85rem', margin: '0.3rem 0 0.6rem 1.8rem', lineHeight: 1.4 }}>
                          {evt.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingLeft: '1.8rem' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.4)', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {evt.category}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEdit(evt)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Editar">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => handleDelete(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Eliminar">
                            <Trash2 size={15} color="#f43f5e" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VISTA DIARIA (DÍA) */}
      {/* ========================================================================= */}
      {viewMode === 'day' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {/* Top Day Header Navigator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button 
                onClick={() => {
                  const d = new Date(selectedDateStr + 'T12:00:00');
                  d.setDate(d.getDate() - 1);
                  setSelectedDateStr(d.toISOString().split('T')[0]);
                }}
                className="btn-icon"
                style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', padding: '0.45rem', cursor: 'pointer' }}
                title="Día Anterior"
              >
                <ChevronLeft size={20} color="#004ac6" />
              </button>

              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {formatDate(selectedDateStr)}
              </h3>

              <button 
                onClick={() => {
                  const d = new Date(selectedDateStr + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  setSelectedDateStr(d.toISOString().split('T')[0]);
                }}
                className="btn-icon"
                style={{ background: 'rgba(241, 245, 249, 0.8)', border: 'none', borderRadius: '50%', padding: '0.45rem', cursor: 'pointer' }}
                title="Día Siguiente"
              >
                <ChevronRight size={20} color="#004ac6" />
              </button>

              <button 
                onClick={handleToday}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', fontWeight: '700', borderRadius: '9999px', marginLeft: '0.4rem' }}
              >
                Hoy
              </button>
            </div>

            <button 
              className="btn-primary" 
              onClick={() => openCreateModalForDate(selectedDateStr)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              <Plus size={16} /> Agregar Tarea al Día
            </button>
          </div>

          {/* Timeline of the Day */}
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {eventsOnSelectedDate.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                <Clock size={48} color="#cbd5e1" style={{ margin: '0 auto 0.8rem auto' }} />
                <p style={{ fontSize: '1.05rem', fontWeight: '700', color: '#334155', margin: 0 }}>No hay compromisos en este día</p>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.4rem 0 1rem 0' }}>Planifica tus pagos, declaraciones del SAT o reuniones.</p>
                <button 
                  className="btn-primary" 
                  onClick={() => openCreateModalForDate(selectedDateStr)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem' }}
                >
                  <Plus size={15} /> Programar Tarea
                </button>
              </div>
            ) : (
              <div className="timeline-track" style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                {eventsOnSelectedDate.map((evt, idx) => (
                  <div key={evt.id} style={{ position: 'relative' }}>
                    <div className={`timeline-node ${idx === 0 ? 'active' : ''}`} />
                    <div className={`agenda-card theme-${evt.colorTheme || 'blue'}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <button 
                            onClick={() => handleToggleStatus(evt.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {evt.completed ? <CheckCircle2 size={22} color="#16a34a" /> : <Circle size={22} color="#94a3b8" />}
                          </button>
                          <h4 className="card-title" style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, textDecoration: evt.completed ? 'line-through' : 'none' }}>
                            {evt.title}
                          </h4>
                        </div>
                        <span className="card-time" style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.25rem 0.65rem', borderRadius: '8px' }}>
                          {evt.time}
                        </span>
                      </div>

                      {evt.description && (
                        <p className="card-desc" style={{ fontSize: '0.86rem', margin: '0.4rem 0 0.75rem 2rem', lineHeight: 1.45 }}>
                          {evt.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingLeft: '2rem' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.4)', padding: '0.15rem 0.55rem', borderRadius: '9999px', fontWeight: '700', textTransform: 'uppercase' }}>
                          {evt.category}
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                          <button onClick={() => handleEdit(evt)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Editar">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Eliminar">
                            <Trash2 size={16} color="#f43f5e" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VISTA DE AGENDA (LISTA / CRONOGRAMA CONTINUO) */}
      {/* ========================================================================= */}
      {viewMode === 'agenda' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {/* Filter & Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '1rem' }}>
            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '9999px',
                    border: '1px solid',
                    fontSize: '0.78rem',
                    fontWeight: selectedCategoryFilter === cat.id ? '800' : '600',
                    background: selectedCategoryFilter === cat.id ? '#004ac6' : 'rgba(255, 255, 255, 0.7)',
                    color: selectedCategoryFilter === cat.id ? '#ffffff' : '#64748b',
                    borderColor: selectedCategoryFilter === cat.id ? '#004ac6' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar tareas en agenda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.1rem', fontSize: '0.82rem', height: '36px' }}
              />
            </div>
          </div>

          {/* Continuous List of Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {filteredAgendaEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <CalendarCheck size={42} color="#cbd5e1" style={{ margin: '0 auto 0.8rem auto' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>No se encontraron tareas con los filtros seleccionados.</p>
              </div>
            ) : (
              filteredAgendaEvents.map(evt => (
                <div 
                  key={evt.id} 
                  className={`agenda-card theme-${evt.colorTheme || 'blue'}`}
                  style={{ opacity: evt.completed ? 0.65 : 1 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
                      <button 
                        onClick={() => handleToggleStatus(evt.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                      >
                        {evt.completed ? <CheckCircle2 size={20} color="#16a34a" /> : <Circle size={20} color="#94a3b8" />}
                      </button>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <h4 className="card-title" style={{ fontSize: '0.98rem', fontWeight: '800', margin: 0, textDecoration: evt.completed ? 'line-through' : 'none' }}>
                            {evt.title}
                          </h4>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.45)', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: '700', textTransform: 'uppercase' }}>
                            {evt.category}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="card-desc" style={{ fontSize: '0.82rem', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
                          {formatDate(evt.date)}
                        </div>
                        <span className="card-time" style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '6px', display: 'inline-block', marginTop: '2px' }}>
                          {evt.time}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => handleEdit(evt)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Editar">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(evt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }} title="Eliminar">
                          <Trash2 size={16} color="#f43f5e" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR / EDITAR EVENTO */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-card" style={{ maxWidth: '520px', width: '92%', borderRadius: '20px', padding: '1.75rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={20} color="#004ac6" />
                <h3 style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.15rem', margin: 0 }}>
                  {editingId ? 'Editar Evento en Agenda' : 'Nuevo Evento en Agenda'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Title */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155' }}>
                    Título / Compromiso:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Pago Provisional SAT, Pago Proveedor SYSCOM..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                {/* Date & Time Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155' }}>
                      Fecha:
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155' }}>
                      Hora:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: 12:00 PM, 03:30 PM"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Category Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155' }}>
                    Categoría:
                  </label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="fiscal">Fiscal SAT (Impuestos & Declaraciones)</option>
                    <option value="pago">Pago / Cobranza a Proveedores</option>
                    <option value="reunion">Reunión de Clientes / Estrategia</option>
                    <option value="general">General / Operativo</option>
                  </select>
                </div>

                {/* Color Theme Selector */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155', marginBottom: '0.4rem', display: 'block' }}>
                    Color Temático (Chronos Precision):
                  </label>
                  <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {COLOR_THEMES.map(theme => (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setFormData({ ...formData, colorTheme: theme.id })}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: theme.bg,
                          border: formData.colorTheme === theme.id ? '3px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          boxShadow: formData.colorTheme === theme.id ? '0 0 0 2px #fff, 0 4px 10px rgba(0,0,0,0.2)' : 'none',
                          transform: formData.colorTheme === theme.id ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.2s ease'
                        }}
                        title={theme.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#334155' }}>
                    Descripción / Notas Adicionales:
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Detalles del compromiso, notas fiscales o acuerdos..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)', paddingTop: '0.85rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #004ac6, #2563eb)' }}
                >
                  {editingId ? 'Guardar Cambios' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
