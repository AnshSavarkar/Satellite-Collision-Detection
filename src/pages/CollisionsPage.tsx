import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SpaceNavbar from "@/components/SpaceNavbar";
import SatelliteCollisions from "@/modules/SatelliteCollisions";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Suspense } from "react";

const CollisionsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative">
      <SpaceNavbar />
      <div className="pt-20 min-h-[calc(100vh-5rem)]">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 sm:mb-6"
          >
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-green-500/30 hover:bg-green-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </motion.div>
          
          <Suspense fallback={<LoadingSpinner message="Loading Satellite Collisions..." accentColor="lime" />}>
            <div className="h-[calc(100vh-12rem)]">
              <SatelliteCollisions />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default CollisionsPage;

