import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { getUser, isAuthenticated, homePathFor, ROLES } from './utils/auth';

// Tải trang theo nhu cầu (code-splitting) → lần mở đầu tiên nhanh hơn
const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory/Inventory'));
const POS = lazy(() => import('./pages/POS/POS'));
const Report = lazy(() => import('./pages/Report/Report'));
const StoreManagement = lazy(() => import('./pages/StoreManagement/StoreManagement'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const Imports = lazy(() => import('./pages/Imports/Imports'));
const Account = lazy(() => import('./pages/Account/Account'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-24 text-gray-400 text-sm" role="status">
    <span className="w-5 h-5 mr-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    Đang tải...
  </div>
);

const withSuspense = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

// Bắt buộc đăng nhập (giao diện). Bảo mật thật nằm ở backend: mọi API đều kiểm tra token & quyền.
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  if (!isAuthenticated()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
};

// Chỉ hiển thị trang cho vai trò phù hợp; sai vai trò → về trang chủ của vai trò đó
const RoleRoute = ({ roles, children }) => {
  const user = getUser();
  if (!user || !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return children;
};

const { SUPER_ADMIN, STORE_ADMIN } = ROLES;
const page = (el, roles) => withSuspense(roles ? <RoleRoute roles={roles}>{el}</RoleRoute> : el);

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <ErrorBoundary.RouteError />,
    children: [{ path: '/login', element: withSuspense(<Login />) }],
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary.RouteError />,
    children: [
      { path: '/', element: page(<Dashboard />, [STORE_ADMIN]) },
      { path: '/inventory', element: page(<Inventory />, [STORE_ADMIN]) },
      { path: '/pos', element: page(<POS />, [STORE_ADMIN]) },
      { path: '/orders', element: page(<Orders />, [STORE_ADMIN]) },
      { path: '/imports', element: page(<Imports />, [STORE_ADMIN]) },
      { path: '/report', element: page(<Report />, [STORE_ADMIN]) },
      { path: '/admin/stores', element: page(<StoreManagement />, [SUPER_ADMIN]) },
      { path: '/account', element: page(<Account />) },
      { path: '*', element: page(<NotFound />) },
    ],
  },
]);

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
