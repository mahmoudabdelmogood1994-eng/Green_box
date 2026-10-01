'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Part } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ShoppingCart, Truck } from 'lucide-react';
import OrderStatusDialog from './order-status-dialog';

type PartCardProps = {
  part: Part;
};

export default function PartCard({ part }: PartCardProps) {
  const placeholder = PlaceHolderImages.find((p) => p.id === part.imageId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/10">
        <CardHeader className="p-0">
          <div className="aspect-video relative">
            {placeholder && (
              <Image
                src={placeholder.imageUrl}
                alt={part.name}
                fill
                className="object-cover"
                data-ai-hint={placeholder.imageHint}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg mb-1">{part.name}</CardTitle>
          <div className="flex items-center gap-2 mb-2">
              <Badge variant={part.stock > 0 ? 'secondary' : 'destructive'}>
                  {part.stock > 0 ? `${part.stock} in stock` : 'Out of stock'}
              </Badge>
          </div>
          <CardDescription className="text-sm">{part.description}</CardDescription>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-col items-start gap-3">
          <p className="text-2xl font-bold">
              ${part.price.toFixed(2)}
          </p>
          <div className="w-full flex flex-col sm:flex-row gap-2">
            <Button className="w-full" disabled={part.stock === 0} onClick={() => setIsDialogOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Buy Now
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/suppliers/${encodeURIComponent(part.name)}`}>
                <Truck className="mr-2 h-4 w-4" />
                Find Supplier
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
      <OrderStatusDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        partName={part.name}
      />
    </>
  );
}