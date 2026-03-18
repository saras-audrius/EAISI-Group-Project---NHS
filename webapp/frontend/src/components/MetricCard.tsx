import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'green' | 'red' | 'amber';
  icon?: string;
}

export function MetricCard({ label, value, subtitle, variant = 'default', icon }: MetricCardProps) {
  const valueClass = variant === 'default'
    ? 'nhs-card__value'
    : `nhs-card__value nhs-card__value--${variant}`;

  return (
    <div className="nhs-card">
      {icon && <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>}
      <div className="nhs-card__label">{label}</div>
      <div className={valueClass}>{value}</div>
      {subtitle && <div className="nhs-card__subtitle">{subtitle}</div>}
    </div>
  );
}
