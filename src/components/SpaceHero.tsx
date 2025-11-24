import { Button } from "@/components/ui/button";
import spaceBackground from "@/assets/space-background.jpg";

const SpaceHero = () => {
  const scrollToSimulations = () => {
    document.getElementById('simulations')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dynamic space background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${spaceBackground})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-5xl lg:text-7xl font-bold font-poppins text-foreground leading-tight">
              Explore the physics of{" "}
               <span className="text-aurora">
                 space
               </span>{" "}
              — interactively.
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Run fast, browser-based simulations to visualize orbits, collisions, and particle fields. 
              No installs — just science.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={scrollToSimulations}
                className="bg-primary text-primary-foreground glow-cyan hover:glow-cyan px-8 py-4 text-lg font-semibold rounded-xl hover:scale-105 transition-all duration-300"
              >
                Run First Simulation
              </Button>
              <Button 
                variant="outline"
                onClick={scrollToAbout}
                className="border-neon-purple text-secondary hover:bg-secondary/10 px-8 py-4 text-lg font-semibold rounded-xl hover:scale-105 transition-all duration-300"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Interactive Preview */}
          <div className="relative animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="glass-panel glow-soft rounded-3xl p-8 relative overflow-hidden">
              {/* Orbital animation */}
              <div className="relative h-80 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-space-dark to-space-medium">
                  {/* Central body (Earth) */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-green-400 glow-cyan animate-pulse-glow" />
                  
                  {/* Satellite orbit 1 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-32 h-32 border border-primary/30 rounded-full">
                      <div className="absolute w-3 h-3 bg-primary rounded-full glow-cyan animate-orbit" />
                    </div>
                  </div>

                  {/* Satellite orbit 2 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-48 h-48 border border-secondary/30 rounded-full">
                      <div className="absolute w-2 h-2 bg-secondary rounded-full glow-purple animate-orbit-reverse" />
                    </div>
                  </div>

                  {/* Particle effects */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary rounded-full animate-twinkle opacity-50" style={{animationDelay: '1s'}} />
                    <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-secondary rounded-full animate-twinkle opacity-60" style={{animationDelay: '2s'}} />
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 text-xs text-muted-foreground font-mono">
                  Live Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpaceHero;