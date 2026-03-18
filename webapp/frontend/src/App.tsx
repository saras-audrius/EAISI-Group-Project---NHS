import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NHSHeader } from './components/NHSHeader';
import { NHSFooter } from './components/NHSFooter';
import { Home } from './pages/Home';
import { Methodology } from './pages/Methodology';
import { Dashboard } from './pages/Dashboard';
import { PatientPredictor } from './pages/PatientPredictor';
import './styles/nhs.css';

export default function App() {
  return (
    <BrowserRouter>
      <NHSHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/predictor" element={<PatientPredictor />} />
      </Routes>
      <NHSFooter />
    </BrowserRouter>
  );
}
