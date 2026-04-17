import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CallDetailsModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CallDetailsModal = ({ isOpen, onClose, category, orgId, timeRange, startDate, endDate }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Функция форматирования номера телефона
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const phoneStr = String(phone).replace(/\D/g, '');
    if (phoneStr.length === 11 && phoneStr.startsWith('7')) {
      return `+7 (${phoneStr.slice(1, 4)}) ${phoneStr.slice(4, 7)}-${phoneStr.slice(7, 9)}-${phoneStr.slice(9, 11)}`;
    }
    return phone;
  };

  // Функция форматирования даты
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateTimeStr;
    }
  };

  useEffect(() => {
    if (isOpen && orgId && category) {
      fetchCalls();
    }
  }, [isOpen, orgId, category, timeRange, startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const fetchCalls = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        orgId,
        limit: 1000
      };

      // Добавляем фильтры по времени
      if (startDate || endDate) {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else if (timeRange) {
        params.timeRange = timeRange;
      }

      // Добавляем фильтры в зависимости от категории
      switch (category) {
        case 'accepted':
          params.status = 'answered';
          break;
        case 'missed':
          params.status = 'not_answered';
          break;
        case 'not_redialed':
          // Для "не перезвонили" нужен специальный запрос
          params.direction = 'incoming';
          params.status = 'not_answered';
          break;
        case 'total':
          // Все звонки, без дополнительных фильтров
          break;
        default:
          break;
      }

      const response = await axios.get(`${API_URL}/api/calls`, { params });

      // Для категории "не перезвонили" дополнительно фильтруем
      if (category === 'not_redialed') {
        const filteredCalls = response.data.filter(call => call.not_redialed);
        setCalls(filteredCalls);
      } else {
        setCalls(response.data);
      }
    } catch (err) {
      setError('Ошибка загрузки данных: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'accepted':
        return 'Принятые звонки';
      case 'missed':
        return 'Пропущенные звонки';
      case 'total':
        return 'Все звонки';
      case 'not_redialed':
        return 'Не перезвонили';
      default:
        return 'Детали';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {getCategoryTitle()} ({calls.length})
          </h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && <div className="modal-loading">Загрузка...</div>}

          {error && <div className="modal-error">{error}</div>}

          {!loading && !error && calls.length === 0 && (
            <div className="modal-empty">Звонки не найдены</div>
          )}

          {!loading && !error && calls.length > 0 && (
            <table className="calls-detail-table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Тип</th>
                  <th>Статус</th>
                  <th>Дата и время</th>
                  <th>Длительность</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td className="call-number">{formatPhoneNumber(call.number)}</td>
                    <td>
                      {call.type === 'incoming' ? 'Входящий' : 'Исходящий'}
                    </td>
                    <td>
                      <span className={`call-status ${call.status === 'answered' ? 'answered' : 'missed'}`}>
                        {call.status === 'answered' ? 'Отвечен' : 'Не отвечен'}
                      </span>
                    </td>
                    <td className="call-date">{formatDateTime(call.datetime)}</td>
                    <td>{call.duration ? `${call.duration} сек` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetailsModal;
