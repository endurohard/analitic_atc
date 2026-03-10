import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username || !password) {
        setError('Введите имя пользователя и пароль');
        return;
      }

      // Аутентификация через API
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: username,
        password: password
      });

      // response.data может содержать:
      // 1. {user: {..., organizations: [...]}} - для суперадмина
      // 2. {user: {...}, organization: {...}} - для обычного пользователя
      const { user, organization } = response.data;

      let userData;
      if (user.organizations) {
        // Суперадмин - организации уже в user.organizations
        // Сортируем по ID для стабильного порядка
        userData = {
          ...user,
          organizations: user.organizations.sort((a, b) => a.id - b.id)
        };
      } else {
        // Обычный пользователь - создаем userData с одной организацией
        userData = {
          id: user.id,
          username: user.username,
          name: user.name,
          organizations: [organization]
        };
      }

      onLogin(userData);
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.status === 401) {
        setError('Неверный логин или пароль');
      } else {
        setError('Ошибка подключения к серверу');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>АТС Аналитика</h1>
          <p>Войдите в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
