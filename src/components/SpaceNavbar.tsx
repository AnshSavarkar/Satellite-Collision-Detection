import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SpaceNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'glass-panel glow-soft' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <svg 
                width="36" 
                height="36" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="text-primary animate-pulse-glow"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 16C9 13 15 11 18 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="12" cy="8" r="1" fill="currentColor" className="animate-twinkle"/>
                <circle cx="18" cy="8" r="0.5" fill="currentColor" className="animate-twinkle" style={{animationDelay: '1s'}}/>
              </svg>
            </div>
            <span className="text-xl font-bold font-poppins text-foreground">
              Satellite Orbital Dynamics Simulator
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8">
            {/* Removed left-of-Home Run Simulations button */}
            <button 
              onClick={() => navigate('/dashboard')}
              className={`transition-colors duration-300 ${
                location.pathname === '/dashboard' 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('simulations')}
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              Modules
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              Contact
            </button>
            
            <Button 
              onClick={() => navigate('/earth')}
              className="bg-aurora border-neon-cyan glow-cyan font-semibold px-6 py-2 rounded-xl hover:scale-105 transition-all duration-300"
            >
              Earth
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default SpaceNavbar;