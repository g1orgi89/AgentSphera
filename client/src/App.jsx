import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

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
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute><Clients /></ProtectedRoute>
      } />
      <Route path="/clients/:id" element={
        <ProtectedRoute><ClientDetail /></ProtectedRoute>
      } />
      <Route path="/contracts" element={
        <ProtectedRoute><Contracts /></ProtectedRoute>
      } />
      <Route path="/tasks" element={
        <ProtectedRoute><Tasks /></ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute><Calendar /></ProtectedRoute>
      } />
      <Route path="/acts" element={
        <ProtectedRoute><Acts /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
