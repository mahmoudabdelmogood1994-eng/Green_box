
import type { Part, Asset, GreenBoxNode, Supplier, PartSupplier } from '@/lib/types';
import { TrendingUp, Ship, Anchor, Warehouse, Plane, Factory, Container, Wrench, Tornado, ShieldAlert } from 'lucide-react';

export const parts: Part[] = [
  { id: 'part-001', name: 'Gantry Crane Motor', description: 'High-torque motor for quay cranes.', price: 15000.0, stock: 12, imageId: 'part-001' },
  { id: 'part-002', name: 'Spreader Cable Reel', description: 'Heavy-duty cable reel for container spreaders.', price: 3500.5, stock: 30, imageId: 'part-002' },
  { id: 'part-003', name: 'Mooring Line', description: '100m ultra-high-molecular-weight polyethylene rope.', price: 2200.0, stock: 50, imageId: 'part-003' },
  { id: 'part-004', name: 'RTG Tire Set', description: 'Complete tire set for rubber-tired gantry cranes.', price: 25000.0, stock: 8, imageId: 'part-004' },
  { id: 'part-005', name: 'Vessel Fuel Filter', description: 'Marine-grade fuel filter for container ships.', price: 450.0, stock: 250, imageId: 'part-005' },
  { id: 'part-006', name: 'Navigation Sensor', description: 'GPS and AIS combination sensor unit.', price: 2800.0, stock: 40, imageId: 'part-006' },
  { id: 'part-007', name: 'Reefer Container Unit', description: 'Refrigeration unit for 40ft containers.', price: 7500.0, stock: 22, imageId: 'part-007' },
  { id: 'part-008', name: 'Docking Fender', description: 'Laminated rubber fender for ship docking.', price: 1800.0, stock: 100, imageId: 'part-008' },
];

export const nodes: GreenBoxNode[] = Array.from({ length: 50 }, (_, i) => ({
    id: `GBN-${String(i + 1).padStart(3, '0')}`,
    location: `Sector ${String.fromCharCode(65 + Math.floor(i / 10))}-${(i % 10) + 1}`,
    status: i < 45 ? 'Active' : 'Inactive',
}));

export const suppliers: Supplier[] = [
    { id: 'sup-01', name: 'Global Heavy Industries', country: 'Germany' },
    { id: 'sup-02', name: 'Nippon Steel Engineering', country: 'Japan' },
    { id: 'sup-03', name: 'American Crane & Equipment', country: 'USA' },
    { id: 'sup-04', name: 'Maritime Advanced Systems', country: 'Netherlands' },
];

export const partSuppliers: PartSupplier[] = [
    { partId: 'part-001', supplierId: 'sup-01', price: 14800, leadTime: 10, spec: '500kW, 750 RPM, IP67' },
    { partId: 'part-001', supplierId: 'sup-02', price: 15200, leadTime: 12, spec: '510kW, 750 RPM, IP68' },
    { partId: 'part-001', supplierId: 'sup-03', price: 15500, leadTime: 7, spec: '490kW, 740 RPM, IP67' },
    { partId: 'part-002', supplierId: 'sup-01', price: 3400, leadTime: 15, spec: '300m capacity, 12-core fiber' },
    { partId: 'part-002', supplierId: 'sup-04', price: 3600, leadTime: 10, spec: '350m capacity, 12-core armored' },
    { partId: 'part-003', supplierId: 'sup-04', price: 2100, leadTime: 5, spec: '12-strand, 80mm diameter' },
    { partId: 'part-004', supplierId: 'sup-03', price: 24500, leadTime: 20, spec: '24.00R35, E-4 rock lug' },
    { partId: 'part-005', supplierId: 'sup-01', price: 450, leadTime: 3, spec: '10 micron, high-flow' },
    { partId: 'part-005', supplierId: 'sup-03', price: 475, leadTime: 2, spec: '10 micron, spin-on' },
    { partId: 'part-006', supplierId: 'sup-02', price: 2750, leadTime: 18, spec: 'IMO Certified, NMEA 2000' },
    { partId: 'part-006', supplierId: 'sup-04', price: 2900, leadTime: 14, spec: 'GPS/GLONASS, AIS Class B' },
    { partId: 'part-007', supplierId: 'sup-01', price: 7400, leadTime: 25, spec: '-30C to +30C range, R452A' },
    { partId: 'part-007', supplierId: 'sup-03', price: 7650, leadTime: 22, spec: '-35C to +30C range, R404A' },
    { partId: 'part-008', supplierId: 'sup-02', price: 1750, leadTime: 30, spec: '1500mm x 750mm, Black Rubber' },
    { partId: 'part-008', supplierId: 'sup-04', price: 1850, leadTime: 15, spec: '1500mm x 750mm, Grey Non-Marking' },
];

export const procurementData = [
  { month: 'Jan', cost: 45000 },
  { month: 'Feb', cost: 52000 },
  { month: 'Mar', cost: 48000 },
  { month: 'Apr', cost: 61000 },
  { month: 'May', cost: 55000 },
  { month: 'Jun', cost: 72000 },
];

export const assets: Asset[] = [
  { id: 'QC-01', name: 'Quay Crane 1', location: 'Berth 3', status: 'Operational', lastService: '2024-05-10T00:00:00.000Z' },
  { id: 'RTG-04', name: 'RTG Crane 4', location: 'Yard 7', status: 'Maintenance Due', lastService: '2024-03-22T00:00:00.000Z' },
  { id: 'STS-02', name: 'Ship-to-Shore 2', location: 'Berth 1', status: 'Offline', lastService: '2024-06-01T00:00:00.000Z' },
  { id: 'QC-03', name: 'Quay Crane 3', location: 'Berth 5', status: 'Operational', lastService: '2024-06-15T00:00:00.000Z' },
];

export const events = [
    {
        title: "Port Operations",
        description: "Routine container movements and vessel traffic.",
        time: "Ongoing",
        icon: Ship,
        status: "Normal",
        color: "bg-blue-500",
    },
    {
        title: "Weather Anomaly",
        description: "High winds detected in Sector B. Crane operations restricted.",
        time: "3 hours ago",
        icon: Tornado,
        status: "Active",
        color: "bg-yellow-500",
    },
    {
        title: "Equipment Failure",
        description: "Quay Crane 2 hydraulic system offline. Maintenance dispatched.",
        time: "1 hour ago",
        icon: Wrench,
        status: "Critical",
        color: "bg-red-500",
    },
    {
        title: "Security Alert",
        description: "Unidentified drone detected near the north perimeter.",
        time: "15 mins ago",
        icon: ShieldAlert,
        status: "High",
        color: "bg-orange-500",
    },
];

export const kpis = [
    {
        title: "Container Throughput",
        value: "1,240 TEUs",
        change: "+5.2%",
        changeType: "increase",
        icon: TrendingUp,
        description: "24-hour volume vs. previous period.",
    },
    {
        title: "Vessel Turnaround Time",
        value: "18.5 hours",
        change: "-7.5%",
        changeType: "increase",
        icon: Anchor,
        description: "Average time from arrival to departure.",
    },
    {
        title: "Yard Capacity",
        value: "85%",
        change: "+3.0%",
        changeType: "decrease",
        icon: Container,
        description: "Current utilization of container storage.",
    },
    {
        title: "Equipment Availability",
        value: "92%",
        change: "-4.0%",
        changeType: "decrease",
        icon: Wrench,
        description: "Percentage of critical equipment operational.",
    },
];
