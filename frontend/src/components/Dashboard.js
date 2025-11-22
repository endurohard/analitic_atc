import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Dashboard.css';
import CallsTable from './CallsTable';
import Statistics from './Statistics';

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
  const [refreshInterval, setRefreshInterval] = useState(5); // в секундах
  const [callType, setCallType] = useState('all'); // all, inbound, outbound
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth - 32);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Проверка, является ли пользователь администратором
  const isAdmin = user?.organizations?.some(org => org.role === 'admin');

  // Загрузка layout при монтировании компонента или смене организации
  useEffect(() => {
    setLayoutLoaded(false); // Сбрасываем флаг перед загрузкой нового layout
    loadLayout();
    console.log('Current user:', user);
    console.log('User organizations:', user?.organizations);
  }, [organization]);

  useEffect(() => {
    fetchData();
    // Обновление данных с выбранным интервалом
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [organization, timeRange, refreshInterval, callType, startDate, endDate, useCustomDates]);

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
      console.log('Loading layout for org:', organization.orgId);
      const response = await axios.get(`${API_URL}/api/dashboard-layout/${organization.orgId}`);
      console.log('Layout response:', response.data);

      if (response.data.layout_data) {
        // Если layout_data содержит items, используем их, иначе считаем что это сам массив
        const layoutItems = response.data.layout_data.items || response.data.layout_data;
        if (Array.isArray(layoutItems)) {
          console.log('Setting layout from API:', layoutItems);
          setLayout(layoutItems);
        } else {
          console.log('Layout items not array, using default');
          setLayout(defaultLayout);
        }

        // Загружаем ширину колонок если она есть
        if (response.data.layout_data.columnWidths) {
          console.log('Setting column widths from API:', response.data.layout_data.columnWidths);
          setColumnWidths(response.data.layout_data.columnWidths);
        } else {
          console.log('No column widths in layout, using empty');
          setColumnWidths({});
        }
      } else {
        // Если layout не найден, используем дефолтный
        console.log('No layout_data, using default');
        setLayout(defaultLayout);
        setColumnWidths({});
      }
    } catch (error) {
      console.error('Ошибка загрузки layout:', error);
      console.log('Error loading layout, using default');
      setLayout(defaultLayout);
      setColumnWidths({});
    } finally {
      // Устанавливаем флаг после загрузки (независимо от успеха/ошибки)
      setLayoutLoaded(true);
    }
  };

  // Обработчик изменения layout - сохранение в API
  const onLayoutChange = async (newLayout) => {
    setLayout(newLayout);

    // Только для админов сохраняем layout
    // И только после того, как layout был загружен (чтобы не перезаписать при монтировании)
    if (!isAdmin || !layoutLoaded) return;

    // Сохранение в API (debounced - только после завершения изменений)
    try {
      console.log('Saving layout to API:', newLayout);
      await axios.post(`${API_URL}/api/dashboard-layout`, {
        org_id: parseInt(organization.orgId),
        layout_data: {
          items: newLayout,
          columnWidths: columnWidths
        }
      });
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Ошибка сохранения layout:', error);
    }
  };

  // Обработчик изменения ширины колонок - сохранение в API (с debounce)
  const saveLayoutWithColumnWidthsRef = React.useRef(null);

  const saveLayoutWithColumnWidths = React.useCallback((newColumnWidths) => {
    // Только для админов сохраняем column widths
    // И только после того, как layout был загружен
    if (!isAdmin || !layoutLoaded) return;

    // Очищаем предыдущий таймер
    if (saveLayoutWithColumnWidthsRef.current) {
      clearTimeout(saveLayoutWithColumnWidthsRef.current);
    }

    // Устанавливаем новый таймер (debounce 500ms)
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

  // Сброс layout к значениям по умолчанию
  const resetLayout = async () => {
    setLayout(defaultLayout);
    setColumnWidths({});

    // Удаляем layout из базы данных
    try {
      await axios.delete(`${API_URL}/api/dashboard-layout/${organization.orgId}`);
    } catch (error) {
      console.error('Ошибка сброса layout:', error);
    }
  };

  // Применить текущий layout ко всем организациям пользователя
  const applyLayoutToAll = async () => {
    if (!window.confirm('Применить текущее расположение панелей и размеры колонок ко всем вашим организациям?')) {
      return;
    }

    try {
      // Получаем все организации пользователя
      const userOrgs = user?.organizations || [];
      console.log('Applying layout to organizations:', userOrgs);
      console.log('Current layout:', layout);
      console.log('Current column widths:', columnWidths);

      // Сохраняем текущий layout и columnWidths для каждой организации
      let successCount = 0;
      for (const org of userOrgs) {
        console.log(`Saving layout for org ${org.orgId}...`);
        try {
          const response = await axios.post(`${API_URL}/api/dashboard-layout`, {
            org_id: parseInt(org.orgId),
            layout_data: {
              items: layout,
              columnWidths: columnWidths
            }
          });
          console.log(`✓ Saved for org ${org.orgId}:`, response.data);
          successCount++;
        } catch (err) {
          console.error(`✗ Failed for org ${org.orgId}:`, err);
        }
      }

      alert(`Layout и размеры колонок применены к ${successCount} из ${userOrgs.length} организаций`);
    } catch (error) {
      console.error('Ошибка применения layout ко всем организациям:', error);
      alert('Ошибка при применении layout');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Загружаем все звонки
      const callsParams = { orgId: organization.orgId, limit: 100, timeRange: timeRange };
      if (callType !== 'all') {
        callsParams.direction = callType;
      }
      if (useCustomDates) {
        if (startDate) callsParams.startDate = startDate;
        if (endDate) callsParams.endDate = endDate;
        delete callsParams.timeRange; // Приоритет у произвольных дат
      }
      const callsResponse = await axios.get(`${API_URL}/api/calls`, {
        params: callsParams
      });
      setCalls(callsResponse.data);

      // Загружаем необработанные звонки
      const unprocessedParams = { orgId: organization.orgId, limit: 100, timeRange: timeRange };
      if (useCustomDates) {
        if (startDate) unprocessedParams.startDate = startDate;
        if (endDate) unprocessedParams.endDate = endDate;
        delete unprocessedParams.timeRange;
      }
      const unprocessedResponse = await axios.get(`${API_URL}/api/calls-unprocessed`, {
        params: unprocessedParams
      });
      setUnprocessedCalls(unprocessedResponse.data);

      // Загружаем статистику
      const statsParams = { orgId: organization.orgId, timeRange: timeRange };
      if (useCustomDates) {
        if (startDate) statsParams.startDate = startDate;
        if (endDate) statsParams.endDate = endDate;
        delete statsParams.timeRange;
      }
      const statsResponse = await axios.get(`${API_URL}/api/statistics/summary`, {
        params: statsParams
      });

      console.log('Desktop Dashboard Statistics Response:', statsResponse.data);
      console.log('Desktop Dashboard - StatsParams:', statsParams);

      setStatistics({
        accepted: statsResponse.data.answered_calls,
        missed: statsResponse.data.missed_calls,
        total: statsResponse.data.total_calls,
        notRedialed: statsResponse.data.not_redialed
      });

      // Загружаем статистику по маппингам если они есть
      if (organization.phone_mappings && organization.phone_mappings.length > 0) {
        try {
          const mappingStatsResponse = await axios.get(`${API_URL}/api/statistics/by-mapping`, {
            params: statsParams
          });
          setMappingStatistics(mappingStatsResponse.data);
          console.log('Desktop Dashboard Mapping Statistics:', mappingStatsResponse.data);
        } catch (error) {
          console.error('Error loading mapping statistics:', error);
          setMappingStatistics([]);
        }
      } else {
        setMappingStatistics([]);
      }

      // Загружаем активные звонки (без временного фильтра - всегда текущие)
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
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value);
              if (isMobile) setMobileMenuOpen(false);
            }}
          >
            <option value="1h">Последний 1 час</option>
            <option value="24h">Последние 24 часа</option>
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
          </select>
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
              timeRange={useCustomDates ? undefined : timeRange}
              startDate={useCustomDates ? startDate : undefined}
              endDate={useCustomDates ? endDate : undefined}
              mappingStatistics={mappingStatistics}
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
                organization={organization}
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
              organization={organization}
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
            <h3>Список звонков</h3>
          </div>
          <div className="section-content">
            <CallsTable
              calls={calls}
              type="all"
              orgId={organization?.orgId}
              organization={organization}
              onCallUpdated={fetchData}
              user={user}
              columnWidths={columnWidths}
              setColumnWidths={setColumnWidths}
              onColumnWidthsChange={saveLayoutWithColumnWidths}
            />
          </div>
        </div>
      </GridLayout>
    </div>
  );
};

export default Dashboard;
