export const TEAMS = [
  'Software Engineering',
  'Hardware Engineering',
  'Design & Communications',
  'Operations Strategy & Research',
];

export const TEAM_OPTIONS = ['All Teams', ...TEAMS];

export const EXECUTIVE_EMAILS = [
  'emidaz138@gmail.com',
  'exec@ableto.com',
];

export const TEAM_META = {
  'Software Engineering': {
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.14)',
    badge: 'badge-blue',
  },
  'Hardware Engineering': {
    color: '#93c5fd',
    bg: 'rgba(147,197,253,0.12)',
    badge: 'badge-sky',
  },
  'Design & Communications': {
    color: '#bfdbfe',
    bg: 'rgba(191,219,254,0.10)',
    badge: 'badge-light-blue',
  },
  'Operations Strategy & Research': {
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.16)',
    badge: 'badge-deep-blue',
  },
};

export const SEED_USERS = [
  {
    id: 'u0',
    name: 'Emilio Daza',
    email: 'emidaz138@gmail.com',
    password: 'ableto2026',
    role: 'executive',
    team: 'Software Engineering',
  },
  {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'exec@ableto.com',
    password: 'demo1234',
    role: 'executive',
    team: 'Software Engineering',
  },
  {
    id: 'u2',
    name: 'Jordan Lee',
    email: 'sw@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Software Engineering',
  },
  {
    id: 'u3',
    name: 'Sam Torres',
    email: 'hw@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Hardware Engineering',
  },
  {
    id: 'u4',
    name: 'Morgan Kim',
    email: 'design@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Design & Communications',
  },
  {
    id: 'u5',
    name: 'Casey Patel',
    email: 'ops@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Operations Strategy & Research',
  },
];

export const SEED_LOGS = [
  {
    id: 'l1',
    userId: 'u2',
    userName: 'Jordan Lee',
    userRole: 'collaborator',
    team: 'Software Engineering',
    date: '2026-04-18',
    hours: 3,
    notes: 'Completed the REST API endpoints for user authentication and wrote unit tests covering edge cases.',
    mediaFiles: [],
    verificationStatus: 'verified',
    submittedAt: '2026-04-18T14:30:00Z',
  },
  {
    id: 'l2',
    userId: 'u3',
    userName: 'Sam Torres',
    userRole: 'collaborator',
    team: 'Hardware Engineering',
    date: '2026-04-19',
    hours: 5,
    notes: 'Soldered and tested prototype PCB board v2. Fixed grounding issue on sensor array.',
    mediaFiles: [],
    verificationStatus: 'verified',
    submittedAt: '2026-04-19T17:00:00Z',
  },
  {
    id: 'l3',
    userId: 'u4',
    userName: 'Morgan Kim',
    userRole: 'collaborator',
    team: 'Design & Communications',
    date: '2026-04-19',
    hours: 2,
    notes: 'Designed updated brand guidelines deck and created three new icon sets for the mobile app.',
    mediaFiles: [],
    verificationStatus: 'verified',
    submittedAt: '2026-04-19T16:10:00Z',
  },
  {
    id: 'l4',
    userId: 'u5',
    userName: 'Casey Patel',
    userRole: 'collaborator',
    team: 'Operations Strategy & Research',
    date: '2026-04-20',
    hours: 4,
    notes: 'Completed competitive analysis report Q2 and drafted KPI framework for upcoming sprint review.',
    mediaFiles: [],
    verificationStatus: 'verified',
    submittedAt: '2026-04-20T11:45:00Z',
  },
];

export function getRoleForEmail(email, fallback = 'collaborator') {
  return EXECUTIVE_EMAILS.includes(email?.toLowerCase()) ? 'executive' : fallback;
}

export function sanitizeStoredMedia(files = []) {
  return files.map((media) => {
    const clean = { ...media };
    delete clean.file;
    return clean;
  });
}
