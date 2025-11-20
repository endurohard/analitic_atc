import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AdminPanel = ({ user, onLogout, onBack }) => {
  const [activeTab, setActiveTab] = useState('organizations');
  const [organizations, setOrganizations] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [dbConnection, setDbConnection] = useState(null);
  const [dbConfig, setDbConfig] = useState(null);
  const [editingDbConfig, setEditingDbConfig] = useState(false);
  const [dbConfigForm, setDbConfigForm] = useState({
    host: '',
    port: '5432',
    database: '',
    user: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Форма для новой организации
  const [newOrg, setNewOrg] = useState({
    orgId: '',
    name: '',
    description: '',
    username: '',
    password: ''
  });

  // Форма для редактирования
  const [editingOrg, setEditingOrg] = useState(null);

  // Состояние для маппингов телефонов
  const [phoneMappings, setPhoneMappings] = useState([]);
  const [newMapping, setNewMapping] = useState({
    phone_number: '',
    display_name: '',
    color: '#1890ff'
  });
  const [editingMapping, setEditingMapping] = useState(null);

  useEffect(() => {
    if (activeTab === 'organizations') {
      loadOrganizations();
    } else if (activeTab === 'database') {
      loadDatabaseInfo();
    }
  }, [activeTab]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/organizations`);
      setOrganizations(response.data);
    } catch (err) {
      setError('Ошибка загрузки организаций: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, connRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/database/stats`),
        axios.get(`${API_URL}/api/admin/database/test`),
        axios.get(`${API_URL}/api/admin/database/config`)
      ]);
      setDbStats(statsRes.data);
      setDbConnection(connRes.data);
      setDbConfig(configRes.data);
      setDbConfigForm({
        host: configRes.data.host,
        port: configRes.data.port,
        database: configRes.data.database,
        user: configRes.data.user,
        password: ''
      });
    } catch (err) {
      setError('Ошибка загрузки информации о БД: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/database/test-connection`, dbConfigForm);
      if (response.data.status === 'success') {
        setSuccess(response.data.message);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Ошибка проверки подключения: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDbConfig = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/database/config`, dbConfigForm);
      setSuccess(response.data.message);
      setEditingDbConfig(false);
      loadDatabaseInfo();
    } catch (err) {
      setError('Ошибка сохранения настроек: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newOrg.orgId || !newOrg.name) {
      setError('Заполните обязательные поля: orgId и название');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        orgId: parseInt(newOrg.orgId),
        name: newOrg.name,
        description: newOrg.description || null
      };

      // Добавляем credentials если указаны оба поля
      if (newOrg.username && newOrg.password) {
        payload.username = newOrg.username;
        payload.password = newOrg.password;
      }

      await axios.post(`${API_URL}/api/admin/organizations`, payload);
      setSuccess('Организация успешно создана!');
      setNewOrg({ orgId: '', name: '', description: '', username: '', password: '' });
      loadOrganizations();
    } catch (err) {
      setError('Ошибка создания: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/api/admin/upload-logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.url;
    } catch (err) {
      throw new Error('Ошибка загрузки файла: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setLoading(true);
    try {
      const payload = {
        name: editingOrg.name,
        description: editingOrg.description
      };

      // Добавляем credentials если указаны
      if (editingOrg.username) {
        payload.username = editingOrg.username;
      }
      if (editingOrg.password) {
        payload.password = editingOrg.password;
      }

      // Добавляем logo_url если указан
      if (editingOrg.logo_url) {
        payload.logo_url = editingOrg.logo_url;
      }

      // Добавляем show_callto_columns
      if (editingOrg.show_callto_columns !== undefined) {
        payload.show_callto_columns = editingOrg.show_callto_columns;
      }

      await axios.put(`${API_URL}/api/admin/organizations/${editingOrg.id}`, payload);
      setSuccess('Организация успешно обновлена!');
      setEditingOrg(null);
      loadOrganizations();
    } catch (err) {
      setError('Ошибка обновления: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (org) => {
    if (!window.confirm(`Вы уверены, что хотите удалить организацию "${org.name}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/api/admin/organizations/${org.id}`);
      setSuccess('Организация успешно удалена!');
      loadOrganizations();
    } catch (err) {
      setError('Ошибка удаления: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Функции для работы с маппингами телефонов
  const loadPhoneMappings = async (orgId) => {
    try {
      const response = await axios.get(`${API_URL}/api/phone-mappings/${orgId}`);
      setPhoneMappings(response.data);
    } catch (err) {
      console.error('Ошибка загрузки маппингов:', err);
    }
  };

  const handleCreateMapping = async (e, orgId) => {
    e.preventDefault();
    if (!newMapping.phone_number || !newMapping.display_name) {
      setError('Заполните номер телефона и название');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/phone-mappings`, {
        org_id: orgId,
        ...newMapping
      });
      setSuccess('Маппинг успешно создан!');
      setNewMapping({ phone_number: '', display_name: '', color: '#1890ff' });
      loadPhoneMappings(orgId);
    } catch (err) {
      setError('Ошибка создания маппинга: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMapping = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.put(`${API_URL}/api/phone-mappings/${editingMapping.id}`, {
        phone_number: editingMapping.phone_number,
        display_name: editingMapping.display_name,
        color: editingMapping.color
      });
      setSuccess('Маппинг успешно обновлён!');
      setEditingMapping(null);
      loadPhoneMappings(editingOrg.id);
    } catch (err) {
      setError('Ошибка обновления маппинга: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (mappingId, orgId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот маппинг?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.delete(`${API_URL}/api/phone-mappings/${mappingId}`);
      setSuccess('Маппинг успешно удалён!');
      loadPhoneMappings(orgId);
    } catch (err) {
      setError('Ошибка удаления маппинга: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1>Панель администратора</h1>
          <p>Пользователь: {user?.name || user?.username}</p>
        </div>
        <div className="admin-header-actions">
          <button onClick={onBack} className="btn btn-secondary">
            Назад к дашборду
          </button>
          <button onClick={onLogout} className="btn btn-danger">
            Выйти
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          Организации
        </button>
        <button
          className={`tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          База данных
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'organizations' && (
        <div className="admin-content">
          <div className="card">
            <h2>Добавить новую организацию</h2>
            <form onSubmit={handleCreateOrganization} className="org-form">
              <div className="form-group">
                <label>Org ID (числовой) *</label>
                <input
                  type="number"
                  value={newOrg.orgId}
                  onChange={(e) => setNewOrg({ ...newOrg, orgId: e.target.value })}
                  placeholder="Например: 5"
                  required
                  disabled={loading}
                />
                <small>Уникальный числовой ID для связи с CDR таблицей</small>
              </div>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="Например: Салат"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  value={newOrg.description}
                  onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                  placeholder="Например: Ресторан Салат"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Логин для доступа</label>
                <input
                  type="text"
                  value={newOrg.username}
                  onChange={(e) => setNewOrg({ ...newOrg, username: e.target.value })}
                  placeholder="Например: salat_user"
                  disabled={loading}
                />
                <small>Логин для входа представителей организации</small>
              </div>
              <div className="form-group">
                <label>Пароль для доступа</label>
                <input
                  type="password"
                  value={newOrg.password}
                  onChange={(e) => setNewOrg({ ...newOrg, password: e.target.value })}
                  placeholder="Введите пароль"
                  disabled={loading}
                />
                <small>Пароль для входа (оставьте пустым, если не нужен)</small>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Создание...' : 'Создать организацию'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Список организаций ({organizations.length})</h2>
            {loading && <p>Загрузка...</p>}
            {!loading && organizations.length === 0 && (
              <p className="no-data">Организации не найдены. Создайте первую организацию выше.</p>
            )}
            {!loading && organizations.length > 0 && (
              <div className="org-list">
                {organizations.map((org) => (
                  <div key={org.id} className="org-item">
                    {editingOrg?.id === org.id ? (
                      <form onSubmit={handleUpdateOrganization} className="edit-form">
                        <div className="form-group">
                          <label>Название</label>
                          <input
                            type="text"
                            value={editingOrg.name}
                            onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Описание</label>
                          <input
                            type="text"
                            value={editingOrg.description || ''}
                            onChange={(e) => setEditingOrg({ ...editingOrg, description: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Логотип</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  setLoading(true);
                                  setError('');
                                  const logoUrl = await handleLogoUpload(file);

                                  // Сразу сохраняем логотип в базу данных
                                  await axios.put(`${API_URL}/api/admin/organizations/${editingOrg.id}`, {
                                    name: editingOrg.name,
                                    description: editingOrg.description,
                                    logo_url: logoUrl
                                  });

                                  setEditingOrg({ ...editingOrg, logo_url: logoUrl });
                                  setSuccess('Логотип успешно загружен и сохранён!');

                                  // Обновляем данные в localStorage для текущей организации
                                  const savedUser = localStorage.getItem('user');
                                  const savedOrg = localStorage.getItem('currentOrganization');

                                  if (savedUser) {
                                    const userData = JSON.parse(savedUser);
                                    // Обновляем logo_url в массиве organizations
                                    if (userData.organizations) {
                                      userData.organizations = userData.organizations.map(org =>
                                        org.id === editingOrg.id ? { ...org, logo_url: logoUrl } : org
                                      );
                                      localStorage.setItem('user', JSON.stringify(userData));
                                    }
                                  }

                                  if (savedOrg) {
                                    const orgData = JSON.parse(savedOrg);
                                    if (orgData.id === editingOrg.id) {
                                      orgData.logo_url = logoUrl;
                                      localStorage.setItem('currentOrganization', JSON.stringify(orgData));
                                    }
                                  }

                                  // Перезагружаем список организаций
                                  setTimeout(() => {
                                    loadOrganizations();
                                    // Перезагружаем страницу, чтобы обновить Dashboard
                                    window.dispatchEvent(new Event('storage'));
                                  }, 500);
                                } catch (err) {
                                  setError(err.response?.data?.detail || err.message);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                          />
                          {editingOrg.logo_url && (
                            <div style={{ marginTop: '10px' }}>
                              <img
                                src={`${API_URL}${editingOrg.logo_url}`}
                                alt="Logo preview"
                                style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    // Удаляем логотип из базы данных
                                    await axios.put(`${API_URL}/api/admin/organizations/${editingOrg.id}`, {
                                      name: editingOrg.name,
                                      description: editingOrg.description,
                                      logo_url: ''
                                    });
                                    setEditingOrg({ ...editingOrg, logo_url: '' });
                                    setSuccess('Логотип удалён!');

                                    // Обновляем данные в localStorage
                                    const savedUser = localStorage.getItem('user');
                                    const savedOrg = localStorage.getItem('currentOrganization');

                                    if (savedUser) {
                                      const userData = JSON.parse(savedUser);
                                      if (userData.organizations) {
                                        userData.organizations = userData.organizations.map(org =>
                                          org.id === editingOrg.id ? { ...org, logo_url: '' } : org
                                        );
                                        localStorage.setItem('user', JSON.stringify(userData));
                                      }
                                    }

                                    if (savedOrg) {
                                      const orgData = JSON.parse(savedOrg);
                                      if (orgData.id === editingOrg.id) {
                                        orgData.logo_url = '';
                                        localStorage.setItem('currentOrganization', JSON.stringify(orgData));
                                      }
                                    }

                                    setTimeout(() => {
                                      loadOrganizations();
                                      window.dispatchEvent(new Event('storage'));
                                    }, 500);
                                  } catch (err) {
                                    setError(err.response?.data?.detail || err.message);
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                style={{ marginLeft: '10px', padding: '2px 8px' }}
                              >
                                Удалить
                              </button>
                            </div>
                          )}
                          <small>Логотип будет сохранён автоматически после загрузки</small>
                        </div>
                        <div className="form-group">
                          <label>Логин для доступа</label>
                          <input
                            type="text"
                            value={editingOrg.username || ''}
                            onChange={(e) => setEditingOrg({ ...editingOrg, username: e.target.value })}
                            placeholder="Новый логин (или оставьте пустым)"
                          />
                          <small>Текущий: {org.credential_username || 'не указан'}</small>
                        </div>
                        <div className="form-group">
                          <label>Новый пароль</label>
                          <input
                            type="password"
                            value={editingOrg.password || ''}
                            onChange={(e) => setEditingOrg({ ...editingOrg, password: e.target.value })}
                            placeholder="Оставьте пустым, чтобы не менять"
                          />
                          <small>Оставьте пустым для сохранения текущего пароля</small>
                        </div>
                        <div className="form-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={editingOrg.show_callto_columns || false}
                              onChange={(e) => setEditingOrg({ ...editingOrg, show_callto_columns: e.target.checked })}
                            />
                            {' '}Показывать колонки callto1 и callto2
                          </label>
                          <small>Включите, чтобы показывать внутренние номера в таблице звонков</small>
                        </div>

                        {/* Секция маппингов телефонов */}
                        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                          <h4>Маппинги телефонных номеров</h4>
                          <small>Замените внутренние номера на понятные названия</small>

                          {/* Форма добавления нового маппинга */}
                          <form onSubmit={(e) => handleCreateMapping(e, editingOrg.id)} style={{ marginTop: '15px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label style={{ fontSize: '12px' }}>Номер телефона</label>
                                <input
                                  type="text"
                                  value={newMapping.phone_number}
                                  onChange={(e) => setNewMapping({ ...newMapping, phone_number: e.target.value })}
                                  placeholder="8240"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <div className="form-group" style={{ flex: 2, margin: 0 }}>
                                <label style={{ fontSize: '12px' }}>Отображаемое название</label>
                                <input
                                  type="text"
                                  value={newMapping.display_name}
                                  onChange={(e) => setNewMapping({ ...newMapping, display_name: e.target.value })}
                                  placeholder="Батырая"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                <label style={{ fontSize: '12px' }}>Цвет</label>
                                <input
                                  type="color"
                                  value={newMapping.color}
                                  onChange={(e) => setNewMapping({ ...newMapping, color: e.target.value })}
                                  style={{ width: '100%', height: '38px' }}
                                />
                              </div>
                              <button type="submit" className="btn btn-primary btn-sm" style={{ marginBottom: 0 }}>
                                Добавить
                              </button>
                            </div>
                          </form>

                          {/* Список существующих маппингов */}
                          {phoneMappings.length > 0 ? (
                            <div style={{ marginTop: '10px' }}>
                              {phoneMappings.map((mapping) => (
                                <div key={mapping.id} style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'center',
                                  padding: '8px',
                                  marginBottom: '8px',
                                  border: '1px solid #eee',
                                  borderRadius: '4px'
                                }}>
                                  {editingMapping?.id === mapping.id ? (
                                    <form onSubmit={handleUpdateMapping} style={{ display: 'flex', gap: '10px', flex: 1, alignItems: 'center' }}>
                                      <input
                                        type="text"
                                        value={editingMapping.phone_number}
                                        onChange={(e) => setEditingMapping({ ...editingMapping, phone_number: e.target.value })}
                                        style={{ flex: 1 }}
                                      />
                                      <input
                                        type="text"
                                        value={editingMapping.display_name}
                                        onChange={(e) => setEditingMapping({ ...editingMapping, display_name: e.target.value })}
                                        style={{ flex: 2 }}
                                      />
                                      <input
                                        type="color"
                                        value={editingMapping.color}
                                        onChange={(e) => setEditingMapping({ ...editingMapping, color: e.target.value })}
                                        style={{ width: '50px', height: '30px' }}
                                      />
                                      <button type="submit" className="btn btn-primary btn-sm">Сохранить</button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEditingMapping(null)}
                                      >
                                        Отмена
                                      </button>
                                    </form>
                                  ) : (
                                    <>
                                      <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '3px',
                                        backgroundColor: mapping.color
                                      }} />
                                      <span style={{ flex: 1 }}><strong>{mapping.phone_number}</strong></span>
                                      <span style={{ flex: 2, color: mapping.color }}>{mapping.display_name}</span>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEditingMapping(mapping)}
                                      >
                                        Изменить
                                      </button>
                                      <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDeleteMapping(mapping.id, editingOrg.id)}
                                      >
                                        Удалить
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                              Маппинги не добавлены. Используйте форму выше для добавления.
                            </p>
                          )}
                        </div>

                        <div className="edit-actions">
                          <button type="submit" className="btn btn-primary btn-sm">
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingOrg(null)}
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="org-info">
                          <div className="org-id">Org ID: <strong>{org.orgId}</strong></div>
                          <div className="org-name">{org.name}</div>
                          <div className="org-description">{org.description || 'Без описания'}</div>
                          <div className="org-meta">
                            Создана: {new Date(org.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="org-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingOrg(org);
                              loadPhoneMappings(org.id);
                            }}
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteOrganization(org)}
                          >
                            Удалить
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="admin-content">
          <div className="card">
            <h2>Состояние подключения к БД</h2>
            {loading && <p>Проверка подключения...</p>}
            {!loading && dbConnection && (
              <div className="db-connection">
                <div className={`status-badge ${dbConnection.status === 'connected' ? 'success' : 'error'}`}>
                  {dbConnection.status === 'connected' ? '✓ Подключено' : '✗ Ошибка'}
                </div>
                <div className="db-info">
                  <p><strong>База данных:</strong> {dbConnection.database}</p>
                  <p><strong>Пользователь:</strong> {dbConnection.user}</p>
                  <p><strong>Версия:</strong> {dbConnection.version}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Настройки подключения к БД</h2>
            {!editingDbConfig && dbConfig && (
              <>
                <div className="db-config-view">
                  <div className="config-item">
                    <strong>Хост:</strong> {dbConfig.host}
                  </div>
                  <div className="config-item">
                    <strong>Порт:</strong> {dbConfig.port}
                  </div>
                  <div className="config-item">
                    <strong>База данных:</strong> {dbConfig.database}
                  </div>
                  <div className="config-item">
                    <strong>Пользователь:</strong> {dbConfig.user}
                  </div>
                  <div className="config-item">
                    <strong>Пароль:</strong> {dbConfig.password_set ? '••••••••' : 'Не установлен'}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setEditingDbConfig(true)}
                  style={{ marginTop: '16px' }}
                >
                  Изменить настройки
                </button>
              </>
            )}
            {editingDbConfig && (
              <form onSubmit={handleSaveDbConfig} className="db-config-form">
                <div className="form-group">
                  <label>Хост *</label>
                  <input
                    type="text"
                    value={dbConfigForm.host}
                    onChange={(e) => setDbConfigForm({ ...dbConfigForm, host: e.target.value })}
                    placeholder="localhost или IP адрес"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Порт *</label>
                  <input
                    type="number"
                    value={dbConfigForm.port}
                    onChange={(e) => setDbConfigForm({ ...dbConfigForm, port: e.target.value })}
                    placeholder="5432"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>База данных *</label>
                  <input
                    type="text"
                    value={dbConfigForm.database}
                    onChange={(e) => setDbConfigForm({ ...dbConfigForm, database: e.target.value })}
                    placeholder="atc_analytics"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Пользователь *</label>
                  <input
                    type="text"
                    value={dbConfigForm.user}
                    onChange={(e) => setDbConfigForm({ ...dbConfigForm, user: e.target.value })}
                    placeholder="postgres"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>Пароль</label>
                  <input
                    type="password"
                    value={dbConfigForm.password}
                    onChange={(e) => setDbConfigForm({ ...dbConfigForm, password: e.target.value })}
                    placeholder="Оставьте пустым, чтобы не менять"
                    disabled={loading}
                  />
                  <small>Введите новый пароль или оставьте пустым, чтобы сохранить текущий</small>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    Проверить подключение
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingDbConfig(false)}
                    disabled={loading}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card">
            <h2>Статистика базы данных</h2>
            {loading && <p>Загрузка статистики...</p>}
            {!loading && dbStats && (
              <div className="db-stats">
                <div className="stat-item">
                  <div className="stat-value">{dbStats.organizations_count}</div>
                  <div className="stat-label">Организаций</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{dbStats.calls_count}</div>
                  <div className="stat-label">Звонков</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{dbStats.users_count}</div>
                  <div className="stat-label">Пользователей</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {dbStats.last_call_date
                      ? new Date(dbStats.last_call_date).toLocaleDateString()
                      : 'Н/Д'}
                  </div>
                  <div className="stat-label">Последний звонок</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
