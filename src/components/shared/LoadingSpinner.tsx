import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  accentColor?: "cyan" | "purple" | "lime";
}

const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "md",
  accentColor = "cyan"
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8 border-2",
    md: "w-16 h-16 border-4",
    lg: "w-24 h-24 border-4"
  };

  const colorClasses = {
    cyan: "border-primary border-t-transparent",
    purple: "border-secondary border-t-transparent",
    lime: "border-green-500 border-t-transparent"
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <motion.div
        className={`${sizeClasses[size]} ${colorClasses[accentColor]} rounded-full animate-spin`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {message && (
        <motion.p
          className="text-lg text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.p>
      )}
      <div className="flex items-center justify-center gap-1">
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-secondary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
        />
        <motion.div
          className="w-2 h-2 bg-accent rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;


