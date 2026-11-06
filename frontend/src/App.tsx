import { AuthProvider, useAuth } from './auth/AuthContext';
import { SocketProvider } from './socket/SocketContext';
import { LoginPage } from './auth/LoginPage';
import { AdminApp } from './admin/AdminApp';
import { PatientApp } from './patient/PatientApp';

function RoleRouter() {
  const { auth } = useAuth();
  if (!auth) return <LoginPage />;
  return auth.role === 'admin' ? <AdminApp /> : <PatientApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RoleRouter />
      </SocketProvider>
    </AuthProvider>
  );
}
