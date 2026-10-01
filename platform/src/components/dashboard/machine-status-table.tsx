import type { Asset, AssetStatus } from '@/lib/types';
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
import { format, parseISO } from 'date-fns';

type MachineStatusTableProps = {
  data: Asset[];
};

const statusColors: Record<AssetStatus, string> = {
  Operational: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
  'Maintenance Due': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
  Offline: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 animate-pulse',
};

export default function MachineStatusTable({ data }: MachineStatusTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Last Service</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell>
              <div className="font-medium">{asset.name}</div>
              <div className="text-sm text-muted-foreground">{asset.location}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('font-normal', statusColors[asset.status])}>
                {asset.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{format(parseISO(asset.lastService), 'PPP')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
