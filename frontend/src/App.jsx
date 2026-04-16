// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/revex.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Spinner from './components/common/Spinner';

// ── Lazy loading des pages ────────────────────────────────────
const Home          = lazy(() => import('./pages/Home'));
const Catalog       = lazy(() => import('./pages/catalog/Catalog'));
const ProductDetail = lazy(() => import('./pages/catalog/ProductDetail'));
const Login         = lazy(() => import('./pages/auth/Login'));
const Register      = lazy(() => import('./pages/auth/Register'));
const SellerDash    = lazy(() => import('./pages/seller/Dashboard'));
const DistribDash   = lazy(() => import('./pages/distributor/Dashboard'));
const SellerOrders    = lazy(() => import('./pages/seller/MyOrders'));
const SellerPurchases = lazy(() => import('./pages/seller/SellerPurchases'));
const PublishProduct= lazy(() => import('./pages/seller/PublishProduct'));
const SellerProducts= lazy(() => import('./pages/seller/MyProducts'));
const Qualification = lazy(() => import('./pages/seller/Qualification'));
const BuyerDash     = lazy(() => import('./pages/buyer/Dashboard'));
const MyOrders      = lazy(() => import('./pages/buyer/MyOrders'));
const BuyerProfile  = lazy(() => import('./pages/buyer/Profile'));
const MyQuotes      = lazy(() => import('./pages/buyer/MyQuotes'));
const UrgentRequest = lazy(() => import('./pages/buyer/UrgentRequest'));
const Messages      = lazy(() => import('./pages/Messages'));
const AdminDash     = lazy(() => import('./pages/admin/Dashboard'));
const WarehouseDetail = lazy(() => import('./pages/admin/WarehouseDetail'));
const AdminUsers    = lazy(() => import('./pages/admin/Users'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminDisputes = lazy(() => import('./pages/admin/Disputes'));
const StockAnalysis = lazy(() => import('./pages/seller/StockAnalysis'));
const MyWarehouse   = lazy(() => import('./pages/seller/MyWarehouse'));
const MyLots           = lazy(() => import('./pages/seller/MyLots'));
const SellerUrgents    = lazy(() => import('./pages/seller/UrgentRequests'));
const AutoMarketplace     = lazy(() => import('./pages/auto/AutoMarketplace'));
const PublishAutoProduct    = lazy(() => import('./pages/seller/PublishAutoProduct'));
const AutoProductDetail     = lazy(() => import('./pages/auto/AutoProductDetail'));
const InventaireRequest = lazy(() => import('./pages/seller/InventaireRequest'));
const TransportPage    = lazy(() => import('./pages/TransportPage'));
const TransportProfile = lazy(() => import('./pages/TransportProfile'));
const LotsPage         = lazy(() => import('./pages/lots/LotsPage'));
const LotDetail        = lazy(() => import('./pages/lots/LotDetail'));
const PublishLot       = lazy(() => import('./pages/lots/PublishLot'));
const CertVerify       = lazy(() => import('./pages/CertVerify'));
const TokensPage    = lazy(() => import('./pages/Tokens'));
const NotFound      = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } }
});

