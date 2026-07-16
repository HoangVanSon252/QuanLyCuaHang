import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

// Import Pages & Layouts
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Inventory from './pages/Inventory/Inventory';
import POS from './pages/POS/POS';
import Report from './pages/Report/Report';
import UserManagement from './pages/UserManagement/UserManagement';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// check path
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('isAuthenticated');
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
};

//DATA ROUTER API

const router = createBrowserRouter([
  
  // ĐĂNG NHẬP (Dùng AuthLayout)
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> }
    ]
  },

  // BÊN TRONG HỆ THỐNG (Dùng MainLayout)
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/inventory", element: <Inventory /> },
      { path: "/pos", element: <POS /> },
      { path: "/report", element: <Report /> },
      { path: "/admin/users", element: <UserManagement /> }
    ]
  }

]);


function App() {
  return <RouterProvider router={router} />;
}

export default App;