import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onBack?: () => void;
  footer?: ReactNode;
  className?: string;
}

const ModalLayout = ({
  isOpen,
  onClose,
  title,
  children,
  onBack,
  footer,
  className = ""
}: ModalLayoutProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`glass-panel border-neon-cyan/30 max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden ${className}`}>
        <DialogHeader className="p-6 border-b border-neon-cyan/20 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground font-poppins">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onBack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="border-neon-purple hover:bg-secondary/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
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
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-auto"
        >
          {children}
        </motion.div>

        {footer && (
          <div className="p-4 border-t border-neon-cyan/20">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModalLayout;


