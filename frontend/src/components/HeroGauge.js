import React from 'react';
import './HeroGauge.css';

function HeroGauge({
  title = 'Приём звонков',
  subtitle = 'Доля принятых вызовов',
  value = 0,
  caption,
  tone = 'mint',
}) {
  const pct = Math.max(0, Math.min(100, value));

  const radius = 76;
  const stroke = 14;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  const gradientId = `hero-gauge-gradient-${tone}`;

  return (
    <div className={`hero-gauge hero-gauge--${tone}`}>
      <div className="hero-gauge__header">
        <div className="hero-gauge__title">{title}</div>
        <div className="hero-gauge__subtitle">{subtitle}</div>
      </div>

      <div className="hero-gauge__arc-wrap">
        <svg
          viewBox="0 0 200 110"
          className="hero-gauge__svg"
          role="img"
          aria-label={`${title}: ${Math.round(pct)}%`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="hero-gauge__stop-from" />
              <stop offset="100%" className="hero-gauge__stop-to" />
            </linearGradient>
          </defs>

          <path
            d={`M ${100 - radius},100 A ${radius},${radius} 0 0 1 ${100 + radius},100`}
            className="hero-gauge__track"
            strokeWidth={stroke}
          />
          <path
            d={`M ${100 - radius},100 A ${radius},${radius} 0 0 1 ${100 + radius},100`}
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="hero-gauge__arc"
          />
        </svg>
        <div className="hero-gauge__value">
          {Math.round(pct)}
          <span className="hero-gauge__value-unit">%</span>
        </div>
      </div>

      {caption && <div className="hero-gauge__caption">{caption}</div>}
    </div>
  );
}

export default HeroGauge;
