import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Parameter {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

interface ParameterDisplayProps {
  title: string;
  parameters: Parameter[];
  accentColor?: "cyan" | "purple" | "lime";
  className?: string;
}

const ParameterDisplay = ({ 
  title, 
  parameters, 
  accentColor = "lime",
  className = "" 
}: ParameterDisplayProps) => {
  const accentClasses = {
    cyan: "border-neon-cyan/30",
    purple: "border-neon-purple/30",
    lime: "border-green-500/30"
  };

  return (
    <Card className={`glass-panel ${accentClasses[accentColor]} p-6 space-y-4 ${className}`}>
      <CardHeader className="p-0">
        <CardTitle className="text-lg font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2 text-sm">
          {parameters.map((param, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-muted-foreground">{param.label}:</span>
              <span 
                className={`font-mono ${
                  param.highlight 
                    ? "text-primary font-bold" 
                    : "text-foreground"
                }`}
              >
                {param.value} {param.unit || ""}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParameterDisplay;


