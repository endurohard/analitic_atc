import React from 'react';
import './OrganizationSelector.css';

const OrganizationSelector = ({ user, onSelectOrganization, onLogout }) => {
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-admin';
      case 'user':
        return 'badge-user';
      case 'viewer':
        return 'badge-viewer';
      default:
        return 'badge-default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'user':
        return 'Пользователь';
      case 'viewer':
        return 'Наблюдатель';
      default:
        return role;
    }
  };

  return (
    <div className="org-selector-container">
      <div className="org-selector-header">
        <h1>Выберите организацию</h1>
        <p>Добро пожаловать, {user?.name || user?.username}</p>
        <button className="btn btn-secondary btn-sm" onClick={onLogout}>
          Выйти
        </button>
      </div>

      <div className="org-grid">
        {user?.organizations?.map((org) => (
          <div
            key={org.id}
            className="org-card"
            onClick={() => onSelectOrganization(org)}
          >
            <div className="org-card-content">
              <div className="org-icon">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="40" height="40" rx="8" fill="#1890ff" opacity="0.1" />
                  <path
                    d="M20 12L12 16V22C12 26.42 15.24 30.58 20 32C24.76 30.58 28 26.42 28 22V16L20 12Z"
                    fill="#1890ff"
                  />
                </svg>
              </div>
              <h3>{org.name}</h3>
              <span className={`role-badge ${getRoleBadgeClass(org.role)}`}>
                {getRoleLabel(org.role)}
              </span>
            </div>
            <div className="org-card-footer">
              <span>Нажмите для входа →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationSelector;
