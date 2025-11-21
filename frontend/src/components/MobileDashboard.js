import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MobileDashboard.css';
import AudioPlayer from './AudioPlayer';

// Мемоизированный компонент карточки звонка
const CallCard = React.memo(({ call, API_URL, formatPhoneNumber, formatDateTime, formatDuration, mappingName }) => {
  return (
    <div className="mobile-call-card">
      <div className="mobile-card-header">
        <div className="mobile-card-number">
          {formatPhoneNumber(call.callfrom)}
          {mappingName && <div className="mobile-mapping-name">{mappingName}</div>}
        </div>
        <div className="mobile-card-badges">
          <span className={`mobile-badge ${call.disposition === 'ANSWERED' ? 'badge-success' : 'badge-danger'}`}>
            {call.disposition === 'ANSWERED' ? 'Принят' : call.disposition === 'BUSY' ? 'Занято' : 'Пропущен'}
          </span>
          <span className={`mobile-badge ${call.direction === 'inbound' ? 'badge-primary' : 'badge-secondary'}`}>
            {call.direction === 'inbound' ? 'Вх' : 'Исх'}
          </span>
        </div>
      </div>

      <div className="mobile-card-body">
        <div className="mobile-card-row">
          <span className="mobile-label">Время:</span>
          <span className="mobile-value">{formatDateTime(call.calldate)}</span>
        </div>
        {call.callto1 && (
          <div className="mobile-card-row">
            <span className="mobile-label">Куда:</span>
            <span className="mobile-value">{formatPhoneNumber(call.callto1)}</span>
          </div>
        )}
        {call.billsec > 0 && (
          <div className="mobile-card-row">
            <span className="mobile-label">Длительность:</span>
            <span className="mobile-value">{formatDuration(call.billsec)}</span>
          </div>
        )}
      </div>

      {call.recordingfile && (
        <div className="mobile-card-audio">
          <AudioPlayer
            src={`${API_URL}/api/recordings/${call.recordingfile}`}
            compact={true}
          />
        </div>
      )}
    </div>
  );
});

