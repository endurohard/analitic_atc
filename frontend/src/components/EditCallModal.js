import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EditCallModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const EditCallModal = ({ call, orgId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    reserveMobile: '',
    callto1: '',
    callto2: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (call) {
      setFormData({
        reserveMobile: call.reserveMobile || '',
        callto1: call.callto1 || '',
        callto2: call.callto2 || ''
      });
    }
  }, [call]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.put(
        `${API_URL}/api/calls/${call.id}`,
        formData,
        { params: { orgId } }
      );
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Ошибка при сохранении данных');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!call) return null;

  return (
    <div className="edit-call-modal-overlay" onClick={handleOverlayClick}>
      <div className="edit-call-modal">
        <div className="edit-call-modal-header">
          <h2>Редактирование звонка</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-call-form">
          <div className="form-group">
            <label htmlFor="reserveMobile">Резервный номер:</label>
            <input
              type="text"
              id="reserveMobile"
              name="reserveMobile"
              value={formData.reserveMobile}
              onChange={handleChange}
              placeholder="+79XXXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="callto1">Фундук (callto1):</label>
            <input
              type="text"
              id="callto1"
              name="callto1"
              value={formData.callto1}
              onChange={handleChange}
              placeholder="Введите значение"
            />
          </div>

          <div className="form-group">
            <label htmlFor="callto2">Callto2:</label>
            <input
              type="text"
              id="callto2"
              name="callto2"
              value={formData.callto2}
              onChange={handleChange}
              placeholder="Введите значение"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCallModal;
