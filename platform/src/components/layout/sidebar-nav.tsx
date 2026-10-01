'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wrench, BrainCircuit, Radio, Server, Share2 } from 'lucide-react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons/logo';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/nodes', icon: Server, label: 'Nodes' },
  { href: '/marketplace', icon: Wrench, label: 'Spares' },
  { href: '/ai-tools', icon: BrainCircuit, label: 'AI Tools' },
  { href: '/live-alerts', icon: Radio, label: 'Live Alerts' },
  { href: '/share', icon: Share2, label: 'Share' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-1">
          <Logo className="w-8 h-8 text-primary" />
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Green Box
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start"
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-muted-foreground p-2 group-data-[collapsible=icon]:hidden">
          <p>&copy; {new Date().getFullYear()} Green Box</p>
        </div>
      </SidebarFooter>
    </>
  );
}
