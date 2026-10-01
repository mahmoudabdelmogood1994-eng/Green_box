import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, ChevronsUp, Bot, TriangleAlert } from 'lucide-react';

type Priority = 'Critical' | 'High' | 'Medium';

type Alert = {
  id: string;
  system: string;
  timeToFailure: number;
  priority: Priority;
};

const alerts: Alert[] = [
  { id: 'GB-453', system: 'Cooling Unit', timeToFailure: 11.0, priority: 'Critical' },
  { id: 'GB-231', system: 'Pump System', timeToFailure: 22.99, priority: 'High' },
  { id: 'GB-187', system: 'Compressor', timeToFailure: 7.0, priority: 'Critical' },
  { id: 'GB-412', system: 'Fan Motor', timeToFailure: 34.99, priority: 'Medium' },
  { id: 'GB-298', system: 'Control Unit', timeToFailure: 46.99, priority: 'Medium' },
];

const priorityConfig: Record<Priority, { icon: React.ElementType; className: string; badgeVariant: "destructive" | "default" | "secondary" | "outline" }> = {
  Critical: { icon: AlertCircle, className: 'text-red-500', badgeVariant: 'destructive' },
  High: { icon: TriangleAlert, className: 'text-yellow-500', badgeVariant: 'default' },
  Medium: { icon: AlertTriangle, className: 'text-blue-500', badgeVariant: 'secondary' },
};


export default function ActiveAlertsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Unit/Node ID</TableHead>
          <TableHead>System Type</TableHead>
          <TableHead>Time to Failure</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => {
            const config = priorityConfig[alert.priority];
            const Icon = config.icon;
            const problemDescription = `A ${alert.priority} alert has been triggered for the ${alert.system}. Predicted time to failure is approximately ${alert.timeToFailure.toFixed(2)} hours. Please advise on necessary actions and parts.`;
            const advisorUrl = `/ai-tools?tab=advisor&equipmentType=${encodeURIComponent(alert.system)}&problemDescription=${encodeURIComponent(problemDescription)}`;

            return (
                <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.id}</TableCell>
                    <TableCell>{alert.system}</TableCell>
                    <TableCell className={cn(alert.timeToFailure < 12 ? 'text-red-500 font-medium' : '')}>
                        {alert.timeToFailure.toFixed(2)} hours
                    </TableCell>
                    <TableCell>
                    <Badge variant={config.badgeVariant} className="gap-1.5">
                        <Icon className="h-3 w-3" />
                        {alert.priority}
                    </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={advisorUrl}>
                        <Bot className="mr-2 h-4 w-4" />
                        View in AI Assistant
                      </Link>
                    </Button>
                    </TableCell>
                </TableRow>
            );
        })}
      </TableBody>
    </Table>
  );
}
