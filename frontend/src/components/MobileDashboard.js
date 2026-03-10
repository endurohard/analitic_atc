import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'react-apexcharts';
import './MobileDashboard.css';
import AudioPlayer from './AudioPlayer';

// Мемоизированный компонент карточки звонка с accordion
const CallCard = React.memo(({ call, API_URL, formatPhoneNumber, formatDateTime, formatDuration, mappingName, isUnprocessed }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Поддержка обоих форматов API (старого и нового)
  const phoneNumber = call.number || call.callfrom;
  const dateTime = call.datetime || call.calldate;
  const duration = call.duration || call.billsec;
  const recording = call.recording || call.recordingfile;

  // Для необработанных звонков - всегда входящие пропущенные
  // Для остальных - используем данные из API
  const status = isUnprocessed ? 'not_answered' : (call.status || call.disposition);
  const callType = isUnprocessed ? 'incoming' : (call.type || call.direction);

  // Нормализуем значения (приводим к нижнему регистру для сравнения)
  const statusLower = String(status).toLowerCase().replace(/[_\s]/g, '');
  const callTypeLower = String(callType).toLowerCase();

  // Определение статуса звонка (учитываем все варианты)
  // API возвращает: answered, not_answered
  // База может хранить: ANSWERED, NO ANSWER, BUSY
  const isAnswered = statusLower === 'answered';
  const isBusy = statusLower === 'busy';
  const isNotAnswered = statusLower === 'notanswered' || statusLower === 'noanswer';

  // Определение типа звонка
  // API возвращает: incoming, outgoing
  // База может хранить: Inbound, Outbound
  const isInbound = callTypeLower === 'incoming' || callTypeLower === 'inbound';
  const isOutbound = callTypeLower === 'outgoing' || callTypeLower === 'outbound';
  const typeText = isInbound ? 'Входящий' : 'Исходящий';

  // Текст статуса согласно Grafana маппингу:
  // answered -> Отвечен (для всех типов)
  // not_answered -> Не отвечен (для всех типов)
  // busy -> В ожидании
  let statusText;
  if (isAnswered) {
    statusText = 'Отвечен';
  } else if (isBusy) {
    statusText = 'В ожидании';
  } else if (isNotAnswered) {
    statusText = 'Не отвечен';
  } else {
    // Fallback для неизвестных статусов
    statusText = 'Не отвечен';
  }

  return (
    <div className={`mobile-call-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Компактный заголовок - всегда виден */}
      <div className="mobile-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="mobile-card-left">
          <div className="mobile-card-number">
            {formatPhoneNumber(phoneNumber)}
            {mappingName && <div className="mobile-mapping-name">{mappingName}</div>}
          </div>
          {/* Дата и время в компактном виде */}
          <div className="mobile-card-datetime">
            {formatDateTime(dateTime)}
          </div>
        </div>
        <div className="mobile-card-badges">
          <span className={`mobile-badge ${isAnswered ? 'badge-success' : 'badge-danger'}`}>
            {statusText}
          </span>
          <span className={`mobile-badge ${isInbound ? 'badge-primary' : 'badge-secondary'}`}>
            {typeText}
          </span>
          {/* Иконка раскрытия */}
          <svg
            className={`mobile-expand-icon ${isExpanded ? 'rotated' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Детали - показываются при раскрытии */}
      {isExpanded && (
        <>
          <div className="mobile-card-body">
            <div className="mobile-card-row">
              <span className="mobile-label">Время:</span>
              <span className="mobile-value">{formatDateTime(dateTime)}</span>
            </div>
            {mappingName && (
              <div className="mobile-card-row">
                <span className="mobile-label">Куда:</span>
                <span className="mobile-value">{mappingName}</span>
              </div>
            )}
            {duration > 0 && (
              <div className="mobile-card-row">
                <span className="mobile-label">Длительность:</span>
                <span className="mobile-value">{formatDuration(duration)}</span>
              </div>
            )}
          </div>

          {recording && (
            <div className="mobile-card-audio">
              <AudioPlayer
                src={`https://itatc.ru/app/download-url/${recording}`}
                phoneNumber={phoneNumber}
                callDateTime={dateTime}
                callType={callType}
              />
            </div>
          )}
        </>
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
  const [mappingStatistics, setMappingStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [callType, setCallType] = useState('all');
  const [activeTab, setActiveTab] = useState('stats'); // stats, mappings, active, unprocessed, all
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  // Проверка, является ли пользователь администратором текущей организации
  const isAdmin = user?.organizations?.find(org => org.orgId === organization?.orgId)?.role === 'admin';
  const canChangeOrg = user?.organizations?.length > 1;
  const phoneMappings = organization?.phone_mappings || [];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [organization, timeRange, refreshInterval, callType, startDate, endDate, useCustomDates]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const callsParams = { orgId: organization.orgId, limit: 100, timeRange };
      if (callType !== 'all') callsParams.direction = callType;
      if (useCustomDates) {
        if (startDate) callsParams.startDate = startDate;
        if (endDate) callsParams.endDate = endDate;
        delete callsParams.timeRange;
      }

      const unprocessedParams = { orgId: organization.orgId, limit: 100, timeRange };
      if (useCustomDates) {
        if (startDate) unprocessedParams.startDate = startDate;
        if (endDate) unprocessedParams.endDate = endDate;
        delete unprocessedParams.timeRange;
      }

      const statsParams = { orgId: organization.orgId, timeRange };
      if (useCustomDates) {
        if (startDate) statsParams.startDate = startDate;
        if (endDate) statsParams.endDate = endDate;
        delete statsParams.timeRange;
      }

      const requests = [
        axios.get(`${API_URL}/api/calls`, { params: callsParams }),
        axios.get(`${API_URL}/api/calls-unprocessed`, { params: unprocessedParams }),
        axios.get(`${API_URL}/api/statistics/summary`, { params: statsParams }),
        axios.get(`${API_URL}/api/calls-active`, { params: { orgId: organization.orgId } })
      ];

      // Добавляем запрос статистики по маппингам если они есть
      if (phoneMappings.length > 0) {
        requests.push(axios.get(`${API_URL}/api/statistics/by-mapping`, { params: statsParams }));
      }

      const responses = await Promise.all(requests);
      const [callsRes, unprocessedRes, statsRes, activeRes, mappingStatsRes] = responses;

      setCalls(callsRes.data.calls || callsRes.data);
      setUnprocessedCalls(unprocessedRes.data);
      setActiveCalls(activeRes.data);

      const updateTime = new Date().toLocaleTimeString('ru-RU');
      console.log(`[${updateTime}] Mobile Dashboard Statistics Response:`, statsRes.data);
      console.log(`[${updateTime}] Mobile Dashboard - TimeRange:`, timeRange);
      console.log(`[${updateTime}] Mobile Dashboard - OrgId:`, organization.orgId);

      setStatistics({
        accepted: statsRes.data.answered_calls,
        missed: statsRes.data.missed_calls,
        total: statsRes.data.total_calls,
        notRedialed: statsRes.data.not_redialed
      });

      // Устанавливаем статистику по маппингам если она есть
      if (mappingStatsRes) {
        setMappingStatistics(mappingStatsRes.data);
        console.log(`[${updateTime}] Mapping Statistics:`, mappingStatsRes.data);
      }

      setLastUpdateTime(updateTime);
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

  // Мемоизированная фильтрация (поддержка обоих форматов API)
  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    return calls.filter(call => {
      const phone = String(call.number || call.callfrom || '');
      const dest1 = String(call.callto1 || '');
      const dest2 = String(call.callto2 || '');
      return phone.includes(searchQuery) || dest1.includes(searchQuery) || dest2.includes(searchQuery);
    });
  }, [calls, searchQuery]);

  const filteredActiveCalls = useMemo(() => {
    if (!searchQuery) return activeCalls;
    return activeCalls.filter(call => {
      const phone = String(call.number || call.callfrom || '');
      const dest1 = String(call.callto1 || '');
      const dest2 = String(call.callto2 || '');
      return phone.includes(searchQuery) || dest1.includes(searchQuery) || dest2.includes(searchQuery);
    });
  }, [activeCalls, searchQuery]);

  const filteredUnprocessedCalls = useMemo(() => {
    if (!searchQuery) return unprocessedCalls;
    return unprocessedCalls.filter(call => {
      const phone = String(call.number || call.callfrom || '');
      const dest1 = String(call.callto1 || '');
      const dest2 = String(call.callto2 || '');
      return phone.includes(searchQuery) || dest1.includes(searchQuery) || dest2.includes(searchQuery);
    });
  }, [unprocessedCalls, searchQuery]);

  const renderCallCard = useCallback((call, isUnprocessed = false) => {
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
        isUnprocessed={isUnprocessed}
      />
    );
  }, [API_URL, formatPhoneNumber, formatDateTime, formatDuration, getPhoneMappingName]);

  // Функция для получения данных текущей страницы
  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Получаем общее количество страниц
  const getTotalPages = (data) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Компонент пагинации
  const renderPagination = (data) => {
    const totalPages = getTotalPages(data);
    if (totalPages <= 1) return null;

    return (
      <div className="mobile-pagination">
        <button
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          ← Назад
        </button>
        <span className="pagination-info">
          {currentPage} / {totalPages}
        </span>
        <button
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Вперёд →
        </button>
      </div>
    );
  };

  // Сбрасываем страницу при смене вкладки или поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        // RadialBar для "Общее количество" (всегда 100%)
        const totalOptions = {
          series: [100],
          options: {
            chart: {
              type: 'radialBar',
              toolbar: { show: false }
            },
            plotOptions: {
              radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {
                  margin: 0,
                  size: '70%',
                  background: 'transparent'
                },
                track: {
                  background: '#f0f0f0',
                  strokeWidth: '67%'
                },
                dataLabels: {
                  name: {
                    offsetY: -5,
                    show: true,
                    color: '#888',
                    fontSize: '11px'
                  },
                  value: {
                    formatter: function() {
                      return statistics.total;
                    },
                    color: '#111',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    show: true
                  }
                }
              }
            },
            fill: {
              type: 'gradient',
              gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#1890ff'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
              }
            },
            stroke: {
              lineCap: 'round'
            },
            labels: ['Всего звонков']
          }
        };

        // RadialBar для "Принятые"
        const acceptedOptions = {
          series: [statistics.total > 0 ? (statistics.accepted / statistics.total) * 100 : 0],
          options: {
            chart: {
              type: 'radialBar',
              toolbar: { show: false }
            },
            plotOptions: {
              radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {
                  margin: 0,
                  size: '70%',
                  background: 'transparent'
                },
                track: {
                  background: '#f0f0f0',
                  strokeWidth: '67%'
                },
                dataLabels: {
                  name: {
                    offsetY: -5,
                    show: true,
                    color: '#888',
                    fontSize: '11px'
                  },
                  value: {
                    formatter: function() {
                      return statistics.accepted;
                    },
                    color: '#111',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    show: true
                  }
                }
              }
            },
            fill: {
              type: 'gradient',
              gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#52c41a'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
              }
            },
            stroke: {
              lineCap: 'round'
            },
            labels: ['Принятых']
          }
        };

        // RadialBar для "Пропущенные"
        const missedOptions = {
          series: [statistics.total > 0 ? (statistics.missed / statistics.total) * 100 : 0],
          options: {
            chart: {
              type: 'radialBar',
              toolbar: { show: false }
            },
            plotOptions: {
              radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {
                  margin: 0,
                  size: '70%',
                  background: 'transparent'
                },
                track: {
                  background: '#f0f0f0',
                  strokeWidth: '67%'
                },
                dataLabels: {
                  name: {
                    offsetY: -5,
                    show: true,
                    color: '#888',
                    fontSize: '11px'
                  },
                  value: {
                    formatter: function() {
                      return statistics.missed;
                    },
                    color: '#111',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    show: true
                  }
                }
              }
            },
            fill: {
              type: 'gradient',
              gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#fa8c16'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
              }
            },
            stroke: {
              lineCap: 'round'
            },
            labels: ['Пропущенных']
          }
        };

        // RadialBar для "Не перезвонили"
        const notRedialedOptions = {
          series: [statistics.missed > 0 ? (statistics.notRedialed / statistics.missed) * 100 : 0],
          options: {
            chart: {
              type: 'radialBar',
              toolbar: { show: false }
            },
            plotOptions: {
              radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {
                  margin: 0,
                  size: '70%',
                  background: 'transparent'
                },
                track: {
                  background: '#f0f0f0',
                  strokeWidth: '67%'
                },
                dataLabels: {
                  name: {
                    offsetY: -5,
                    show: true,
                    color: '#888',
                    fontSize: '11px'
                  },
                  value: {
                    formatter: function() {
                      return statistics.notRedialed;
                    },
                    color: '#111',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    show: true
                  }
                }
              }
            },
            fill: {
              type: 'gradient',
              gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#ff4d4f'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
              }
            },
            stroke: {
              lineCap: 'round'
            },
            labels: ['Не перезвонили']
          }
        };

        return (
          <div className="mobile-stats">
            <div className="mobile-stat-card">
              <Chart
                key={`total-${statistics.total}`}
                options={totalOptions.options}
                series={totalOptions.series}
                type="radialBar"
                height="100%"
              />
            </div>
            <div className="mobile-stat-card">
              <Chart
                key={`accepted-${statistics.accepted}`}
                options={acceptedOptions.options}
                series={acceptedOptions.series}
                type="radialBar"
                height="100%"
              />
            </div>
            <div className="mobile-stat-card">
              <Chart
                key={`missed-${statistics.missed}`}
                options={missedOptions.options}
                series={missedOptions.series}
                type="radialBar"
                height="100%"
              />
            </div>
            <div className="mobile-stat-card">
              <Chart
                key={`redialed-${statistics.notRedialed}`}
                options={notRedialedOptions.options}
                series={notRedialedOptions.series}
                type="radialBar"
                height="100%"
              />
            </div>
          </div>
        );

      case 'mappings':
        return (
          <div className="mobile-mapping-stats">
            {mappingStatistics.length === 0 ? (
              <div className="mobile-empty">Нет настроенных точек</div>
            ) : (
              mappingStatistics.map(mapping => (
                <div key={mapping.id} className="mobile-mapping-stat-card">
                  <div className="mobile-mapping-stat-header">
                    <div className="mobile-mapping-stat-name" style={{ color: mapping.color || '#1890ff' }}>
                      {mapping.display_name}
                    </div>
                    <div className="mobile-mapping-stat-total">
                      {mapping.total_calls} звонков
                    </div>
                  </div>
                  <div className="mobile-mapping-stat-body">
                    <div className="mobile-mapping-stat-item">
                      <span className="mobile-mapping-stat-label">Принято:</span>
                      <span className="mobile-mapping-stat-value success">{mapping.answered_calls}</span>
                    </div>
                    <div className="mobile-mapping-stat-item">
                      <span className="mobile-mapping-stat-label">Пропущено:</span>
                      <span className="mobile-mapping-stat-value danger">{mapping.missed_calls}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'active':
        return (
          <>
            <div className="mobile-calls-list">
              {filteredActiveCalls.length === 0 ? (
                <div className="mobile-empty">Нет активных звонков</div>
              ) : (
                getPaginatedData(filteredActiveCalls).map(call => renderCallCard(call, false))
              )}
            </div>
            {renderPagination(filteredActiveCalls)}
          </>
        );

      case 'unprocessed':
        return (
          <>
            <div className="mobile-calls-list">
              {filteredUnprocessedCalls.length === 0 ? (
                <div className="mobile-empty">Нет необработанных звонков</div>
              ) : (
                getPaginatedData(filteredUnprocessedCalls).map(call => renderCallCard(call, true))
              )}
            </div>
            {renderPagination(filteredUnprocessedCalls)}
          </>
        );

      case 'all':
        return (
          <>
            <div className="mobile-calls-list">
              {getPaginatedData(filteredCalls).map(call => renderCallCard(call, false))}
            </div>
            {renderPagination(filteredCalls)}
          </>
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
          {lastUpdateTime && <div className="mobile-last-update">Обновлено: {lastUpdateTime}</div>}
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
          <select
            value={useCustomDates ? 'custom' : timeRange}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustomDates(true);
              } else {
                setUseCustomDates(false);
                setTimeRange(e.target.value);
                setMobileMenuOpen(false);
              }
            }}
          >
            <option value="1h">1 час</option>
            <option value="24h">24 часа</option>
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="custom">Произвольный период</option>
          </select>
        </div>

        {useCustomDates && (
          <>
            <div className="mobile-menu-section">
              <label>Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="mobile-menu-section">
              <label>Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </>
        )}

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
          <button className="mobile-menu-btn" onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}>
            Админ панель
          </button>
        )}
        {canChangeOrg && (
          <button className="mobile-menu-btn" onClick={() => { onChangeOrganization(); setMobileMenuOpen(false); }}>
            Сменить организацию
          </button>
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
        {phoneMappings.length > 0 && (
          <button
            className={activeTab === 'mappings' ? 'active' : ''}
            onClick={() => setActiveTab('mappings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
            </svg>
            <span>Точки</span>
          </button>
        )}
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
