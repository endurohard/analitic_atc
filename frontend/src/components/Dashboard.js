import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Dashboard.css';
import CallsTable from './CallsTable';
import Statistics from './Statistics';
import MissedCallsNotification from './MissedCallsNotification';
import ThemeToggle from './ThemeToggle';

const Dashboard = ({ user, organization, onLogout, onChangeOrganization }) => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [unprocessedCalls, setUnprocessedCalls] = useState([]);
  const [statistics, setStatistics] = useState({
    accepted: 345,
    missed: 41,
    total: 386,
    notRedialed: 4
  });
  const [mappingStatistics, setMappingStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(30); // в секундах
  const [callType, setCallType] = useState('all'); // all, inbound, outbound
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [appliedCustomDates, setAppliedCustomDates] = useState(false);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth - 32);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Server-side pagination state
  const [callsPage, setCallsPage] = useState(1);
  const [callsPerPage, setCallsPerPage] = useState(15);
  const [callsTotalCount, setCallsTotalCount] = useState(0);
  const [callsSearchQuery, setCallsSearchQuery] = useState('');

  // Layout state для react-grid-layout
  const defaultLayout = [
    { i: 'statistics', x: 0, y: 0, w: 12, h: 4, minW: 3, minH: 1 },
    { i: 'active-calls', x: 0, y: 4, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 'unprocessed-calls', x: 6, y: 4, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 'calls-list', x: 0, y: 9, w: 12, h: 6, minW: 6, minH: 5 }
  ];

  const [layout, setLayout] = useState(defaultLayout);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [columnWidths, setColumnWidths] = useState({});
  const [phoneMappings, setPhoneMappings] = useState(organization?.phone_mappings || []);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Проверка, является ли пользователь администратором
  const isAdmin = user?.organizations?.some(org => org.role === 'admin');

  // Загрузка layout при монтировании компонента или смене организации
  useEffect(() => {
    setLayoutLoaded(false);
    loadLayout();
  }, [organization]);

  // Актуализация phone_mappings (после правок в Admin Panel без перезагрузки)
  useEffect(() => {
    const orgId = organization?.orgId;
    if (!orgId) return;
    let cancelled = false;
    const loadMappings = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/phone-mappings/${orgId}`);
        if (cancelled) return;
        setPhoneMappings(res.data || []);
      } catch (e) {
        // тихо: используем уже кэшированные маппинги из organization
      }
    };
    loadMappings();
    const onFocus = () => loadMappings();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [organization?.orgId, API_URL]);

  const organizationWithMappings = { ...organization, phone_mappings: phoneMappings };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [organization, timeRange, refreshInterval, callType, appliedStartDate, appliedEndDate, appliedCustomDates]);

  // Fetch only calls when page/perPage/search changes + periodic refresh
  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [callsPage, callsPerPage, callsSearchQuery, organization, timeRange, refreshInterval, callType, appliedStartDate, appliedEndDate, appliedCustomDates]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCallsPage(1);
  }, [timeRange, callType, appliedStartDate, appliedEndDate, appliedCustomDates, callsSearchQuery]);

  // Отслеживание изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth - 32);
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка layout из API
  const loadLayout = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard-layout/${organization.orgId}`);

      if (response.data.layout_data) {
        const layoutItems = response.data.layout_data.items || response.data.layout_data;
        if (Array.isArray(layoutItems)) {
          setLayout(layoutItems);
        } else {
          setLayout(defaultLayout);
        }

        if (response.data.layout_data.columnWidths) {
          setColumnWidths(response.data.layout_data.columnWidths);
        } else {
          setColumnWidths({});
        }
      } else {
        setLayout(defaultLayout);
        setColumnWidths({});
      }
    } catch (error) {
      console.error('Ошибка загрузки layout:', error);
      setLayout(defaultLayout);
      setColumnWidths({});
    } finally {
      setLayoutLoaded(true);
    }
  };

  // Обработчик изменения layout
  const onLayoutChange = async (newLayout) => {
    setLayout(newLayout);

    if (!isAdmin || !layoutLoaded) return;

    try {
      await axios.post(`${API_URL}/api/dashboard-layout`, {
        org_id: parseInt(organization.orgId),
        layout_data: {
          items: newLayout,
          columnWidths: columnWidths
        }
      });
    } catch (error) {
      console.error('Ошибка сохранения layout:', error);
    }
  };

  // Обработчик изменения ширины колонок
  const saveLayoutWithColumnWidthsRef = useRef(null);

  const saveLayoutWithColumnWidths = useCallback((newColumnWidths) => {
    if (!isAdmin || !layoutLoaded) return;

    if (saveLayoutWithColumnWidthsRef.current) {
      clearTimeout(saveLayoutWithColumnWidthsRef.current);
    }

    saveLayoutWithColumnWidthsRef.current = setTimeout(async () => {
      try {
        await axios.post(`${API_URL}/api/dashboard-layout`, {
          org_id: parseInt(organization.orgId),
          layout_data: {
            items: layout,
            columnWidths: newColumnWidths
          }
        });
      } catch (error) {
        console.error('Ошибка сохранения column widths:', error);
      }
    }, 500);
  }, [isAdmin, layoutLoaded, layout, organization.orgId, API_URL]);

  // Сброс layout
  const resetLayout = async () => {
    setLayout(defaultLayout);
    setColumnWidths({});

    try {
      await axios.delete(`${API_URL}/api/dashboard-layout/${organization.orgId}`);
    } catch (error) {
      console.error('Ошибка сброса layout:', error);
    }
  };

  // Применить layout ко всем организациям
  const applyLayoutToAll = async () => {
    if (!window.confirm('Применить текущее расположение панелей и размеры колонок ко всем вашим организациям?')) {
      return;
    }

    try {
      const userOrgs = user?.organizations || [];
      let successCount = 0;
      for (const org of userOrgs) {
        try {
          await axios.post(`${API_URL}/api/dashboard-layout`, {
            org_id: parseInt(org.orgId),
            layout_data: {
              items: layout,
              columnWidths: columnWidths
            }
          });
          successCount++;
        } catch (err) {
          console.error(`Failed for org ${org.orgId}:`, err);
        }
      }

      alert(`Layout применен к ${successCount} из ${userOrgs.length} организаций`);
    } catch (error) {
      console.error('Ошибка применения layout:', error);
      alert('Ошибка при применении layout');
    }
  };

  // Build calls params
  const buildCallsParams = (page, perPage, search) => {
    const params = {
      orgId: organization.orgId,
      skip: (page - 1) * perPage,
      limit: perPage,
      timeRange: timeRange
    };
    if (callType !== 'all') {
      params.direction = callType;
    }
    if (appliedCustomDates) {
      if (appliedStartDate) params.startDate = appliedStartDate;
      if (appliedEndDate) params.endDate = appliedEndDate;
      delete params.timeRange;
    }
    if (search) {
      params.search = search;
    }
    return params;
  };

  // Fetch only calls (for pagination/search changes)
  const fetchCalls = async () => {
    try {
      const callsParams = buildCallsParams(callsPage, callsPerPage, callsSearchQuery);
      const callsResponse = await axios.get(`${API_URL}/api/calls`, { params: callsParams });
      setCalls(callsResponse.data.calls || []);
      setCallsTotalCount(callsResponse.data.total || 0);
    } catch (error) {
      console.error('Error fetching calls:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {

      // Загружаем необработанные звонки
      const unprocessedParams = { orgId: organization.orgId, limit: 100, timeRange: timeRange };
      if (appliedCustomDates) {
        if (appliedStartDate) unprocessedParams.startDate = appliedStartDate;
        if (appliedEndDate) unprocessedParams.endDate = appliedEndDate;
        delete unprocessedParams.timeRange;
      }
      const unprocessedResponse = await axios.get(`${API_URL}/api/calls-unprocessed`, {
        params: unprocessedParams
      });
      setUnprocessedCalls(unprocessedResponse.data);

      // Загружаем статистику
      const statsParams = { orgId: organization.orgId, timeRange: timeRange };
      if (appliedCustomDates) {
        if (appliedStartDate) statsParams.startDate = appliedStartDate;
        if (appliedEndDate) statsParams.endDate = appliedEndDate;
        delete statsParams.timeRange;
      }
      const statsResponse = await axios.get(`${API_URL}/api/statistics/summary`, {
        params: statsParams
      });

      setStatistics({
        accepted: statsResponse.data.answered_calls,
        missed: statsResponse.data.missed_calls,
        total: statsResponse.data.total_calls,
        notRedialed: statsResponse.data.not_redialed
      });

      // Загружаем статистику по маппингам
      if (organization.phone_mappings && organization.phone_mappings.length > 0) {
        try {
          const mappingStatsResponse = await axios.get(`${API_URL}/api/statistics/by-mapping`, {
            params: statsParams
          });
          setMappingStatistics(mappingStatsResponse.data);
        } catch (error) {
          console.error('Error loading mapping statistics:', error);
          setMappingStatistics([]);
        }
      } else {
        setMappingStatistics([]);
      }

      // Загружаем активные звонки
      const activeResponse = await axios.get(`${API_URL}/api/calls-active`, {
        params: { orgId: organization.orgId }
      });
      setActiveCalls(activeResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Mobile menu overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          {isMobile && (
            <button
              className="hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Меню"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                )}
              </svg>
            </button>
          )}
          <div className="org-badge">
            {organization.logo_url ? (
              <>
                <img
                  src={`${API_URL}${organization.logo_url}`}
                  alt={organization.name}
                  style={{ height: '60px', maxWidth: '200px', objectFit: 'contain' }}
                />
                <div>
                  <span className="user-name">{user.name}</span>
                </div>
              </>
            ) : (
              <>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L4 6V12C4 16.42 7.24 20.58 12 22C16.76 20.58 20 16.42 20 12V6L12 2Z"
                    fill="currentColor"
                  />
                </svg>
                <div>
                  <h2>{organization.name}</h2>
                  <span className="user-name">{user.name}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className={`header-right ${isMobile && mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          <select
            className="time-selector"
            value={callType}
            onChange={(e) => {
              setCallType(e.target.value);
              if (isMobile) setMobileMenuOpen(false);
            }}
            title="Тип звонка"
          >
            <option value="all">Все звонки</option>
            <option value="inbound">Входящие</option>
            <option value="outbound">Исходящие</option>
          </select>
          <select
            className="time-selector"
            value={refreshInterval}
            onChange={(e) => {
              setRefreshInterval(Number(e.target.value));
              if (isMobile) setMobileMenuOpen(false);
            }}
            title="Интервал автообновления"
          >
            <option value="1">Обновление: 1 сек</option>
            <option value="5">Обновление: 5 сек</option>
            <option value="10">Обновление: 10 сек</option>
            <option value="30">Обновление: 30 сек</option>
            <option value="60">Обновление: 1 мин</option>
          </select>
          <select
            className="time-selector"
            value={useCustomDates ? 'custom' : timeRange}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustomDates(true);
              } else {
                setUseCustomDates(false);
                setAppliedCustomDates(false);
                setTimeRange(e.target.value);
              }
              if (isMobile) setMobileMenuOpen(false);
            }}
          >
            <option value="1h">Последний 1 час</option>
            <option value="24h">Последние 24 часа</option>
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="custom">Произвольный период</option>
          </select>
          {useCustomDates && (
            <>
              <input
                type="date"
                className="date-picker"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Дата начала"
              />
              <input
                type="date"
                className="date-picker"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Дата окончания"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  setAppliedStartDate(startDate);
                  setAppliedEndDate(endDate);
                  setAppliedCustomDates(true);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                disabled={!startDate && !endDate}
              >
                Применить
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => {
                navigate('/admin');
                if (isMobile) setMobileMenuOpen(false);
              }}>
                Админ панель
              </button>
              <button className="btn btn-secondary" onClick={() => {
                applyLayoutToAll();
                if (isMobile) setMobileMenuOpen(false);
              }} title="Применить текущее расположение ко всем организациям">
                Применить ко всем
              </button>
              <button className="btn btn-secondary" onClick={() => {
                resetLayout();
                if (isMobile) setMobileMenuOpen(false);
              }} title="Сбросить расположение панелей">
                Сбросить layout
              </button>
              <button className="btn btn-secondary" onClick={() => {
                onChangeOrganization();
                if (isMobile) setMobileMenuOpen(false);
              }}>
                Сменить организацию
              </button>
            </>
          )}
          <ThemeToggle />
          <button className="btn btn-secondary" onClick={() => {
            onLogout();
            if (isMobile) setMobileMenuOpen(false);
          }}>
            Выйти
          </button>
        </div>
      </div>

      <GridLayout
        className="dashboard-content"
        layout={layout}
        cols={12}
        rowHeight={50}
        width={containerWidth}
        onLayoutChange={onLayoutChange}
        draggableHandle=".section-header"
        isDraggable={isAdmin}
        isResizable={isAdmin}
      >
        {/* Statistics */}
        <div key="statistics" className="section">
          <div className="section-header">
            <h3>Статистика</h3>
          </div>
          <div className="section-content">
            <Statistics
              statistics={statistics}
              orgId={organization.orgId}
              timeRange={appliedCustomDates ? undefined : timeRange}
              startDate={appliedCustomDates ? appliedStartDate : undefined}
              endDate={appliedCustomDates ? appliedEndDate : undefined}
            />
          </div>
        </div>

        {/* Active Calls */}
        <div key="active-calls" className="section">
          <div className="section-header">
            <h3>Активные</h3>
          </div>
          <div className="section-content">
            {activeCalls.length === 0 ? (
              <div className="no-data">No data</div>
            ) : (
              <CallsTable
                calls={activeCalls}
                type="active"
                organization={organizationWithMappings}
                user={user}
                columnWidths={columnWidths}
                setColumnWidths={setColumnWidths}
                onColumnWidthsChange={saveLayoutWithColumnWidths}
              />
            )}
          </div>
        </div>

        {/* Unprocessed Calls */}
        <div key="unprocessed-calls" className="section">
          <div className="section-header">
            <h3>Не обработанные</h3>
          </div>
          <div className="section-content">
            <CallsTable
              calls={unprocessedCalls}
              type="unprocessed"
              organization={organizationWithMappings}
              user={user}
              columnWidths={columnWidths}
              setColumnWidths={setColumnWidths}
              onColumnWidthsChange={saveLayoutWithColumnWidths}
            />
          </div>
        </div>

        {/* Calls List */}
        <div key="calls-list" className="section">
          <div className="section-header">
            <h3>Список звонков ({callsTotalCount})</h3>
          </div>
          <div className="section-content calls-section-content">
            <CallsTable
              calls={calls}
              type="all"
              orgId={organization?.orgId}
              organization={organizationWithMappings}
              onCallUpdated={fetchData}
              user={user}
              columnWidths={columnWidths}
              setColumnWidths={setColumnWidths}
              onColumnWidthsChange={saveLayoutWithColumnWidths}
              totalItems={callsTotalCount}
              currentPage={callsPage}
              itemsPerPage={callsPerPage}
              onPageChange={setCallsPage}
              onItemsPerPageChange={(val) => { setCallsPerPage(val); setCallsPage(1); }}
              onSearchChange={setCallsSearchQuery}
            />
          </div>
        </div>
      </GridLayout>

      {/* Статистика по точкам */}
      {mappingStatistics.length > 0 && (
        <div className="mapping-stats-section-wrapper">
          <div className="section">
            <div className="section-header">
              <h3>Статистика по точкам</h3>
            </div>
            <div className="section-content">
              <div className="mapping-stats-grid">
                {mappingStatistics.map(mapping => (
                  <div key={mapping.id} className="mapping-stat-card">
                    <div className="mapping-stat-header">
                      <div className="mapping-stat-name" style={{ color: mapping.color || '#1890ff' }}>
                        {mapping.display_name}
                      </div>
                      <div className="mapping-stat-total">
                        {mapping.total_calls} звонков
                      </div>
                    </div>
                    <div className="mapping-stat-body">
                      <div className="mapping-stat-item">
                        <span className="mapping-stat-label">Принято</span>
                        <span className="mapping-stat-value success">{mapping.answered_calls}</span>
                      </div>
                      <div className="mapping-stat-item">
                        <span className="mapping-stat-label">Пропущено</span>
                        <span className="mapping-stat-value danger">{mapping.missed_calls}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <MissedCallsNotification organization={organization} refreshInterval={refreshInterval} />
    </div>
  );
};

export default Dashboard;
