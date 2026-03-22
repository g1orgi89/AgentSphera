import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Contracts from './pages/Contracts';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Acts from './pages/Acts';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>
      } />
      <Route path="/clients/:id" element={
        <ProtectedRoute><Layout><ClientDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/contracts" element={
        <ProtectedRoute><Layout><Contracts /></Layout></ProtectedRoute>
      } />
      <Route path="/tasks" element={
        <ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>
      } />
      <Route path="/acts" element={
        <ProtectedRoute><Layout><Acts /></Layout></ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
