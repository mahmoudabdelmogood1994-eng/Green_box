'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, Rss, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/translations';


export default function NodeStatusCard() {
  const [lastUpdate, setLastUpdate] = useState('');
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    const updateTimestamp = () => {
      setLastUpdate(new Date().toLocaleTimeString());
    };
    
    // Update initially
    updateTimestamp();

    // Set up an interval to update every 30 seconds
    const intervalId = setInterval(updateTimestamp, 30000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
            <Rss className="h-5 w-5 text-primary" />
            {t['Balloon Node Status']}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLastUpdate(new Date().toLocaleTimeString())}>
            <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-around text-center">
            <div>
                <p className="text-sm text-muted-foreground mb-1">CONNECTION STATUS</p>
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-500">Connected</span>
                    <span className="text-sm text-muted-foreground">Stable</span>
                </div>
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-1">ACTIVE PROTOCOL</p>
                <Badge variant="outline" className="gap-1.5">
                    <Wifi className="h-3.5 w-3.5" />
                    LoRa
                </Badge>
            </div>
        </div>
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SIGNAL STRENGTH</p>
            <div className="flex items-center gap-4">
                <Progress value={82.4} className="w-full" />
                <span className="font-semibold text-lg">82.4%</span>
            </div>
        </div>
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">BACKUP SYSTEMS</p>
            <div className="flex items-center gap-2">
                <Badge>5G Ready</Badge>
                <Badge>Satellite Available</Badge>
            </div>
        </div>
        <div className="text-sm text-muted-foreground text-center pt-2">
            Last Update: {lastUpdate}
        </div>
      </CardContent>
    </Card>
  );
}
