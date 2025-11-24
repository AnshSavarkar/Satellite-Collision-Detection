import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SimulationProvider } from "@/context/SimulationProvider";
import { AuthProvider } from "@/context/AuthContext";
import { AnimatePresence } from "framer-motion";

import Index from "./pages/Index";
import OrbitalMechanicsPage from "./pages/OrbitalMechanicsPage";
import RealTrackingPage from "./pages/RealTrackingPage";
import CollisionsPage from "./pages/CollisionsPage";
import NotFound from "./pages/NotFound";
import EarthPage from "@/components/EarthPage";
import LoginPage from "@/components/LoginPage";
import PageTransition from "@/components/PageTransition";
import StarfieldTransition from "@/components/StarfieldTransition";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  const showStarfield = location.pathname === "/dashboard";

  return (
    <>
      {showStarfield && <StarfieldTransition key="starfield-transition" />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Default route: show Earth page */}
          <Route path="/" element={<EarthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/earth" element={<EarthPage />} />
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <Index />
              </PageTransition>
            }
          />
          <Route path="/orbital-mechanics" element={<OrbitalMechanicsPage />} />
          <Route path="/real-tracking" element={<RealTrackingPage />} />
          <Route path="/collisions" element={<CollisionsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SimulationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </SimulationProvider>
    </QueryClientProvider>
  );
};

export default App;
