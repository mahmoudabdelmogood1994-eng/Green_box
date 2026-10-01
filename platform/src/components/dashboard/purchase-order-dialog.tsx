
'use client';

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase/provider';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type PurchaseOrderDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partName: string;
  price: number;
};

export default function PurchaseOrderDialog({ isOpen, onOpenChange, partName, price }: PurchaseOrderDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const totalPrice = price * quantity;
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5); // 5 days from now

  // Real persistence: writes an order document to Firestore via the
  // existing non-blocking-updates helper. Requires an authenticated
  // session (anonymous auth is wired up automatically in
  // FirebaseClientProvider), and requires firestore.rules to allow
  // `create` for the caller's own uid -- see the rules revision that
  // shipped alongside this change. Previously this handler only showed
  // a toast and never wrote anything, which meant "confirmed" orders
  // did not exist anywhere.
  const handleConfirm = async () => {
    if (!user) {
      toast({
        title: 'Not signed in yet',
        description: 'Still setting up your session -- try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    setIsConfirming(true);
    try {
      await addDocumentNonBlocking(collection(firestore, 'orders'), {
        uid: user.uid,
        partName,
        quantity,
        unitPrice: price,
        totalPrice,
        estimatedDelivery: estimatedDelivery.toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      toast({
        title: 'Purchase Order Confirmed',
        description: `${quantity}x ${partName} has been ordered.`,
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      toast({
        title: 'Order failed to save',
        description: 'The order could not be written to the database. Check Firestore rules/auth.',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Confirm the details below to order the required part.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="part-name" className="text-right">
              Part
            </Label>
            <Input id="part-name" value={partName} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Total Price</Label>
            <div className="col-span-3 font-bold text-lg">${totalPrice.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Delivery</Label>
            <div className="col-span-3 flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Est. {format(estimatedDelivery, 'PPP')}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
