import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, onClose, options }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Проверка чтобы меню не выходило за границы экрана
  const menuStyle = {
    position: 'fixed',
    top: `${Math.min(y, window.innerHeight - 300)}px`,
    left: `${Math.min(x, window.innerWidth - 200)}px`,
    zIndex: 10000,
  };

  return (
    <div className="context-menu" style={menuStyle} ref={menuRef}>
      {options.map((option, index) => (
        <React.Fragment key={index}>
          {option.separator ? (
            <div className="context-menu-separator" />
          ) : (
            <div
              className={`context-menu-item ${option.disabled ? 'disabled' : ''} ${option.danger ? 'danger' : ''}`}
              onClick={() => {
                if (!option.disabled && option.onClick) {
                  option.onClick();
                  onClose();
                }
              }}
            >
              {option.icon && <span className="context-menu-icon">{option.icon}</span>}
              <span className="context-menu-label">{option.label}</span>
              {option.shortcut && <span className="context-menu-shortcut">{option.shortcut}</span>}
              {option.submenu && <span className="context-menu-arrow">›</span>}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
