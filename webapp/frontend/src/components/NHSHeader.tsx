import React from 'react';
import { NavLink } from 'react-router-dom';

export function NHSHeader() {
  return (
    <header>
      <div className="nhs-header">
        <div className="nhs-header__inner">
          <NavLink to="/" className="nhs-logo">
            <span className="nhs-logo__badge">NHS</span>
            <span className="nhs-logo__text">
              PROMs Knee Replacement<br />Outcome Predictor
            </span>
          </NavLink>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', textAlign: 'right', maxWidth: '220px' }}>
            Research Decision-Support Tool<br />Not for clinical diagnosis
          </div>
        </div>
      </div>
      <nav className="nhs-nav" aria-label="Main navigation">
        <div className="nhs-nav__inner">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nhs-nav__link${isActive ? ' nhs-nav__link--active' : ''}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/methodology"
            className={({ isActive }) =>
              `nhs-nav__link${isActive ? ' nhs-nav__link--active' : ''}`
            }
          >
            Methodology
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nhs-nav__link${isActive ? ' nhs-nav__link--active' : ''}`
            }
          >
            Model Dashboard
          </NavLink>
          <NavLink
            to="/predictor"
            className={({ isActive }) =>
              `nhs-nav__link${isActive ? ' nhs-nav__link--active' : ''}`
            }
          >
            Patient Predictor
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
