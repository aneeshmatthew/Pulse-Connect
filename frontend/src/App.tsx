import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import { client } from '@/lib/apollo';
import { useAuthStore } from '@/store';
import { HomePage } from '@/pages/Home';
import { LoginPage, RegisterPage } from '@/pages/Auth';
import { ProfilePage } from '@/pages/Profile';
import { MessagesPage } from '@/pages/Messages';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/"         element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/profile/:username" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/messages"          element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
          <Route path="/messages/:conversationId" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontFamily: 'inherit',
            fontSize: '14px',
            maxWidth: '420px',
          },
          success: { iconTheme: { primary: '#1877F2', secondary: '#fff' } },
        }}
      />
    </ApolloProvider>
  );
}
