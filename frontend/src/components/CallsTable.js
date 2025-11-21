import React, { useState, useEffect } from 'react';
import './CallsTable.css';
import ContextMenu from './ContextMenu';
import EditCallModal from './EditCallModal';
import AudioPlayer from './AudioPlayer';

const CallsTable = ({ calls, type, orgId, organization, onCallUpdated, user, columnWidths: propsColumnWidths, setColumnWidths: propsSetColumnWidths, onColumnWidthsChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [columns, setColumns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);

  // Локальный state для columnWidths (если не передан через props)
  const [localColumnWidths, setLocalColumnWidths] = useState({});

  // Используем props если передан, иначе локальный state
  const columnWidths = propsColumnWidths || localColumnWidths;
  const setColumnWidths = propsSetColumnWidths || setLocalColumnWidths;

  // Проверка, является ли пользователь администратором
  const isAdmin = user?.organizations?.some(org => org.role === 'admin') || false;

  // Получаем phone_mappings из organization
  const phoneMappings = organization?.phone_mappings || [];

  // Функция получения названия из маппинга по номеру телефона
  const getPhoneMappingName = (phone) => {
    if (!phone || phoneMappings.length === 0) return null;

    // Нормализуем номер для поиска (убираем все нецифровые символы)
    const normalizedPhone = String(phone).replace(/\D/g, '');

    // Ищем маппинг
    const mapping = phoneMappings.find(m => {
      const mappingPhone = String(m.phone_number).replace(/\D/g, '');
      return normalizedPhone.includes(mappingPhone) || mappingPhone.includes(normalizedPhone);
    });

    return mapping ? mapping.display_name : null;
  };

  // Проверяем, есть ли хотя бы один звонок с маппингом для callto1 и callto2
  const hasCallto1Mapping = calls.some(call => call.callto1 && getPhoneMappingName(call.callto1));
  const hasCallto2Mapping = calls.some(call => call.callto2 && getPhoneMappingName(call.callto2));

  // Функция форматирования номера телефона: 9633707007 → +79633707007
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const phoneStr = String(phone).replace(/\D/g, ''); // Убираем все нечисловые символы
    if (phoneStr.length === 10) {
      // Если номер из 10 цифр (без 7), добавляем +7
      return `+7${phoneStr}`;
    } else if (phoneStr.length === 11 && phoneStr.startsWith('7')) {
      // Если номер из 11 цифр и начинается с 7, добавляем +
      return `+${phoneStr}`;
    } else if (phoneStr.length === 11 && phoneStr.startsWith('8')) {
      // Если номер из 11 цифр и начинается с 8, заменяем 8 на +7
      return `+7${phoneStr.slice(1)}`;
    }
    return phone; // Если формат не подходит, возвращаем как есть
  };

  // Функция форматирования даты: 2025-11-19T01:14:28 → 19.11.2025 01:14
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
      return dateTimeStr; // Если не удалось распарсить, возвращаем как есть
    }
  };

  // Загрузка конфигурации колонок для организации
  useEffect(() => {
    if (orgId && type === 'all') {
      fetch(`/api/organizations/${orgId}/columns`)
        .then(res => res.json())
        .then(data => setColumns(data))
        .catch(err => console.error('Failed to load columns:', err));
    }
  }, [orgId, type]);

  // Сброс на первую страницу при изменении поискового запроса
  useEffect(() => {
    if (type === 'all' && searchQuery) {
      setCurrentPage(1);
    }
  }, [searchQuery, type]);

  // Обработчики для изменения размера колонок
  const handleMouseDown = (columnKey, e) => {
    e.preventDefault();
    const currentWidth = columnWidths[columnKey] || e.target.parentElement.offsetWidth;
    // Устанавливаем минимальную ширину для колонки audio
    const minWidth = columnKey === 'audio' ? 300 : 50;
    setResizingColumn({
      key: columnKey,
      startX: e.clientX,
      startWidth: Math.max(minWidth, currentWidth)
    });
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizingColumn.startX;
      // Устанавливаем минимальную ширину для каждой колонки
      const minWidth = resizingColumn.key === 'audio' ? 300 : 50;
      const newWidth = Math.max(minWidth, resizingColumn.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.key]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      // Сохраняем новые размеры колонок после завершения изменения размера
      if (onColumnWidthsChange) {
        setColumnWidths(prev => {
          onColumnWidthsChange(prev);
          return prev;
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, onColumnWidthsChange]);

  // Функция для скачивания записи
  const handleDownload = (recording) => {
    if (!recording) {
      alert('Запись недоступна');
      return;
    }
    const url = `https://itatc.ru/app/download-url/${recording}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = recording;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'answered':
        return 'Отвечен';
      case 'not_answered':
        return 'Не отвечен';
      case 'busy':
        return 'Занято';
      default:
        return status;
    }
  };

  const getTypeLabel = (callType) => {
    switch (callType) {
      case 'incoming':
        return 'Входящий';
      case 'outgoing':
        return 'Исходящий';
      default:
        return callType;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'answered':
        return 'status-answered';
      case 'not_answered':
        return 'status-not-answered';
      case 'busy':
        return 'status-busy';
      default:
        return '';
    }
  };

  const getTypeClass = (callType) => {
    switch (callType) {
      case 'incoming':
        return 'type-incoming';
      case 'outgoing':
        return 'type-outgoing';
      default:
        return '';
    }
  };

  if (type === 'unprocessed') {
    return (
      <div className="calls-table unprocessed-scroll">
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата ↑</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td className="number-cell">{formatPhoneNumber(call.number)}</td>
                <td>{formatDateTime(call.datetime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'active') {
    return (
      <div className="calls-table">
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td className="number-cell">{formatPhoneNumber(call.number)}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(call.status)}`}>
                    {getStatusLabel(call.status)}
                  </span>
                </td>
                <td>{formatDateTime(call.datetime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Функция для рендеринга содержимого ячейки на основе типа колонки
  const renderCellContent = (column, call) => {
    const value = call[column.sourceField];

    switch (column.type) {
      case 'button':
        if (column.key === 'download') {
          return (
            <button
              className="icon-btn"
              title="Скачать"
              onClick={() => handleDownload(call.recording)}
              disabled={!call.recording}
            >
              🎙
            </button>
          );
        }
        return null;

      case 'audio':
        return call.recording ? (
          <AudioPlayer
            src={`https://itatc.ru/app/download-url/${call.recording}`}
            onDownload={() => handleDownload(call.recording)}
            phoneNumber={call.number}
            callDateTime={call.datetime}
            callType={call.type}
          />
        ) : (
          <span className="no-recording">Нет записи</span>
        );

      case 'status':
        return (
          <span className={`status-badge ${getStatusClass(value)}`}>
            {getStatusLabel(value)}
          </span>
        );

      case 'badge':
        if (column.key === 'type') {
          return (
            <span className={`type-badge ${getTypeClass(value)}`}>
              {getTypeLabel(value)}
            </span>
          );
        }
        return value;

      case 'date':
        return formatDateTime(value);

      case 'text':
        if (column.sourceField === 'number' || column.sourceField === 'reserveMobile') {
          const mappingName = getPhoneMappingName(value);
          return (
            <span className="number-cell">
              {formatPhoneNumber(value)}
              {mappingName && <span className="mapping-name"> ({mappingName})</span>}
            </span>
          );
        }
        if (column.sourceField === 'not_redialed') {
          return value ? 'Не перезвонили' : '';
        }
        // Для колонки "Фундук" (callto1) показываем значение или "-" если пусто
        if (column.sourceField === 'callto1' || column.sourceField === 'callto2') {
          const mappingName = getPhoneMappingName(value);
          if (mappingName) return mappingName;
          return value || '-';
        }
        return value || '';

      default:
        return value || '';
    }
  };

  // type === 'all' - с пагинацией и поиском
  // Фильтрация по номеру телефона
  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.replace(/\D/g, ''); // Убираем все нецифровые символы из запроса
    const phoneNumber = String(call.number).replace(/\D/g, '');
    return phoneNumber.includes(query);
  });

  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCalls.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Обработчик правого клика
  const handleContextMenu = (e, call) => {
    e.preventDefault();
    setSelectedCall(call);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Опции контекстного меню
  const getContextMenuOptions = () => {
    if (!selectedCall) return [];

    const options = [
      {
        label: 'View',
        icon: '👁',
        shortcut: '⌘ v',
        onClick: () => {
          console.log('View call:', selectedCall);
          alert(`Просмотр звонка: ${formatPhoneNumber(selectedCall.number)}`);
        },
      },
    ];

    // Добавляем опцию редактирования только для администраторов
    if (isAdmin) {
      options.push({
        label: 'Edit',
        icon: '✏️',
        shortcut: '⌘ e',
        onClick: () => {
          setContextMenu(null);
          setEditModalOpen(true);
        },
      });
    }

    options.push(
      {
        label: 'Share',
        icon: '📤',
        shortcut: '⌘ s',
        onClick: () => {
          console.log('Share call:', selectedCall);
          // Копируем ссылку в буфер обмена
          navigator.clipboard.writeText(`Call ID: ${selectedCall.id}, Number: ${formatPhoneNumber(selectedCall.number)}`);
          alert('Информация скопирована в буфер обмена');
        },
      },
      { separator: true },
      {
        label: 'Explore',
        icon: '🔍',
        shortcut: '⌘ x',
        onClick: () => {
          console.log('Explore call:', selectedCall);
          alert(`Исследование звонка: ${formatPhoneNumber(selectedCall.number)}`);
        },
      },
      {
        label: 'Inspect',
        icon: '🔧',
        shortcut: '⌘ i',
        onClick: () => {
          console.log('Inspect call:', selectedCall);
          console.table(selectedCall);
        },
      },
      { separator: true },
      {
        label: 'Remove',
        icon: '🗑',
        shortcut: '⌘ r',
        danger: true,
        onClick: () => {
          if (window.confirm(`Удалить звонок ${formatPhoneNumber(selectedCall.number)}?`)) {
            console.log('Remove call:', selectedCall);
            alert('Функция удаления будет реализована');
          }
        },
      },
    );

    return options;
  };

  return (
    <div className="calls-table-container">
      {type === 'all' && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по номеру телефона..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Очистить поиск"
            >
              ✕
            </button>
          )}
          {searchQuery && (
            <span className="search-results-count">
              Найдено: {filteredCalls.length} из {calls.length}
            </span>
          )}
        </div>
      )}
      <div className="calls-table">
        <table>
          <thead>
            <tr>
              {columns.length > 0 ? (
                columns.map((column) => {
                  // Применяем минимальную ширину для колонки audio
                  const minWidth = column.key === 'audio' || column.type === 'audio' ? 300 : 50;
                  const savedWidth = columnWidths[column.key];
                  const width = savedWidth ? Math.max(minWidth, savedWidth) : 'auto';

                  return (
                    <th
                      key={column.key}
                      style={{
                        width: width,
                        position: 'relative'
                      }}
                    >
                      {column.label}
                      <div
                        className="column-resizer"
                        onMouseDown={(e) => handleMouseDown(column.key, e)}
                      />
                    </th>
                  );
                })
              ) : (
                // Fallback to hardcoded columns if dynamic config not loaded
                <>
                  <th style={{
                    width: columnWidths['audio'] ? Math.max(300, columnWidths['audio']) : 'auto',
                    position: 'relative'
                  }}>
                    Прослушать
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('audio', e)} />
                  </th>
                  <th style={{ width: columnWidths['status'] || 'auto', position: 'relative' }}>
                    Статус
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('status', e)} />
                  </th>
                  <th style={{ width: columnWidths['number'] || 'auto', position: 'relative' }}>
                    Номер
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('number', e)} />
                  </th>
                  {hasCallto1Mapping && (
                    <th style={{ width: columnWidths['callto1'] || 'auto', position: 'relative' }}>
                      Внутр. 1
                      <div className="column-resizer" onMouseDown={(e) => handleMouseDown('callto1', e)} />
                    </th>
                  )}
                  {hasCallto2Mapping && (
                    <th style={{ width: columnWidths['callto2'] || 'auto', position: 'relative' }}>
                      Внутр. 2
                      <div className="column-resizer" onMouseDown={(e) => handleMouseDown('callto2', e)} />
                    </th>
                  )}
                  <th style={{ width: columnWidths['type'] || 'auto', position: 'relative' }}>
                    Тип
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('type', e)} />
                  </th>
                  <th style={{ width: columnWidths['datetime'] || 'auto', position: 'relative' }}>
                    Время звонка ↓
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('datetime', e)} />
                  </th>
                  <th style={{ width: columnWidths['not_redialed'] || 'auto', position: 'relative' }}>
                    Не перезвонили
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('not_redialed', e)} />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((call) => (
              <tr
                key={call.id}
                onContextMenu={(e) => handleContextMenu(e, call)}
                className="table-row"
              >
                {columns.length > 0 ? (
                  columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.type === 'audio' ? 'audio-cell' : ''}
                      onMouseDown={(e) => {
                        if (column.type === 'audio') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {renderCellContent(column, call)}
                    </td>
                  ))
                ) : (
                  // Fallback to hardcoded columns
                  <>
                    <td
                      className="audio-cell"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {call.recording ? (
                        <AudioPlayer
                          src={`https://itatc.ru/app/download-url/${call.recording}`}
                          onDownload={() => handleDownload(call.recording)}
                          phoneNumber={call.number}
                          callDateTime={call.datetime}
                          callType={call.type}
                        />
                      ) : (
                        <span className="no-recording">Нет записи</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(call.status)}`}>
                        {getStatusLabel(call.status)}
                      </span>
                    </td>
                    <td className="number-cell">
                      {formatPhoneNumber(call.number)}
                      {getPhoneMappingName(call.number) && (
                        <span className="mapping-name"> ({getPhoneMappingName(call.number)})</span>
                      )}
                    </td>
                    {hasCallto1Mapping && (
                      <td>
                        {getPhoneMappingName(call.callto1) || '-'}
                      </td>
                    )}
                    {hasCallto2Mapping && (
                      <td>
                        {getPhoneMappingName(call.callto2) || '-'}
                      </td>
                    )}
                    <td>
                      <span className={`type-badge ${getTypeClass(call.type)}`}>
                        {getTypeLabel(call.type)}
                      </span>
                    </td>
                    <td>{formatDateTime(call.datetime)}</td>
                    <td>{call.not_redialed ? 'Не перезвонили' : ''}</td>
                  </>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>

    {/* Пагинация */}
    {totalPages > 1 && (
      <div className="pagination">
        <button
          className="pagination-btn"
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ←
        </button>

        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index + 1}
            className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
            onClick={() => paginate(index + 1)}
          >
            {index + 1}
          </button>
        ))}

        <button
          className="pagination-btn"
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          →
        </button>
      </div>
    )}

    {contextMenu && (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu(null)}
        options={getContextMenuOptions()}
      />
    )}

    {editModalOpen && selectedCall && (
      <EditCallModal
        call={selectedCall}
        orgId={orgId}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCall(null);
        }}
        onSave={() => {
          setEditModalOpen(false);
          setSelectedCall(null);
          // Вызываем callback для обновления списка звонков
          if (onCallUpdated) {
            onCallUpdated();
          }
        }}
      />
    )}
  </div>
  );
};

export default CallsTable;
