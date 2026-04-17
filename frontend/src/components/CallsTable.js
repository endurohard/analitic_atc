import React, { useState, useEffect, useCallback } from 'react';
import './CallsTable.css';
import ContextMenu from './ContextMenu';
import EditCallModal from './EditCallModal';
import AudioPlayer from './AudioPlayer';
// import CallAnalysisModal from './CallAnalysisModal'; // TODO: подключить после настройки whisper

const CallsTable = ({
  calls, type, orgId, organization, onCallUpdated, user,
  columnWidths: propsColumnWidths, setColumnWidths: propsSetColumnWidths, onColumnWidthsChange,
  // Server-side pagination props
  totalItems, currentPage: serverPage, itemsPerPage: serverItemsPerPage,
  onPageChange, onItemsPerPageChange, onSearchChange
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [columns, setColumns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  // const [analysisModalOpen, setAnalysisModalOpen] = useState(false); // TODO
  // const [analysisCallId, setAnalysisCallId] = useState(null); // TODO
  const [resizingColumn, setResizingColumn] = useState(null);
  // Server pagination mode
  const isServerPagination = totalItems !== undefined && onPageChange;

  // Local pagination state (fallback when no server pagination)
  const [localPage, setLocalPage] = useState(1);
  const localItemsPerPage = 15;

  const currentPage = isServerPagination ? serverPage : localPage;
  const itemsPerPage = isServerPagination ? serverItemsPerPage : localItemsPerPage;

  // Column widths
  const [localColumnWidths, setLocalColumnWidths] = useState({});
  const columnWidths = propsColumnWidths || localColumnWidths;
  const setColumnWidths = propsSetColumnWidths || setLocalColumnWidths;

  const isAdmin = user?.organizations?.some(org => org.role === 'admin') || false;
  const phoneMappings = organization?.phone_mappings || [];

  const getPhoneMappingName = (phone) => {
    if (!phone || phoneMappings.length === 0) return null;
    const normalizedPhone = String(phone).replace(/\D/g, '');
    const mapping = phoneMappings.find(m => {
      const mappingPhone = String(m.phone_number).replace(/\D/g, '');
      return normalizedPhone.includes(mappingPhone) || mappingPhone.includes(normalizedPhone);
    });
    return mapping ? mapping.display_name : null;
  };

  const hasOperator = calls.some((call) => call.callto1 || call.callto2);

  const formatOperator = (call) => {
    const v1 = call.callto1;
    const v2 = call.callto2;
    const fmt = (v) => (v ? getPhoneMappingName(v) || v : '');
    const d1 = fmt(v1);
    const d2 = fmt(v2);
    if (!d1 && !d2) return '-';
    if (!d2 || d1 === d2) return d1;
    if (!d1) return d2;
    return `${d1} → ${d2}`;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const phoneStr = String(phone).replace(/\D/g, '');
    if (phoneStr.length === 10) return `+7${phoneStr}`;
    if (phoneStr.length === 11 && phoneStr.startsWith('7')) return `+${phoneStr}`;
    if (phoneStr.length === 11 && phoneStr.startsWith('8')) return `+7${phoneStr.slice(1)}`;
    return phone;
  };

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

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}:${String(remainMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Load columns config
  useEffect(() => {
    if (orgId && type === 'all') {
      fetch(`/api/organizations/${orgId}/columns`)
        .then(res => res.json())
        .then(data => setColumns(data))
        .catch(err => console.error('Failed to load columns:', err));
    }
  }, [orgId, type]);

  // Apply search (by button or Enter key)
  const applySearch = useCallback(() => {
    if (isServerPagination && onSearchChange) {
      onSearchChange(searchQuery);
    }
    if (!isServerPagination) setLocalPage(1);
  }, [isServerPagination, onSearchChange, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    if (isServerPagination && onSearchChange) {
      onSearchChange('');
    }
    if (!isServerPagination) setLocalPage(1);
  }, [isServerPagination, onSearchChange]);


  // Column resize handlers
  const handleMouseDown = (columnKey, e) => {
    e.preventDefault();
    const currentWidth = columnWidths[columnKey] || e.target.parentElement.offsetWidth;
    const minWidth = columnKey === 'audio' ? 300 : 50;
    setResizingColumn({ key: columnKey, startX: e.clientX, startWidth: Math.max(minWidth, currentWidth) });
  };

  useEffect(() => {
    if (!resizingColumn) return;
    const handleMouseMove = (e) => {
      const diff = e.clientX - resizingColumn.startX;
      const minWidth = resizingColumn.key === 'audio' ? 300 : 50;
      const newWidth = Math.max(minWidth, resizingColumn.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn.key]: newWidth }));
    };
    const handleMouseUp = () => {
      setResizingColumn(null);
      if (onColumnWidthsChange) {
        setColumnWidths(prev => { onColumnWidthsChange(prev); return prev; });
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, onColumnWidthsChange]);

  const handleDownload = (recording) => {
    if (!recording) return;
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
      case 'answered': return 'Отвечен';
      case 'not_answered': return 'Не отвечен';
      case 'busy': return 'Занято';
      default: return status;
    }
  };

  const getTypeLabel = (callType) => {
    switch (callType) {
      case 'incoming': return 'Входящий';
      case 'outgoing': return 'Исходящий';
      default: return callType;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'answered': return 'status-answered';
      case 'not_answered': return 'status-not-answered';
      case 'busy': return 'status-busy';
      default: return '';
    }
  };

  const getTypeClass = (callType) => {
    switch (callType) {
      case 'incoming': return 'type-incoming';
      case 'outgoing': return 'type-outgoing';
      default: return '';
    }
  };

  // Unprocessed calls view
  if (type === 'unprocessed') {
    return (
      <div className="calls-table unprocessed-scroll">
        <table>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Дата</th>
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

  // Active calls view
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

  // Custom column rendering
  const renderCellContent = (column, call) => {
    const value = call[column.sourceField];
    switch (column.type) {
      case 'button':
        if (column.key === 'download') {
          return (
            <button className="icon-btn" title="Скачать" onClick={() => handleDownload(call.recording)} disabled={!call.recording}>
              🎙
            </button>
          );
        }
        return null;
      case 'audio':
        return call.recording ? (
          <AudioPlayer src={`https://itatc.ru/app/download-url/${call.recording}`} onDownload={() => handleDownload(call.recording)} phoneNumber={call.number} callDateTime={call.datetime} callType={call.type} />
        ) : (
          <span className="no-recording">Нет записи</span>
        );
      case 'status':
        return <span className={`status-badge ${getStatusClass(value)}`}>{getStatusLabel(value)}</span>;
      case 'badge':
        if (column.key === 'type') return <span className={`type-badge ${getTypeClass(value)}`}>{getTypeLabel(value)}</span>;
        return value;
      case 'date':
        return formatDateTime(value);
      case 'text':
        if (column.sourceField === 'number' || column.sourceField === 'reserveMobile') {
          const mappingName = getPhoneMappingName(value);
          return <span className="number-cell">{formatPhoneNumber(value)}{mappingName && <span className="mapping-name"> ({mappingName})</span>}</span>;
        }
        if (column.sourceField === 'not_redialed') return value ? 'Не перезвонили' : '';
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

  // === type === 'all' - Full calls list ===

  // Data for display: server pagination sends pre-paginated data, local needs filtering/slicing
  let displayCalls, totalRecords, totalPages;

  if (isServerPagination) {
    displayCalls = calls;
    totalRecords = totalItems;
    totalPages = Math.ceil(totalItems / itemsPerPage);
  } else {
    // Local filtering
    const filteredCalls = calls.filter(call => {
      if (!searchQuery) return true;
      const query = searchQuery.replace(/\D/g, '');
      const phoneNumber = String(call.number).replace(/\D/g, '');
      return phoneNumber.includes(query);
    });
    totalRecords = filteredCalls.length;
    totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
    const start = (localPage - 1) * itemsPerPage;
    displayCalls = filteredCalls.slice(start, start + itemsPerPage);
  }

  const handlePageChange = (page) => {
    if (isServerPagination) {
      onPageChange(page);
    } else {
      setLocalPage(page);
    }
  };

  // Smart pagination: generates page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  // Record range text
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalRecords);

  // Context menu
  const handleContextMenu = (e, call) => {
    e.preventDefault();
    setSelectedCall(call);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getContextMenuOptions = () => {
    if (!selectedCall) return [];
    const options = [
      {
        label: 'View', icon: '👁', shortcut: '⌘ v',
        onClick: () => { alert(`Просмотр звонка: ${formatPhoneNumber(selectedCall.number)}`); },
      },
    ];
    if (isAdmin) {
      options.push({
        label: 'Edit', icon: '✏️', shortcut: '⌘ e',
        onClick: () => { setContextMenu(null); setEditModalOpen(true); },
      });
    }
    options.push(
      {
        label: 'Share', icon: '📤', shortcut: '⌘ s',
        onClick: () => {
          navigator.clipboard.writeText(`Call ID: ${selectedCall.id}, Number: ${formatPhoneNumber(selectedCall.number)}`);
          alert('Информация скопирована в буфер обмена');
        },
      },
      { separator: true },
      {
        label: 'Inspect', icon: '🔧', shortcut: '⌘ i',
        onClick: () => { console.table(selectedCall); },
      },
    );
    return options;
  };

  return (
    <div className="calls-table-container">
      {/* Search bar - sticky top */}
      {type === 'all' && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по номеру телефона..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
          />
          <button className="search-apply-btn" onClick={applySearch} title="Найти">
            Найти
          </button>
          {searchQuery && (
            <button className="clear-search-btn" onClick={clearSearch} title="Очистить поиск">
              ✕
            </button>
          )}
          {searchQuery && !isServerPagination && (
            <span className="search-results-count">
              Найдено: {totalRecords} из {calls.length}
            </span>
          )}
        </div>
      )}

      {/* Scrollable table area */}
      <div className={`calls-table ${resizingColumn ? 'resizing' : ''}`}>
        <table>
          <thead>
            <tr>
              {columns.length > 0 ? (
                columns.map((column) => {
                  const minWidth = column.key === 'audio' || column.type === 'audio' ? 300 : 50;
                  const savedWidth = columnWidths[column.key];
                  const width = savedWidth ? Math.max(minWidth, savedWidth) : 'auto';
                  return (
                    <th key={column.key} style={{ width, position: 'relative' }}>
                      {column.label}
                      <div className="column-resizer" onMouseDown={(e) => handleMouseDown(column.key, e)} />
                    </th>
                  );
                })
              ) : (
                <>
                  <th style={{ width: columnWidths['audio'] ? Math.max(300, columnWidths['audio']) : 'auto', position: 'relative' }}>
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
                  {hasOperator && (
                    <th style={{ width: columnWidths['operator'] || 'auto', position: 'relative' }}>
                      Оператор
                      <div className="column-resizer" onMouseDown={(e) => handleMouseDown('operator', e)} />
                    </th>
                  )}
                  <th style={{ width: columnWidths['type'] || 'auto', position: 'relative' }}>
                    Тип
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('type', e)} />
                  </th>
                  <th style={{ width: columnWidths['datetime'] || 'auto', position: 'relative' }}>
                    Время звонка
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('datetime', e)} />
                  </th>
                  <th style={{ width: columnWidths['duration'] || 'auto', position: 'relative' }}>
                    Длительность
                    <div className="column-resizer" onMouseDown={(e) => handleMouseDown('duration', e)} />
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
            {displayCalls.map((call) => (
              <tr key={call.id} onContextMenu={(e) => handleContextMenu(e, call)} className="table-row">
                {columns.length > 0 ? (
                  columns.map((column) => (
                    <td key={column.key} className={column.type === 'audio' ? 'audio-cell' : ''} onMouseDown={(e) => { if (column.type === 'audio') e.stopPropagation(); }}>
                      {renderCellContent(column, call)}
                    </td>
                  ))
                ) : (
                  <>
                    <td className="audio-cell" onMouseDown={(e) => e.stopPropagation()}>
                      {call.recording ? (
                        <AudioPlayer src={`https://itatc.ru/app/download-url/${call.recording}`} onDownload={() => handleDownload(call.recording)} phoneNumber={call.number} callDateTime={call.datetime} callType={call.type} />
                      ) : (
                        <span className="no-recording">Нет записи</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(call.status)}`}>{getStatusLabel(call.status)}</span>
                    </td>
                    <td className="number-cell">
                      {formatPhoneNumber(call.number)}
                      {getPhoneMappingName(call.number) && (
                        <span className="mapping-name"> ({getPhoneMappingName(call.number)})</span>
                      )}
                    </td>
                    {hasOperator && (
                      <td>{formatOperator(call)}</td>
                    )}
                    <td>
                      <span className={`type-badge ${getTypeClass(call.type)}`}>{getTypeLabel(call.type)}</span>
                    </td>
                    <td>{formatDateTime(call.datetime)}</td>
                    <td className="duration-cell">{formatDuration(call.duration)}</td>
                    <td>{call.not_redialed ? 'Не перезвонили' : ''}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile card view */}
        <div className="calls-cards">
          {displayCalls.map((call) => (
            <div key={call.id} className="call-card">
              <div className="call-card-header">
                <div className="call-card-number">{formatPhoneNumber(call.number)}</div>
                <div className="call-card-badges">
                  <span className={`status-badge ${getStatusClass(call.status)}`}>{getStatusLabel(call.status)}</span>
                  <span className={`type-badge ${getTypeClass(call.type)}`}>{getTypeLabel(call.type)}</span>
                </div>
              </div>
              <div className="call-card-body">
                <span className="call-card-label">Время:</span>
                <span className="call-card-value">{formatDateTime(call.datetime)}</span>
                {call.duration > 0 && (
                  <>
                    <span className="call-card-label">Длительность:</span>
                    <span className="call-card-value">{formatDuration(call.duration)}</span>
                  </>
                )}
                {call.not_redialed && (
                  <>
                    <span className="call-card-label">Статус:</span>
                    <span className="call-card-value" style={{ color: '#ff4d4f' }}>Не перезвонили</span>
                  </>
                )}
              </div>
              {call.recording && (
                <div className="call-card-audio">
                  <AudioPlayer src={`https://itatc.ru/app/download-url/${call.recording}`} onDownload={() => handleDownload(call.recording)} phoneNumber={call.number} callDateTime={call.datetime} callType={call.type} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination footer - sticky bottom */}
      {totalPages >= 1 && (
        <div className="pagination-footer">
          <div className="pagination-info">
            <span className="pagination-range">
              {totalRecords > 0 ? `${startRecord}-${endRecord} из ${totalRecords}` : 'Нет записей'}
            </span>
            {isServerPagination && onItemsPerPageChange && (
              <select
                className="per-page-select"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              >
                <option value={15}>15 / стр.</option>
                <option value={25}>25 / стр.</option>
                <option value={50}>50 / стр.</option>
                <option value={100}>100 / стр.</option>
              </select>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ←
              </button>

              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`dots-${idx}`} className="pagination-dots">...</span>
                ) : (
                  <button
                    key={page}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} options={getContextMenuOptions()} />
      )}

      {editModalOpen && selectedCall && (
        <EditCallModal
          call={selectedCall}
          orgId={orgId}
          onClose={() => { setEditModalOpen(false); setSelectedCall(null); }}
          onSave={() => { setEditModalOpen(false); setSelectedCall(null); if (onCallUpdated) onCallUpdated(); }}
        />
      )}

    </div>
  );
};

export default CallsTable;
