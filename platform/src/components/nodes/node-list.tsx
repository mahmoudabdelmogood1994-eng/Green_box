'use client';

import { useState, useMemo } from 'react';
import type { GreenBoxNode } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Search, MapPin, CheckCircle, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NodeListProps = {
  initialNodes: GreenBoxNode[];
};

export default function NodeList({ initialNodes }: NodeListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return initialNodes;
    return initialNodes.filter(
      (node) =>
        node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, initialNodes]);

  const activeNodes = useMemo(() => filteredNodes.filter(n => n.status === 'Active').length, [filteredNodes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by ID or location..."
            className="w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-2 text-muted-foreground">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span>{activeNodes} Active</span>
          <XCircle className="h-5 w-5 text-red-500" />
          <span>{filteredNodes.length - activeNodes} Inactive</span>
        </div>
      </div>
      
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Node ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNodes.map((node) => (
              <TableRow key={node.id}>
                <TableCell className="font-medium">{node.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {node.location}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={node.status === 'Active' ? 'default' : 'destructive'} className={cn(node.status === 'Active' ? 'bg-green-500/80 hover:bg-green-500/70 text-green-950' : 'bg-red-500/80 hover:bg-red-500/70 text-red-950')}>
                    {node.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {filteredNodes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No nodes found</p>
            <p>Try adjusting your search term.</p>
        </div>
      )}
    </div>
  );
}
