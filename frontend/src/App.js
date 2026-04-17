import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Welcome from './components/Welcome';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MobileDashboard from './components/MobileDashboard';
import OrganizationSelector from './components/OrganizationSelector';
import AdminPanel from './components/AdminPanel';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // Проверка сохраненной сессии
    const savedUser = localStorage.getItem('user');
    const savedOrg = localStorage.getItem('currentOrganization');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }

    if (savedOrg) {
      setCurrentOrganization(JSON.parse(savedOrg));
    }

    // Слушатель для обновления данных при изменении localStorage
    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem('user');
      const updatedOrg = localStorage.getItem('currentOrganization');

      if (updatedUser) {
        setUser(JSON.parse(updatedUser));
      }

      if (updatedOrg) {
        setCurrentOrganization(JSON.parse(updatedOrg));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Отслеживание изменения размера окна
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));

    // Если у пользователя только одна организация, автоматически выбираем её
    if (userData.organizations && userData.organizations.length === 1) {
      handleOrganizationChange(userData.organizations[0]);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentOrganization(null);
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrganization');
  };

  const handleOrganizationChange = (org) => {
    setCurrentOrganization(org);
    localStorage.setItem('currentOrganization', JSON.stringify(org));
  };

  // Выбор компонента Dashboard в зависимости от устройства
  const DashboardComponent = isMobile ? MobileDashboard : Dashboard;

  return (
    <ThemeProvider>
    <Router basename={process.env.PUBLIC_URL || '/'}>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              !isAuthenticated ?
              <Welcome /> :
              !currentOrganization ?
              <OrganizationSelector
                user={user}
                onSelectOrganization={handleOrganizationChange}
                onLogout={handleLogout}
              /> :
              <DashboardComponent
                user={user}
                organization={currentOrganization}
                onLogout={handleLogout}
                onChangeOrganization={() => setCurrentOrganization(null)}
              />
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ?
              <Navigate to="/dashboard" /> :
              <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/dashboard"
            element={
              !isAuthenticated ?
              <Navigate to="/" /> :
              !currentOrganization ?
              <OrganizationSelector
                user={user}
                onSelectOrganization={handleOrganizationChange}
                onLogout={handleLogout}
              /> :
              <DashboardComponent
                user={user}
                organization={currentOrganization}
                onLogout={handleLogout}
                onChangeOrganization={() => setCurrentOrganization(null)}
              />
            }
          />
          <Route
            path="/admin"
            element={
              !isAuthenticated ?
              <Navigate to="/login" /> :
              <AdminPanel
                user={user}
                onLogout={handleLogout}
                onBack={() => window.history.back()}
              />
            }
          />
        </Routes>
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;
