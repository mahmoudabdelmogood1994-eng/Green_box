'use client';

import { useState, useMemo } from 'react';
import type { Part } from '@/lib/types';
import { Input } from '@/components/ui/input';
import PartCard from './part-card';
import { Search } from 'lucide-react';

type PartListProps = {
  initialParts: Part[];
};

export default function PartList({ initialParts }: PartListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParts = useMemo(() => {
    if (!searchTerm) return initialParts;
    return initialParts.filter(
      (part) =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, initialParts]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for parts..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredParts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredParts.map((part) => (
            <PartCard key={part.id} part={part} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No parts found</p>
            <p>Try adjusting your search term.</p>
        </div>
      )}
    </div>
  );
}