// ── Guards ────────────────────────────────────────────────────
const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'acheteur_auto' && roles && !roles.includes('acheteur_auto')) {
    return <Navigate to="/pieces-auto" replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) {
    const dest = user.role === 'admin'       ? '/admin'
               : user.role === 'seller'      ? '/seller'
               : user.role === 'distributor' ? '/distributor'
               : '/buyer';
    return <Navigate to={dest} replace />;
  }
  return children;
};

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Spinner fullPage />}>
            <Routes>
              {/* Publiques */}
              <Route element={<Layout />}>
                <Route path="/"                    element={<Home />} />
                <Route path="/pieces-auto"            element={<AutoMarketplace />} />
                <Route path="/seller/publier-auto"   element={<PrivateRoute roles={['seller','admin','distributor']}><PublishAutoProduct /></PrivateRoute>} />
                <Route path="/catalogue"           element={<Catalog />} />
                <Route path="/auto/:slug"           element={<AutoProductDetail />} />
                <Route path="/produit/:slug"        element={<ProductDetail />} />
                <Route path="/transport"            element={<TransportPage />} />
                <Route path="/transport/profil"     element={<PrivateRoute><TransportProfile /></PrivateRoute>} />
                <Route path="/lots"                 element={<LotsPage />} />
                <Route path="/lots/publier"         element={<PrivateRoute roles={['seller','admin','distributor']}><PublishLot /></PrivateRoute>} />
                <Route path="/lots/:slug"            element={<LotDetail />} />
                <Route path="/certificat/:hash"     element={<CertVerify />} />

                {/* Auth */}
                <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

                {/* Vendeur */}
                <Route path="/seller"              element={<PrivateRoute roles={['seller','admin']}><SellerDash /></PrivateRoute>} />
                <Route path="/distributor"         element={<PrivateRoute roles={['distributor','admin']}><DistribDash /></PrivateRoute>} />
                <Route path="/seller/commandes"    element={<PrivateRoute roles={['seller','admin','distributor']}><SellerOrders /></PrivateRoute>} />
                <Route path="/seller/achats"       element={<PrivateRoute roles={['seller','admin','distributor']}><SellerPurchases /></PrivateRoute>} />
                <Route path="/seller/produits"     element={<PrivateRoute roles={['seller','admin','distributor']}><SellerProducts /></PrivateRoute>} />
                <Route path="/seller/publier"      element={<PrivateRoute roles={['seller','admin','distributor']}><PublishProduct /></PrivateRoute>} />
                <Route path="/seller/publier/:id"  element={<PrivateRoute roles={['seller','admin','distributor']}><PublishProduct /></PrivateRoute>} />
                <Route path="/seller/qualification" element={<PrivateRoute roles={['seller','distributor']}><Qualification /></PrivateRoute>} />
                <Route path="/seller/analyse"      element={<PrivateRoute roles={['seller','admin','distributor']}><StockAnalysis /></PrivateRoute>} />
                <Route path="/seller/stock"        element={<PrivateRoute roles={['seller','admin','distributor']}><MyWarehouse /></PrivateRoute>} />
                <Route path="/seller/urgences"   element={<PrivateRoute roles={['seller','admin','distributor']}><SellerUrgents /></PrivateRoute>} />
                <Route path="/seller/mes-lots"    element={<PrivateRoute roles={['seller','admin','distributor']}><MyLots /></PrivateRoute>} />
                <Route path="/seller/inventaire"   element={<PrivateRoute roles={['seller','admin','distributor']}><InventaireRequest /></PrivateRoute>} />

                {/* Acheteur — distributeur peut aussi acheter */}
                <Route path="/buyer"               element={<PrivateRoute roles={['buyer','admin','distributor','acheteur_auto']}><BuyerDash /></PrivateRoute>} />
                <Route path="/buyer/commandes"     element={<PrivateRoute roles={['buyer','admin','distributor','acheteur_auto']}><MyOrders /></PrivateRoute>} />
                <Route path="/buyer/profil"        element={<PrivateRoute roles={['buyer','admin','distributor','acheteur_auto']}><BuyerProfile /></PrivateRoute>} />
                <Route path="/buyer/devis"         element={<PrivateRoute roles={['buyer','admin','distributor','acheteur_auto']}><MyQuotes /></PrivateRoute>} />
                <Route path="/buyer/urgence"       element={<PrivateRoute roles={['buyer','admin','distributor','acheteur_auto']}><UrgentRequest /></PrivateRoute>} />

                {/* Messages */}
                <Route path="/messages"            element={<PrivateRoute><Messages /></PrivateRoute>} />
                <Route path="/messages/:id"        element={<PrivateRoute><Messages /></PrivateRoute>} />

                {/* Jetons */}
                <Route path="/tokens"              element={<PrivateRoute><TokensPage /></PrivateRoute>} />

                {/* Admin */}
                <Route path="/admin"               element={<PrivateRoute roles={['admin']}><AdminDash /></PrivateRoute>} />
                <Route path="/admin/utilisateurs"  element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
                <Route path="/admin/produits"      element={<PrivateRoute roles={['admin']}><AdminProducts /></PrivateRoute>} />
                <Route path="/admin/litiges"       element={<PrivateRoute roles={['admin']}><AdminDisputes /></PrivateRoute>} />
                <Route path="/admin/entrepot/:id"   element={<PrivateRoute roles={['admin']}><WarehouseDetail /></PrivateRoute>} />

                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop pauseOnHover theme="light" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
