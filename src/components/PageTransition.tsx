import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ 
        opacity: 0,
        scale: 0.92,
        filter: "blur(20px)"
      }}
      animate={{ 
        opacity: 1,
        scale: 1,
        filter: "blur(0px)"
      }}
      exit={{ 
        opacity: 0,
        scale: 1.05,
        filter: "blur(10px)"
      }}
      transition={{
        duration: 1.2,
        delay: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      style={{
        width: "100%",
        minHeight: "100vh"
      }}
    >
      {children}
    </motion.div>
  );
}
