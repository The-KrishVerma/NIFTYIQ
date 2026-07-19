import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const PeerComparison = lazy(() => import('./pages/PeerComparison'));
const IndustryDashboard = lazy(() => import('./pages/IndustryDashboard'));
const IndustryOverview = lazy(() => import('./pages/IndustryOverview'));
const IndexDashboard = lazy(() => import('./pages/IndexDashboard'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const CompareDashboard = lazy(() => import('./pages/CompareDashboard'));

function App() {
  return (
    <Router>
      <div className="min-h-screen w-full bg-insight-black text-insight-text selection:bg-insight-blue/30 selection:text-white pb-20">
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-insight-blue border-t-transparent animate-spin" /></div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/company/:symbol" element={<CompanyDashboard />} />
            <Route path="/company/:symbol/peers" element={<PeerComparison />} />
            <Route path="/industry/:industry" element={<IndustryDashboard />} />
            <Route path="/industries" element={<IndustryOverview />} />
            <Route path="/index" element={<IndexDashboard />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/compare" element={<CompareDashboard />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
