
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Rocket, Warehouse, Factory, Clock } from 'lucide-react';
import { add, format } from 'date-fns';
import Image from 'next/image';

type OrderStatusDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partName: string;
};

export default function OrderStatusDialog({ isOpen, onOpenChange, partName }: OrderStatusDialogProps) {
  const [progress, setProgress] = useState(10);
  
  const estimatedArrivalTime = add(new Date(), { minutes: 15 });

  useEffect(() => {
    if (!isOpen) {
      setProgress(10);
      return;
    }
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 5;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const getStatusText = () => {
    if (progress < 30) return 'Order confirmed, preparing for dispatch.';
    if (progress < 90) return 'In transit to your location.';
    return 'Arrived at destination facility.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Order Status: {partName}</DialogTitle>
          <DialogDescription>{getStatusText()}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border">
              <Image 
                src="https://images.unsplash.com/photo-1594186588161-9c8938959958?q=80&w=1080&auto=format&fit=crop" 
                alt="Map showing delivery route"
                fill
                className="object-cover"
                data-ai-hint="satellite map"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <p className="font-bold text-lg">Live Tracking</p>
                <p className="text-sm">Delivery via Autonomous Drone</p>
              </div>
          </div>
          <div className="space-y-4">
            <Progress value={progress} />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    <span>Warehouse</span>
                </div>
                <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary animate-pulse" />
                    <span>In Transit</span>
                </div>
                <div className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-primary" />
                    <span>Factory</span>
                </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
             <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary"/>
                <div>
                    <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                    <p className="font-semibold text-lg">{format(estimatedArrivalTime, 'p')}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <Rocket className="h-6 w-6 text-primary"/>
                <div>
                    <p className="text-sm text-muted-foreground">Delivery Method</p>
                    <p className="font-semibold text-lg">Drone</p>
                </div>
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
