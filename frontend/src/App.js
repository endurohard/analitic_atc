import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import OrganizationSelector from './components/OrganizationSelector';
import AdminPanel from './components/AdminPanel';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [user, setUser] = useState(null);

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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
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

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ?
              <Navigate to="/" /> :
              <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/"
            element={
              !isAuthenticated ?
              <Navigate to="/login" /> :
              !currentOrganization ?
              <OrganizationSelector
                user={user}
                onSelectOrganization={handleOrganizationChange}
                onLogout={handleLogout}
              /> :
              <Dashboard
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
  );
}

export default App;
