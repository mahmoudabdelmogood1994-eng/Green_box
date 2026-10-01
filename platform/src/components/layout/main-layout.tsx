import type { PropsWithChildren } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';

export default function MainLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarRail />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
