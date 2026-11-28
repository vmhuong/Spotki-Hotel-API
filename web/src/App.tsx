import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { ServicesPage } from './pages/ServicesPage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { BookingPage } from './pages/BookingPage';
import { LookupBookingPage } from './pages/LookupBookingPage';
import { AuthPage } from './pages/AuthPage';
import { CustomerPortalPage } from './pages/CustomerPortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const CustomerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCustomer } = useAuth();
  return isCustomer ? <>{children}</> : <Navigate to="/auth" replace />;
};

const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isStaff } = useAuth();
  return isStaff ? <>{children}</> : <Navigate to="/auth?mode=admin" replace />;
};

const PublicLayout: React.FC = () => {
  const location = useLocation();
  const hasDarkHero = ['/', '/rooms', '/services'].includes(location.pathname);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const revealNode = (el: HTMLElement) => {
      el.classList.remove('reveal-hidden');
      el.classList.add('reveal-visible');
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealNode(entry.target as HTMLElement);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '100px 0px 100px 0px' }
    );

    const scan = () => {
      const nodes = mainEl.querySelectorAll('article');
      nodes.forEach((node) => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const inOrAboveView = rect.top <= window.innerHeight + 80;

        if (inOrAboveView) {
          revealNode(el);
          io.unobserve(el);
        } else if (el.dataset.revealBound !== '1') {
          el.dataset.revealBound = '1';
          el.classList.add('reveal-hidden');
          io.observe(el);
        }
      });
    };

    scan();
    const t1 = window.setTimeout(scan, 250);
    const t2 = window.setTimeout(scan, 800);
    window.addEventListener('scroll', scan, { passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', scan);
      io.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${hasDarkHero ? '' : 'pt-16'}`}>
        <Outlet />
      </main>
      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public & Customer Website Shell */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/rooms/:id" element={<RoomDetailPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/lookup" element={<LookupBookingPage />} />
              <Route
                path="/portal"
                element={
                  <CustomerRoute>
                    <CustomerPortalPage />
                  </CustomerRoute>
                }
              />
            </Route>

            {/* Standalone Auth Page (matching login.php) */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Standalone Admin Portal (matching admin.php) */}
            <Route
              path="/admin"
              element={
                <StaffRoute>
                  <AdminDashboardPage />
                </StaffRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
