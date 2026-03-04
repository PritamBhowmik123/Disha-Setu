export type ProjectStatus = 'In Progress' | 'Completed' | 'Delayed';

export interface Milestone {
  title: string;
  completed: boolean;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  department: string;
  contractor: string;
  category: 'Road' | 'Bridge' | 'Hospital' | 'Metro' | 'College' | 'Water' | 'Park';
  status: ProjectStatus;
  location: string;
  area: string;
  district: string;
  distance: string;
  startDate: string;
  expectedCompletion: string;
  budget: string;
  completion: number;
  lastUpdated: string;
  delayReason?: string;
  civicImpact: string;
  beneficiaries: string;
  impactStat: string;
  coordinates: { lat: number; lng: number };
  milestones: Milestone[];
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Hebbal Flyover Expansion',
    department: 'BBMP - Roads Division',
    contractor: 'L&T Infrastructure Ltd.',
    category: 'Bridge',
    status: 'In Progress',
    location: 'Hebbal, Bangalore',
    area: 'Hebbal',
    district: 'Bangalore North',
    distance: '0.4 km',
    startDate: 'Jan 2024',
    expectedCompletion: 'Dec 2025',
    budget: '₹ 120 Cr',
    completion: 62,
    lastUpdated: '2 days ago',
    civicImpact: 'This flyover will reduce traffic congestion by 35% in the Hebbal junction, benefiting over 80,000 daily commuters.',
    beneficiaries: '80,000+ daily commuters',
    impactStat: '35% congestion reduction',
    coordinates: { lat: 13.0358, lng: 77.5970 },
    milestones: [
      { title: 'Foundation Complete', completed: true, date: 'Mar 2024' },
      { title: 'Structural Work', completed: true, date: 'Aug 2024' },
      { title: 'Deck Slabs', completed: false, date: 'Mar 2025' },
      { title: 'Road Markings & Safety', completed: false, date: 'Oct 2025' },
      { title: 'Inauguration', completed: false, date: 'Dec 2025' },
    ],
  },
  {
    id: '2',
    name: 'Kempegowda Layout Metro Extension',
    department: 'BMRCL',
    contractor: 'Afcons Infrastructure',
    category: 'Metro',
    status: 'In Progress',
    location: 'KG Layout, Bangalore',
    area: 'Kempegowda Layout',
    district: 'Bangalore West',
    distance: '1.2 km',
    startDate: 'Jun 2023',
    expectedCompletion: 'Mar 2026',
    budget: '₹ 840 Cr',
    completion: 45,
    lastUpdated: '5 days ago',
    civicImpact: 'Metro extension will connect 5 key localities, reducing road traffic by an estimated 25% and serving 120,000 daily riders.',
    beneficiaries: '1.2 lakh daily riders',
    impactStat: '25% road traffic reduction',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    milestones: [
      { title: 'Land Acquisition', completed: true, date: 'Dec 2023' },
      { title: 'Tunneling Phase 1', completed: true, date: 'Jun 2024' },
      { title: 'Tunneling Phase 2', completed: false, date: 'Dec 2024' },
      { title: 'Station Construction', completed: false, date: 'Sep 2025' },
      { title: 'Trial Run', completed: false, date: 'Jan 2026' },
      { title: 'Commercial Launch', completed: false, date: 'Mar 2026' },
    ],
  },
  {
    id: '3',
    name: 'Rajajinagar General Hospital Upgrade',
    department: 'BBMP Health Division',
    contractor: 'Shapoorji Pallonji',
    category: 'Hospital',
    status: 'Delayed',
    location: 'Rajajinagar, Bangalore',
    area: 'Rajajinagar',
    district: 'Bangalore West',
    distance: '2.1 km',
    startDate: 'Apr 2023',
    expectedCompletion: 'Jun 2025',
    budget: '₹ 45 Cr',
    completion: 30,
    lastUpdated: '1 week ago',
    delayReason: 'Delay in procurement of specialized medical equipment and contractor dispute.',
    civicImpact: 'New 200-bed facility with ICU and trauma center will serve 3 lakh residents of West Bangalore.',
    beneficiaries: '3 lakh residents',
    impactStat: '200 new hospital beds',
    coordinates: { lat: 12.9915, lng: 77.5530 },
    milestones: [
      { title: 'Demolition of Old Wing', completed: true, date: 'Jul 2023' },
      { title: 'Foundation & Basement', completed: true, date: 'Dec 2023' },
      { title: 'Superstructure (Floors 1-3)', completed: false, date: 'Aug 2024' },
      { title: 'MEP Works', completed: false, date: 'Feb 2025' },
      { title: 'Medical Equipment Install', completed: false, date: 'May 2025' },
    ],
  },
  {
    id: '4',
    name: 'Outer Ring Road Surface Repair',
    department: 'NHAI',
    contractor: 'KMC Constructions',
    category: 'Road',
    status: 'Completed',
    location: 'ORR, Marathahalli to Sarjapur',
    area: 'Marathahalli',
    district: 'Bangalore East',
    distance: '3.4 km',
    startDate: 'Nov 2023',
    expectedCompletion: 'Feb 2024',
    budget: '₹ 18 Cr',
    completion: 100,
    lastUpdated: 'Feb 2024',
    civicImpact: '12 km of road repaired with smart surface, reducing pothole-related accidents by 60%.',
    beneficiaries: '2 lakh vehicles/day',
    impactStat: '60% accident reduction',
    coordinates: { lat: 12.9591, lng: 77.6974 },
    milestones: [
      { title: 'Survey & Planning', completed: true, date: 'Nov 2023' },
      { title: 'Old Surface Removal', completed: true, date: 'Dec 2023' },
      { title: 'New Asphalt Laying', completed: true, date: 'Jan 2024' },
      { title: 'Road Markings', completed: true, date: 'Feb 2024' },
      { title: 'Handover', completed: true, date: 'Feb 2024' },
    ],
  },
  {
    id: '5',
    name: 'Visvesvaraya Tech College New Block',
    department: 'Dept. of Higher Education',
    contractor: 'Prestige Constructions',
    category: 'College',
    status: 'In Progress',
    location: 'Yelahanka, Bangalore',
    area: 'Yelahanka',
    district: 'Bangalore North',
    distance: '5.7 km',
    startDate: 'Aug 2024',
    expectedCompletion: 'Apr 2026',
    budget: '₹ 32 Cr',
    completion: 18,
    lastUpdated: '3 days ago',
    civicImpact: 'New academic block with 40 classrooms, 10 labs and 500-seat auditorium. Will benefit 3000+ students.',
    beneficiaries: '3,000+ students',
    impactStat: '40 new classrooms',
    coordinates: { lat: 13.1007, lng: 77.5963 },
    milestones: [
      { title: 'Foundation Work', completed: true, date: 'Oct 2024' },
      { title: 'Ground Floor Frame', completed: false, date: 'Mar 2025' },
      { title: 'Upper Floors', completed: false, date: 'Nov 2025' },
      { title: 'Interior & Labs', completed: false, date: 'Feb 2026' },
      { title: 'Inauguration', completed: false, date: 'Apr 2026' },
    ],
  },
];

