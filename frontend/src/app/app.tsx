import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorState, Loading } from '../components/ui/states';
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
} from '../features/auth/authPages';
import { CategoriesPage } from '../features/categories/categoriesPage';
import { DashboardPage } from '../features/dashboard/dashboardPage';
import { PeriodProvider } from '../features/finance/period';
import { ProfilePage } from '../features/profile/profilePage';
import { TransactionsPage } from '../features/transactions/transactionsPage';
import { useCurrentUser } from './providers';
import { Shell } from './shell';

export function App() {
  const user = useCurrentUser();
  const location = useLocation();
  if (user.isPending) return <Loading label="Abrindo o Financy…" />;
  if (user.isError)
    return (
      <ErrorState
        error={user.error}
        retry={() => {
          void user.refetch();
        }}
      />
    );
  return (
    <PeriodProvider>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/sign-up"
          element={user.data ? <Navigate to="/" replace /> : <SignupPage />}
        />
        {user.data ? (
          <Route element={<Shell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<LoginPage />} />
            <Route
              path="*"
              element={
                <Navigate to="/" state={{ from: location.pathname }} replace />
              }
            />
          </>
        )}
        {user.data && <Route path="*" element={<Navigate to="/" replace />} />}
      </Routes>
    </PeriodProvider>
  );
}
