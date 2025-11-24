import { createContext, useContext, useState, ReactNode } from "react";

interface SimulationState {
  selectedModule: string | null;
  animationSpeed: number;
  activeSatellites: string[];
  orbitData: any;
  collisionThreshold: number;
  isRunning: boolean;
}

interface SimulationContextType {
  state: SimulationState;
  setSelectedModule: (module: string | null) => void;
  setAnimationSpeed: (speed: number) => void;
  setActiveSatellites: (satellites: string[]) => void;
  setOrbitData: (data: any) => void;
  setCollisionThreshold: (threshold: number) => void;
  setIsRunning: (running: boolean) => void;
  resetState: () => void;
}

const initialState: SimulationState = {
  selectedModule: null,
  animationSpeed: 1,
  activeSatellites: [],
  orbitData: null,
  collisionThreshold: 10,
  isRunning: false,
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SimulationState>(initialState);

  const setSelectedModule = (module: string | null) => {
    setState(prev => ({ ...prev, selectedModule: module }));
  };

  const setAnimationSpeed = (speed: number) => {
    setState(prev => ({ ...prev, animationSpeed: speed }));
  };

  const setActiveSatellites = (satellites: string[]) => {
    setState(prev => ({ ...prev, activeSatellites: satellites }));
  };

  const setOrbitData = (data: any) => {
    setState(prev => ({ ...prev, orbitData: data }));
  };

  const setCollisionThreshold = (threshold: number) => {
    setState(prev => ({ ...prev, collisionThreshold: threshold }));
  };

  const setIsRunning = (running: boolean) => {
    setState(prev => ({ ...prev, isRunning: running }));
  };

  const resetState = () => {
    setState(initialState);
  };

  return (
    <SimulationContext.Provider
      value={{
        state,
        setSelectedModule,
        setAnimationSpeed,
        setActiveSatellites,
        setOrbitData,
        setCollisionThreshold,
        setIsRunning,
        resetState,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
};


