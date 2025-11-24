import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SpaceNavbar from "@/components/SpaceNavbar";
import SpaceHero from "@/components/SpaceHero";
import SimulationCard from "@/components/SimulationCard";
import { useEffect, useState } from "react";
type SatRec = { name: string; tle1: string; tle2: string };
import { Card, CardContent } from "@/components/ui/card";
import orbitalSimulation from "@/assets/orbital-simulation.jpg";
import collisionSimulation from "@/assets/collision-simulation.jpg";
import satelliteTracking from "@/assets/satellite-tracking.jpg";

const Index = () => {
  const navigate = useNavigate();

  // Collision Risk Simulator state and helpers (top-level hooks)
  const [sat1, setSat1] = useState("");
  const [sat2, setSat2] = useState("");
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [satList, setSatList] = useState<SatRec[]>([]);
  const [satListLoading, setSatListLoading] = useState<boolean>(true);
  const [satListError, setSatListError] = useState<string | null>(null);

  // Load satellite list (LEO) for dropdowns
  useEffect(() => {
    let mounted = true;
    (async () => {
      setSatListLoading(true);
      setSatListError(null);
      try {
        // Use full ACTIVE catalog instead of only LEO filter so user can see Starlink satellites even if classification heuristic mislabels.
        // If performance becomes an issue, add a client-side search filter or reintroduce orbit parameter.
        const res = await fetch(`/api/tle/live?group=ACTIVE&format=tle&json=true`);
        if (!res.ok) throw new Error(`Failed to load satellites: ${res.status}`);
        const data = await res.json();
        const recs: SatRec[] = (data?.satellites || [])
          .map((s: any) => ({ name: s?.name, tle1: s?.tle1, tle2: s?.tle2 }))
          .filter((r: SatRec) => r.name && r.tle1 && r.tle2);
        recs.sort((a, b) => a.name.localeCompare(b.name));
        if (mounted) setSatList(recs);
      } catch (e: any) {
        if (mounted) setSatListError(e?.message || 'Failed to load satellites.');
      } finally {
        if (mounted) setSatListLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  async function runCollisionRisk() {
    setRiskError(null);
    setRiskResult(null);
    if (!sat1.trim() || !sat2.trim()) {
      setRiskError("Please select two satellites.");
      return;
    }
    setLoadingRisk(true);
    try {
      const r1 = satList.find((r) => r.name === sat1);
      const r2 = satList.find((r) => r.name === sat2);
      const res = await fetch(`/api/collision-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sat1: sat1.trim(),
          sat2: sat2.trim(),
          ...(r1 && r2 ? {
            tle1_line1: r1.tle1,
            tle1_line2: r1.tle2,
            tle2_line1: r2.tle1,
            tle2_line2: r2.tle2,
          } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = await res.json();
      setRiskResult(data);
    } catch (err: any) {
      setRiskError(err?.message || "Failed to compute collision risk.");
    } finally {
      setLoadingRisk(false);
    }
  }

  const handleRunSimulation = (simType: string) => {
    switch (simType) {
      case 'orbit':
        navigate('/orbital-mechanics');
        break;
      case 'tracking':
        navigate('/real-tracking');
        break;
      case 'collisions':
        navigate('/collisions');
        break;
      default:
        break;
    }
  };

  const handleDownloadSimulation = (simType: string) => {
    console.log(`Downloading ${simType} simulation data...`);
  };

  const simulations = [
    {
      id: "orbit",
      title: "Orbital Mechanics",
      description: "Simulate circular and elliptical orbits with adjustable altitude and velocity parameters.",
      image: orbitalSimulation
    },
    {
      id: "tracking",
      title: "Real Satellite Tracking",
      description: "Visualizes the orbits of multiple real satellites in 3D using their TLE data.",
      image: satelliteTracking
    },
    {
      id: "collisions",
      title: "Satellite Collisions",
      description: "Explore collision scenarios and debris field generation in space environments.",
      image: collisionSimulation
    }
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <SpaceNavbar />
      
      {/* Hero Section */}
      <SpaceHero />
      
      {/* Quick Intro */}
      <section id="intro" className="py-16 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="glass-panel border-neon-cyan/20 glow-soft">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4 font-poppins">
                  Fast, accurate & interactive
                </h3>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Each simulation is optimized for the web and includes export options. 
                  Click "Run" to navigate to the full-screen simulation interface.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
      
      

      

      
      {/* Simulations Grid */}
      <section id="simulations" className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-foreground mb-4 font-poppins">
              Space Simulations
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore different aspects of space physics through interactive simulations
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 gap-10">
            {simulations.map((sim, index) => (
              <motion.div
                key={sim.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full md:w-[75vw] max-w-5xl mx-auto md:mx-0 ${
                  index % 2 === 1
                    ? 'md:ml-auto md:mr-0' // right align
                    : 'md:ml-0 md:mr-auto' // left align
                }`}
              >
                <SimulationCard
                  id={sim.id}
                  title={sim.title}
                  description={sim.description}
                  image={sim.image}
                  reverse={index === 1}
                  enablePreview={sim.id !== 'orbit'}
                  onRun={handleRunSimulation}
                  onDownload={handleDownloadSimulation}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collision Avoidance Maneuver (moved below simulations, above About) */}
      <div className="w-full flex justify-center mt-4">
        <div className="w-[75vw] bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Collision Avoidance Manuver</h2>
          <p className="text-sm text-white/70 mb-4">
            Select two satellites from the list. The system uses their live TLEs to compute relative distance, speed, and risk.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={sat1}
              onChange={(e) => setSat1(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-md p-3 outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={satListLoading || !!satListError}
            >
              <option value="">{satListLoading ? 'Loading satellites…' : 'Select Satellite 1'}</option>
              {satList.map((rec) => (
                <option key={`s1-${rec.name}`} value={rec.name}>{rec.name}</option>
              ))}
            </select>
            <select
              value={sat2}
              onChange={(e) => setSat2(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-md p-3 outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={satListLoading || !!satListError}
            >
              <option value="">{satListLoading ? 'Loading satellites…' : 'Select Satellite 2'}</option>
              {satList.map((rec) => (
                <option key={`s2-${rec.name}`} value={rec.name}>{rec.name}</option>
              ))}
            </select>
          </div>
          {satListError && (
            <div className="text-red-400 text-sm mb-3">{satListError}</div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={runCollisionRisk}
              disabled={loadingRisk || satListLoading || !sat1 || !sat2}
              className="px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold"
            >
              {loadingRisk ? "Computing..." : "Run"}
            </button>
            {riskError && (
              <span className="text-red-400 text-sm">{riskError}</span>
            )}
          </div>
          {riskResult && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                <h3 className="font-medium mb-2">Instantaneous Encounter</h3>
                <div className="text-sm text-white/80 space-y-1">
                  <div>
                    <span className="text-white/60">Distance:</span>{" "}
                    {Number(riskResult?.result?.distance_km ?? riskResult?.distance_km)?.toFixed(3)} km
                  </div>
                  <div>
                    <span className="text-white/60">Relative Speed:</span>{" "}
                    {Number(riskResult?.result?.relative_speed_km_s ?? riskResult?.relative_speed_km_s)?.toFixed(4)} km/s
                  </div>
                  <div>
                    <span className="text-white/60">Risk:</span>{" "}
                    {((riskResult?.result?.collision_risk ?? riskResult?.collision_risk) * 100).toFixed(4)}%
                  </div>
                  {riskResult?.source && (
                    <div className="text-white/50 text-xs mt-2">Source: {riskResult.source}</div>
                  )}
                </div>
              </div>
              <div className="bg-black/30 border border-white/10 rounded-lg p-4">
                <h3 className="font-medium mb-2">Post-Maneuver (Hypothetical)</h3>
                <div className="text-sm text-white/80 space-y-1">
                  <div>
                    <span className="text-white/60">Distance:</span>{" "}
                    {Number(riskResult?.result?.post_maneuver_distance_km ?? riskResult?.post_maneuver_distance_km)?.toFixed(3)} km
                  </div>
                  <div>
                    <span className="text-white/60">Risk:</span>{" "}
                    {(((riskResult?.result?.post_maneuver_risk ?? riskResult?.post_maneuver_risk) ?? 0) * 100).toFixed(4)}%
                  </div>
                  <div>
                    <span className="text-white/60">Maneuver Helped:</span>{" "}
                    {String(riskResult?.result?.maneuver_helped ?? riskResult?.maneuver_helped)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* About Section */}
      <section id="about" className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="animate-fade-in-up">
              <h3 className="text-3xl font-bold text-foreground mb-6 font-poppins">
                About this project
              </h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Built as an interactive set of experiments for learning classical mechanics and visualization techniques.
                </p>
                <p>
                  Space is vast and expansive, but Earth's orbit is becoming increasingly crowded with satellites, 
                  space debris, and active spacecraft. Collisions in space aren't just theoretical problems—they've 
                  already happened, creating thousands of debris pieces that threaten future space missions.
                </p>
                <p>
                  One of the most well-known satellite-on-satellite collisions occurred on February 10, 2009, 
                  when an Iridium-33 communications satellite and the inactive Russian Cosmos-2251 satellite 
                  collided over Siberia, generating a massive cloud of debris.
                </p>
              </div>
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Card className="glass-panel border-neon-purple/20 glow-soft">
                <CardContent className="p-8">
                  <h4 className="text-xl font-semibold text-foreground mb-4 font-poppins">
                    Mission Critical
                  </h4>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    With thousands of satellites already in orbit and more launching every year, 
                    space agencies must actively monitor and predict potential collisions. Scientists use 
                    orbital mechanics, real-time tracking, and collision-avoidance algorithms to keep satellites safe.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 rounded-lg bg-space-medium/50">
                      <div className="text-2xl font-bold text-primary">34,000+</div>
                      <div className="text-muted-foreground">Objects Tracked</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-space-medium/50">
                      <div className="text-2xl font-bold text-secondary">5,000+</div>
                      <div className="text-muted-foreground">Active Satellites</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact Section (below About) */}
      <section id="contact" className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="glass-panel border-neon-cyan/20 glow-soft">
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="text-3xl font-bold text-foreground font-poppins">Contact</h3>
                <p className="text-lg text-muted-foreground">Have questions or feedback?</p>
                <div className="text-xl">
                  <span className="font-semibold">Email: </span>
                  <a
                    href="mailto:anshsavarkar@gmail.com"
                    className="text-primary hover:underline"
                  >
                    anshsavarkar@gmail.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-neon-cyan/20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} Satellite Orbital Dynamics Simulator
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