const MobileDashboard = ({ user, organization, onLogout, onChangeOrganization }) => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [unprocessedCalls, setUnprocessedCalls] = useState([]);
  const [statistics, setStatistics] = useState({
    accepted: 0,
    missed: 0,
    total: 0,
    notRedialed: 0
  });
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [callType, setCallType] = useState('all');
  const [activeTab, setActiveTab] = useState('stats'); // stats, active, unprocessed, all
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const isAdmin = user?.organizations?.some(org => org.role === 'admin');
  const phoneMappings = organization?.phone_mappings || [];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [organization, timeRange, refreshInterval, callType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const callsParams = { orgId: organization.orgId, limit: 100, timeRange };
      if (callType !== 'all') callsParams.direction = callType;

      const [callsRes, unprocessedRes, statsRes, activeRes] = await Promise.all([
        axios.get(`${API_URL}/api/calls`, { params: callsParams }),
        axios.get(`${API_URL}/api/calls-unprocessed`, { params: { orgId: organization.orgId, limit: 100, timeRange } }),
        axios.get(`${API_URL}/api/statistics/summary`, { params: { orgId: organization.orgId, timeRange } }),
        axios.get(`${API_URL}/api/calls-active`, { params: { orgId: organization.orgId } })
      ]);

      setCalls(callsRes.data);
      setUnprocessedCalls(unprocessedRes.data);
      setActiveCalls(activeRes.data);
      setStatistics({
        accepted: statsRes.data.answered_calls,
        missed: statsRes.data.missed_calls,
        total: statsRes.data.total_calls,
        notRedialed: statsRes.data.not_redialed
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Мемоизированные функции форматирования
  const getPhoneMappingName = useCallback((phone) => {
    if (!phone || phoneMappings.length === 0) return null;
    const normalizedPhone = String(phone).replace(/\D/g, '');
    const mapping = phoneMappings.find(m => {
      const mappingPhone = String(m.phone_number).replace(/\D/g, '');
      return normalizedPhone.includes(mappingPhone) || mappingPhone.includes(normalizedPhone);
    });
    return mapping ? mapping.display_name : null;
  }, [phoneMappings]);

  const formatPhoneNumber = useCallback((phone) => {
    if (!phone) return '';
    const phoneStr = String(phone).replace(/\D/g, '');
    if (phoneStr.length === 10) return `+7${phoneStr}`;
    if (phoneStr.length === 11 && phoneStr.startsWith('7')) return `+${phoneStr}`;
    if (phoneStr.length === 11 && phoneStr.startsWith('8')) return `+7${phoneStr.slice(1)}`;
    return phone;
  }, []);

  const formatDateTime = useCallback((dateTimeStr) => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month} ${hours}:${minutes}`;
    } catch (e) {
      return dateTimeStr;
    }
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Мемоизированная фильтрация
  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    return calls.filter(call =>
      String(call.callfrom).includes(searchQuery) ||
      String(call.callto1).includes(searchQuery) ||
      String(call.callto2 || '').includes(searchQuery)
    );
  }, [calls, searchQuery]);

  const filteredActiveCalls = useMemo(() => {
    if (!searchQuery) return activeCalls;
    return activeCalls.filter(call =>
      String(call.callfrom).includes(searchQuery) ||
      String(call.callto1).includes(searchQuery) ||
      String(call.callto2 || '').includes(searchQuery)
    );
  }, [activeCalls, searchQuery]);

  const filteredUnprocessedCalls = useMemo(() => {
    if (!searchQuery) return unprocessedCalls;
    return unprocessedCalls.filter(call =>
      String(call.callfrom).includes(searchQuery) ||
      String(call.callto1).includes(searchQuery) ||
      String(call.callto2 || '').includes(searchQuery)
    );
  }, [unprocessedCalls, searchQuery]);

  const renderCallCard = useCallback((call) => {
    const mappingName = getPhoneMappingName(call.callto1) || getPhoneMappingName(call.callto2);

    return (
      <CallCard
        key={call.id}
        call={call}
        API_URL={API_URL}
        formatPhoneNumber={formatPhoneNumber}
        formatDateTime={formatDateTime}
        formatDuration={formatDuration}
        mappingName={mappingName}
      />
    );
  }, [API_URL, formatPhoneNumber, formatDateTime, formatDuration, getPhoneMappingName]);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return (
          <div className="mobile-stats">
            <div className="stat-card stat-total">
              <div className="stat-value">{statistics.total}</div>
              <div className="stat-label">Всего звонков</div>
            </div>
            <div className="stat-card stat-accepted">
              <div className="stat-value">{statistics.accepted}</div>
              <div className="stat-label">Принятых</div>
            </div>
            <div className="stat-card stat-missed">
              <div className="stat-value">{statistics.missed}</div>
              <div className="stat-label">Пропущенных</div>
            </div>
            <div className="stat-card stat-not-redialed">
              <div className="stat-value">{statistics.notRedialed}</div>
              <div className="stat-label">Не перезвонили</div>
            </div>
          </div>
        );

      case 'active':
        return (
          <div className="mobile-calls-list">
            {filteredActiveCalls.length === 0 ? (
              <div className="mobile-empty">Нет активных звонков</div>
            ) : (
              filteredActiveCalls.map(renderCallCard)
            )}
          </div>
        );

      case 'unprocessed':
        return (
          <div className="mobile-calls-list">
            {filteredUnprocessedCalls.length === 0 ? (
              <div className="mobile-empty">Нет необработанных звонков</div>
            ) : (
              filteredUnprocessedCalls.map(renderCallCard)
            )}
          </div>
        );

      case 'all':
        return (
          <div className="mobile-calls-list">
            {filteredCalls.map(renderCallCard)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mobile-dashboard">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Header */}
      <div className="mobile-header">
        <button className="mobile-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            ) : (
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            )}
          </svg>
        </button>

        <div className="mobile-org-logo">
          {organization.logo_url ? (
            <img src={`${API_URL}${organization.logo_url}`} alt={organization.name} />
          ) : (
            <span>{organization.name}</span>
          )}
        </div>

        <button className="mobile-refresh" onClick={fetchData} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={loading ? 'spin' : ''}>
            <path d="M21 3V8M21 8H16M21 8L18 5.29C16.93 4.11 15.49 3.33 13.87 3.1C12.25 2.87 10.59 3.18 9.14 4C7.68 4.82 6.53 6.11 5.87 7.66C5.21 9.21 5.08 10.92 5.5 12.55C5.92 14.18 6.87 15.62 8.2 16.64C9.53 17.66 11.17 18.19 12.85 18.14C14.53 18.09 16.14 17.45 17.41 16.34C18.68 15.23 19.54 13.72 19.86 12.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Side Menu */}
      <div className={`mobile-side-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span>{user.name}</span>
        </div>

        <div className="mobile-menu-section">
          <label>Период</label>
          <select value={timeRange} onChange={(e) => { setTimeRange(e.target.value); setMobileMenuOpen(false); }}>
            <option value="1h">1 час</option>
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
          </select>
        </div>

        <div className="mobile-menu-section">
          <label>Тип звонка</label>
          <select value={callType} onChange={(e) => { setCallType(e.target.value); setMobileMenuOpen(false); }}>
            <option value="all">Все</option>
            <option value="inbound">Входящие</option>
            <option value="outbound">Исходящие</option>
          </select>
        </div>

        <div className="mobile-menu-section">
          <label>Обновление</label>
          <select value={refreshInterval} onChange={(e) => { setRefreshInterval(Number(e.target.value)); setMobileMenuOpen(false); }}>
            <option value="1">1 сек</option>
            <option value="5">5 сек</option>
            <option value="10">10 сек</option>
            <option value="30">30 сек</option>
            <option value="60">1 мин</option>
          </select>
        </div>

        {isAdmin && (
          <>
            <button className="mobile-menu-btn" onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}>
              Админ панель
            </button>
            <button className="mobile-menu-btn" onClick={() => { onChangeOrganization(); setMobileMenuOpen(false); }}>
              Сменить организацию
            </button>
          </>
        )}

        <button className="mobile-menu-btn mobile-menu-btn-logout" onClick={() => { onLogout(); setMobileMenuOpen(false); }}>
          Выйти
        </button>
      </div>

      {/* Search */}
      {activeTab !== 'stats' && (
        <div className="mobile-search">
          <input
            type="text"
            placeholder="Поиск по номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mobile-tabs">
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 16L12 11L15 14L20 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Статистика</span>
        </button>
        <button
          className={activeTab === 'active' ? 'active' : ''}
          onClick={() => setActiveTab('active')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          <span>Активные ({activeCalls.length})</span>
        </button>
        <button
          className={activeTab === 'unprocessed' ? 'active' : ''}
          onClick={() => setActiveTab('unprocessed')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 8V12L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>Необраб. ({unprocessedCalls.length})</span>
        </button>
        <button
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Все</span>
        </button>
      </div>

      {/* Content */}
      <div className="mobile-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default MobileDashboard;
