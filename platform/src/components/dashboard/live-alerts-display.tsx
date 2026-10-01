'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { CriticalAlert } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, Thermometer, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statusConfig: Record<string, { icon: React.ElementType; className: string; }> = {
  INITIALIZING: { icon: Loader2, className: 'text-blue-500 animate-spin' },
  NOMINAL: { icon: AlertTriangle, className: 'text-green-500' },
  WARNING: { icon: AlertTriangle, className: 'text-yellow-500' },
  CRITICAL: { icon: AlertCircle, className: 'text-red-500 animate-pulse' },
};

function AlertCard({ alert }: { alert: CriticalAlert }) {
  const config = statusConfig[alert.status] || { icon: AlertTriangle, className: 'text-gray-500' };
  const Icon = config.icon;
  const lastUpdate = alert.last_simulated_update ? new Date(alert.last_simulated_update.seconds * 1000) : null;
  
  return (
    <Card className={cn('transition-all', alert.status === 'CRITICAL' ? 'border-red-500/50 bg-red-500/5' : '')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{alert.asset_ID}</CardTitle>
          <Badge variant={alert.status === 'CRITICAL' ? 'destructive' : 'secondary'} className="gap-1.5">
            <Icon className={cn('h-4 w-4', config.className)} />
            {alert.status}
          </Badge>
        </div>
        <CardDescription>{alert.part_PN}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Thermometer className="h-5 w-5" />
            <span>Current Reading</span>
          </div>
          <span className="font-bold text-2xl">{alert.current_reading.toFixed(1)}°C</span>
        </div>
        {alert.reason && (
          <p className="text-sm text-muted-foreground italic">
            <strong>Reason:</strong> {alert.reason}
          </p>
        )}
        {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                <Clock className="h-3 w-3" />
                <span>Last Updated: {format(lastUpdate, 'PPP p')}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LiveAlertsDisplay() {
  const firestore = useFirestore();
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'Critical_Alerts');
  }, [firestore]);

  const { data: alerts, isLoading, error } = useCollection<CriticalAlert>(alertsQuery);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Connecting to live feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle />
            Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not connect to the live alerts feed.</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!alerts || alerts.length === 0) {
    return (
        <div className="flex items-center justify-center h-64 text-center">
            <div>
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Active Alerts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    The system is currently monitoring for critical events.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
