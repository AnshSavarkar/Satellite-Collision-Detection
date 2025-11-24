import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Download } from "lucide-react";

interface ActionButtonsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  onDownload?: () => void;
  playLabel?: string;
  pauseLabel?: string;
  resetLabel?: string;
  downloadLabel?: string;
  variant?: "cyan" | "purple" | "lime";
  className?: string;
}

const ActionButtons = ({
  isRunning,
  onPlayPause,
  onReset,
  onDownload,
  playLabel = "Start",
  pauseLabel = "Pause",
  resetLabel = "Reset",
  downloadLabel = "Download",
  variant = "cyan",
  className = ""
}: ActionButtonsProps) => {
  const variantClasses = {
    cyan: "bg-primary glow-cyan",
    purple: "bg-secondary glow-purple",
    lime: "bg-green-500 hover:bg-green-600 glow-green"
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={onPlayPause}
        className={`flex-1 ${variantClasses[variant]}`}
      >
        {isRunning ? (
          <>
            <Pause className="w-4 h-4 mr-2" />
            {pauseLabel}
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            {playLabel}
          </>
        )}
      </Button>
      <Button
        onClick={onReset}
        variant="outline"
        className="border-neon-purple"
        aria-label={resetLabel}
        title={resetLabel}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
      {onDownload && (
        <Button
          onClick={onDownload}
          variant="outline"
          className="border-neon-green"
          aria-label={downloadLabel}
          title={downloadLabel}
        >
          <Download className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default ActionButtons;


