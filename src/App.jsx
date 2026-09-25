import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home/Home';
import Register from './pages/Register/Register';
import PassengerRegister from './pages/Register/PassengerRegister';
import DriverRegister from './pages/Register/DriverRegister';
import Login from './pages/Login/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/registro/pasajero" element={<PassengerRegister />} />
          <Route path="/registro/conductor" element={<DriverRegister />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
