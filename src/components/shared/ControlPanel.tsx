import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ControlPanelProps {
  title: string;
  children: ReactNode;
  accentColor?: "cyan" | "purple" | "lime";
  className?: string;
}

const ControlPanel = ({ 
  title, 
  children, 
  accentColor = "cyan",
  className = "" 
}: ControlPanelProps) => {
  const accentClasses = {
    cyan: "border-neon-cyan/30 glow-cyan",
    purple: "border-neon-purple/30 glow-purple",
    lime: "border-green-500/30 glow-green"
  };

  return (
    <Card className={`glass-panel ${accentClasses[accentColor]} p-6 space-y-6 ${className}`}>
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
};

export default ControlPanel;


