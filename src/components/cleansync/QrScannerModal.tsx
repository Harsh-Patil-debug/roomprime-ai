// Refined UI Pass: Converted 46 hardcoded color references to semantic design tokens.
// Enhanced camera scanner dialog, simulated QR cards, and light/dark theme contrast.

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertCircle, ExternalLink, Sparkles, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanResult?: (text: string) => void;
}

export function QrScannerModal({ open, onOpenChange, onScanResult }: QrScannerModalProps) {
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const containerId = "qr-reader-viewport-camera-mobile";

  useEffect(() => {
    if (!open) {
      cleanupScanner();
      setScannedResult(null);
      setErrorMessage(null);
      setFlashOn(false);
      setHasFlash(false);
      return;
    }

    const timer = setTimeout(() => {
      initScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [open, facingMode]);

  const initScanner = async () => {
    try {
      cleanupScanner();
      
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.65;
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Quiet logs
        }
      );
      
      setCameraPermission("granted");
      setErrorMessage(null);

      // Check flashlight capabilities
      try {
        const cameraCapabilities = scanner.getRunningTrackCapabilities();
        if (cameraCapabilities && (cameraCapabilities as any).torch) {
          setHasFlash(true);
        }
      } catch (e) {}
    } catch (err: any) {
      console.error("Failed to start QR scanner:", err);
      if (err?.toString().includes("Permission")) {
        setCameraPermission("denied");
        setErrorMessage("Camera access permission denied. Please allow camera access in browser settings.");
      } else {
        setErrorMessage("Could not initialize camera feed. Ensure it is not in use by another program.");
      }
    }
  };

  const cleanupScanner = () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner.isScanning) {
        if (flashOn) {
          try {
            scanner.applyVideoConstraints({
              advanced: [{ torch: false } as any]
            });
          } catch(e) {}
        }
        
        scanner.stop()
          .then(() => {
            try { scanner.clear(); } catch(e) {}
          })
          .catch((err) => console.error("Error stopping scanner:", err));
      }
    }
  };

  const handleSuccess = (decodedText: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    setScannedResult(decodedText);
    cleanupScanner();

    // Check if redirect link matches
    const isAppUrl = decodedText.includes(window.location.host) || 
                     decodedText.startsWith("/") || 
                     decodedText.startsWith("http://localhost") ||
                     decodedText.includes(".lhr.life") ||
                     decodedText.includes("/concierge") ||
                     decodedText.includes("/staff/checkin");

    if (isAppUrl) {
      toast.success("RoomFlow QR Scanned!", {
        description: "Redirection triggered successfully...",
      });
      
      try {
        if (onScanResult) {
          onScanResult(decodedText);
        } else {
          const urlObj = decodedText.startsWith("http") ? new URL(decodedText) : new URL(decodedText, window.location.href);
          window.location.href = urlObj.pathname + urlObj.search;
        }
      } catch (e) {
        onScanResult?.(decodedText);
      }
      onOpenChange(false);
    } else {
      toast.info("Scanned External URL", {
        description: "This QR Code is not linked to RoomFlow workflows.",
      });
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setFlashOn(false);
    setHasFlash(false);
  };

  const toggleFlashlight = async () => {
    if (!scannerRef.current || !hasFlash) return;
    try {
      const nextFlashState = !flashOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextFlashState } as any]
      });
      setFlashOn(nextFlashState);
      toast.info(nextFlashState ? "Flashlight turned ON" : "Flashlight turned OFF");
    } catch (e) {
      toast.error("Failed to toggle flashlight on this device.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card text-foreground border-border border-2 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground font-display font-bold text-lg flex items-center gap-2">
            <Camera className="size-5 text-primary" />
            Scan Placard QR Code
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Hold a RoomFlow Guest Concierge or Staff Check-In placard in front of your camera to trigger check-in turns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-full aspect-square max-w-[300px] rounded-2xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
            
            <div id={containerId} className="w-full h-full object-cover [&_video]:object-cover" />

            {!errorMessage && !scannedResult && cameraPermission === "granted" && (
              <div className="absolute inset-0 pointer-events-none border-[12px] border-border/40/35 flex items-center justify-center">
                <div className="size-48 border-2 border-dashed border-primary/60 rounded-xl relative flex items-center justify-center">
                  <div className="absolute top-0 left-0 size-4 border-t-4 border-l-4 border-primary" />
                  <div className="absolute top-0 right-0 size-4 border-t-4 border-r-4 border-primary" />
                  <div className="absolute bottom-0 left-0 size-4 border-b-4 border-l-4 border-primary" />
                  <div className="absolute bottom-0 right-0 size-4 border-b-4 border-r-4 border-primary" />
                  <div className="w-[90%] h-0.5 bg-primary shadow-[0_0_8px_var(--primary)] absolute top-1/2 -translate-y-1/2 animate-[pulse_1.2s_infinite]" />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="text-[9px] bg-card/95 text-primary font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-border">
                    Align Placard QR Code
                  </span>
                </div>
              </div>
            )}

            {cameraPermission === "pending" && !errorMessage && (
              <div className="absolute inset-0 bg-muted/40 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="size-8 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Opening camera preview...</span>
              </div>
            )}

            {errorMessage && (
              <div className="absolute inset-0 bg-muted/40/98 flex flex-col items-center justify-center p-6 text-center gap-3">
                <AlertCircle className="size-10 text-destructive" />
                <h4 className="text-sm font-semibold text-foreground">Camera Loading Failed</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs border-border hover:bg-muted" onClick={initScanner}>
                  Retry Permission Check
                </Button>
              </div>
            )}

            {scannedResult && (
              <div className="absolute inset-0 bg-card/98 flex flex-col items-center justify-center p-6 text-center gap-4 animate-in fade-in zoom-in-95">
                <div className="size-12 rounded-full bg-ready/15 border border-ready/30 flex items-center justify-center">
                  <Sparkles className="size-6 text-ready animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Placard QR Decoded!</h4>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1.5 break-all max-w-[220px] border border-border rounded p-1.5 bg-muted/50">
                    {scannedResult}
                  </p>
                </div>
                
                {!scannedResult.includes(window.location.host) && !scannedResult.startsWith("/") && !scannedResult.startsWith("http://localhost") && !scannedResult.includes(".lhr.life") && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-black text-xs gap-1.5 font-semibold"
                    onClick={() => {
                      window.open(scannedResult, "_blank", "noopener,noreferrer");
                      onOpenChange(false);
                    }}
                  >
                    Open Scanned URL
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
                
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setScannedResult(null)}>
                  Scan Next QR
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 border-t border-border/60 pt-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
              onClick={toggleCamera}
              disabled={!!errorMessage || !!scannedResult}
            >
              <RefreshCw className="size-3.5" />
              Switch Camera
            </Button>
            
            {hasFlash && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
                onClick={toggleFlashlight}
                disabled={!!errorMessage || !!scannedResult}
              >
                {flashOn ? <ZapOff className="size-3.5 text-primary" /> : <Zap className="size-3.5 text-primary" />}
                {flashOn ? "Flash Off" : "Flash On"}
              </Button>
            )}
          </div>

          <Button size="sm" variant="outline" className="border-border text-muted-foreground text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