export interface NotificationData {
  id: string;
  type: 'new_project' | 'status_change' | 'completed' | 'delay';
  title: string;
  body: string;
  time: string;
  projectId: string;
  read: boolean;
}

export const MOCK_NOTIFICATIONS: NotificationData[] = [
  {
    id: 'n1',
    type: 'new_project',
    title: '📍 New Project Nearby',
    body: 'A ₹120 Cr Hebbal Flyover project is 400m from your location.',
    time: '2 min ago',
    projectId: '1',
    read: false,
  },
  {
    id: 'n2',
    type: 'delay',
    title: '⚠️ Project Delayed',
    body: 'Rajajinagar Hospital upgrade has been delayed. New ETA: Oct 2025.',
    time: '1 hour ago',
    projectId: '3',
    read: false,
  },
  {
    id: 'n3',
    type: 'status_change',
    title: '🔄 Status Updated',
    body: 'KG Layout Metro Extension: Tunneling Phase 1 marked complete.',
    time: '3 hours ago',
    projectId: '2',
    read: true,
  },
  {
    id: 'n4',
    type: 'completed',
    title: '✅ Project Completed',
    body: 'ORR Surface Repair (Marathahalli–Sarjapur) is now complete!',
    time: 'Yesterday',
    projectId: '4',
    read: true,
  },
  {
    id: 'n5',
    type: 'new_project',
    title: '📍 New Project Nearby',
    body: 'Visvesvaraya Tech College new block construction started (5.7 km away).',
    time: '2 days ago',
    projectId: '5',
    read: true,
  },
];

export interface ActivityItem {
  id: string;
  type: 'feedback' | 'saved' | 'reported';
  title: string;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Saved';
  projectName: string;
  date: string;
  ticketId?: string;
}

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    type: 'feedback',
    title: 'Safety concern at construction site',
    status: 'Under Review',
    projectName: 'Hebbal Flyover Expansion',
    date: '28 Feb 2025',
    ticketId: 'GF-2025-0847',
  },
  {
    id: 'a2',
    type: 'saved',
    title: 'Saved project',
    status: 'Saved',
    projectName: 'KG Layout Metro Extension',
    date: '25 Feb 2025',
  },
  {
    id: 'a3',
    type: 'reported',
    title: 'Noise pollution complaint',
    status: 'Resolved',
    projectName: 'Rajajinagar Hospital Upgrade',
    date: '14 Feb 2025',
    ticketId: 'GF-2025-0612',
  },
];

export const CATEGORY_ICONS: Record<string, string> = {
  Bridge: '🌉',
  Metro: '🚇',
  Hospital: '🏥',
  Road: '🛣️',
  College: '🏫',
  Water: '💧',
  Park: '🌳',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  'In Progress': '#00D4AA',
  'Completed': '#10B981',
  'Delayed': '#EF4444',
};
