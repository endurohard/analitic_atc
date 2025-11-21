import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <div className="welcome-header">
        <div className="welcome-logo">
          <div className="logo-icon">📊</div>
          <h1>АТС Аналитика</h1>
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-hero">
          <h2>Аналитика телефонных звонков в реальном времени</h2>
          <p className="hero-subtitle">
            Мощная платформа для мониторинга и анализа звонков вашей АТС
          </p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Войти в систему
          </button>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Статистика в реальном времени</h3>
            <p>Отслеживайте принятые, пропущенные и необработанные звонки</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏢</div>
            <h3>Мультиорганизационность</h3>
            <p>Управление множеством организаций с разграничением доступа</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Визуализация данных</h3>
            <p>Интерактивные графики и диаграммы для анализа</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h3>Мониторинг звонков</h3>
            <p>Отслеживание активных и необработанных звонков</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Детальная аналитика</h3>
            <p>Полная информация по каждому звонку с фильтрацией</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Быстрый доступ</h3>
            <p>Современный и отзывчивый интерфейс</p>
          </div>
        </div>

        <div className="welcome-stats">
          <div className="stat-item">
            <div className="stat-number">∞</div>
            <div className="stat-label">Звонков</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Мониторинг</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">⚡</div>
            <div className="stat-label">В реальном времени</div>
          </div>
        </div>
      </div>

      <div className="welcome-footer">
        <p>&copy; 2024 АТС Аналитика. Версия 2.0.0</p>
      </div>
    </div>
  );
};

export default Welcome;
