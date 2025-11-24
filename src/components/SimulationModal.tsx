import { useState, useEffect, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ArrowLeft } from "lucide-react";
import OrbitalMechanics from "./simulations/OrbitalMechanics";
import SatelliteTracking from "./simulations/SatelliteTracking";
import SatelliteCollisions from "./simulations/SatelliteCollisions";

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  simType: string | null;
}

const SimulationModal = ({ isOpen, onClose, simType }: SimulationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [simulationContent, setSimulationContent] = useState<{url: string, type: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && simType) {
      runSimulation(simType);
    }
  }, [isOpen, simType]);

  const runSimulation = async (type: string) => {
    setIsLoading(true);
    setError(null);
    setSimulationContent(null);

    try {
      const response = await fetch('/run-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sim_type: type })
      });

      // Check if response has content before parsing
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        // Backend not available, use interactive 3D simulation
        console.log('Backend not available, using interactive simulation');
        setIsLoading(false);
        return;
      }

      const data = JSON.parse(text);
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Server error');
      }

      setSimulationContent({
        url: data.file,
        type: type
      });
    } catch (err) {
      // If backend is not available, silently fall back to interactive simulation
      console.log('Using interactive simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (simulationContent) {
      window.open(simulationContent.url, '_blank');
    }
  };

  const getSimulationTitle = () => {
    switch (simType) {
      case 'orbital':
        return '🛰️ Orbital Mechanics Simulator';
      case 'tracking':
        return '🪐 Real Satellite Tracking';
      case 'collision':
        return '☄️ Satellite Collision Analysis';
      default:
        return 'Live Simulation';
    }
  };

  const renderSimulation = () => {
    if (!simType) return null;

    // Check if backend simulation content exists
    if (simulationContent && !isLoading) {
      const ext = simulationContent.url.split('.').pop()?.toLowerCase();
      if (ext === 'html') {
        return (
          <iframe 
            src={simulationContent.url} 
            className="w-full h-full border-0 rounded-xl"
            title="Simulation Result"
          />
        );
      } else if (ext === 'mp4') {
        return (
          <video 
            controls 
            autoPlay 
            className="w-full h-full rounded-xl object-contain"
          >
            <source src={simulationContent.url} type="video/mp4" />
            Your browser does not support video.
          </video>
        );
      } else {
        return (
          <img 
            src={simulationContent.url} 
            alt="Simulation Result" 
            className="w-full h-full object-contain rounded-xl"
          />
        );
      }
    }

    // Render interactive 3D simulations
    switch (simType) {
      case 'orbital':
        return <OrbitalMechanics />;
      case 'tracking':
        return <SatelliteTracking />;
      case 'collision':
        return <SatelliteCollisions />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-neon-cyan/30 max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-neon-cyan/20 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground font-poppins">
              {getSimulationTitle()}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {simulationContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-neon-green text-accent hover:bg-accent/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Data
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-neon-purple hover:bg-secondary/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="h-full flex items-center justify-center bg-space-dark/90 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-lg text-foreground">Running simulation...</p>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="text-red-400 text-lg">⚠️ Error</div>
                <p className="text-muted-foreground">{error}</p>
                <Button 
                  onClick={() => simType && runSimulation(simType)}
                  className="bg-primary text-primary-foreground glow-cyan"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
          
          {!isLoading && !error && (
            <Suspense fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              {renderSimulation()}
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimulationModal;