'use client';

import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/header';
import StatsCard from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ActiveAlertsTable from '@/components/dashboard/active-alerts-table';
import NodeStatusCard from '@/components/dashboard/node-status-card';
import { AlertTriangle, Bot, Gauge, Signal } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { translations } from '@/lib/translations';


export default function DashboardPage() {
  const { language } = useLanguage();
  const t = translations[language];

  const newDashboardStats = [
    { title: 'Active Green Box Nodes', value: '45/50', change: 'Total Operational', changeType: 'increase', icon: Bot, href: '/nodes' },
    { title: 'New Predictive Alerts (24h)', value: '5', change: 'Requires Attention', changeType: 'decrease', icon: AlertTriangle, href: '/live-alerts' },
    { title: 'Average MTTR', value: '18 min', change: 'Mean Time To Repair', changeType: 'increase', icon: Gauge },
    { title: 'Overall System Uptime', value: '99.9%', change: 'Last 30 Days', changeType: 'increase', icon: Signal },
  ];
  
  return (
    <MainLayout>
      <Header title="Green Box Monitoring" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {newDashboardStats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{t['Active Predictive Alerts']}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActiveAlertsTable />
            </CardContent>
          </Card>
          <div className="col-span-4 lg:col-span-3">
            <NodeStatusCard />
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
