export const TEAMS = [
  'Software Engineering',
  'Hardware Engineering',
  'Design & Communications',
  'Operations Strategy & Research',
];

export const TEAM_OPTIONS = ['All Teams', ...TEAMS];

export const CONTRIBUTION_START_DATE = '2026-05-05';

export const ADMIN_EMAILS = [
  'emidaz138@gmail.com',
];

export const EXECUTIVE_EMAILS = [
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
    role: 'administrator',
    team: 'Software Engineering',
    profileCompleted: true,
  },
  {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'exec@ableto.com',
    password: 'demo1234',
    role: 'executive',
    team: 'Software Engineering',
    profileCompleted: true,
  },
  {
    id: 'u2',
    name: 'Jordan Lee',
    email: 'sw@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Software Engineering',
    profileCompleted: true,
  },
  {
    id: 'u3',
    name: 'Sam Torres',
    email: 'hw@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Hardware Engineering',
    profileCompleted: true,
  },
  {
    id: 'u4',
    name: 'Morgan Kim',
    email: 'design@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Design & Communications',
    profileCompleted: true,
  },
  {
    id: 'u5',
    name: 'Casey Patel',
    email: 'ops@ableto.com',
    password: 'demo1234',
    role: 'collaborator',
    team: 'Operations Strategy & Research',
    profileCompleted: true,
  },
];

export const SEED_LOGS = [
  {
    id: 'l1',
    userId: 'u2',
    userName: 'Jordan Lee',
    userRole: 'collaborator',
    team: 'Software Engineering',
    date: '2026-05-05',
    hours: 3,
    notes: 'Completed the REST API endpoints for user authentication and wrote unit tests covering edge cases.',
    mediaFiles: [],
    verificationStatus: 'needs_review',
    submittedAt: '2026-05-05T14:30:00Z',
  },
  {
    id: 'l2',
    userId: 'u3',
    userName: 'Sam Torres',
    userRole: 'collaborator',
    team: 'Hardware Engineering',
    date: '2026-05-05',
    hours: 5,
    notes: 'Soldered and tested prototype PCB board v2. Fixed grounding issue on sensor array.',
    mediaFiles: [],
    verificationStatus: 'needs_review',
    submittedAt: '2026-05-05T17:00:00Z',
  },
  {
    id: 'l3',
    userId: 'u4',
    userName: 'Morgan Kim',
    userRole: 'collaborator',
    team: 'Design & Communications',
    date: '2026-05-06',
    hours: 2,
    notes: 'Designed updated brand guidelines deck and created three new icon sets for the mobile app.',
    mediaFiles: [],
    verificationStatus: 'needs_review',
    submittedAt: '2026-05-06T16:10:00Z',
  },
  {
    id: 'l4',
    userId: 'u5',
    userName: 'Casey Patel',
    userRole: 'collaborator',
    team: 'Operations Strategy & Research',
    date: '2026-05-06',
    hours: 4,
    notes: 'Completed competitive analysis report Q2 and drafted KPI framework for upcoming sprint review.',
    mediaFiles: [],
    verificationStatus: 'needs_review',
    submittedAt: '2026-05-06T11:45:00Z',
  },
];

export function getRoleForEmail(email, fallback = 'collaborator') {
  const normalized = email?.toLowerCase();
  if (ADMIN_EMAILS.includes(normalized)) return 'administrator';
  return EXECUTIVE_EMAILS.includes(normalized) ? 'executive' : fallback;
}

export function hasExecutiveAccess(role) {
  return role === 'administrator' || role === 'executive';
}

export function isSiteAdministrator(role) {
  return role === 'administrator';
}

export function isCountableLog(log) {
  return log?.date >= CONTRIBUTION_START_DATE;
}

export function sanitizeStoredMedia(files = []) {
  return files.map((media) => {
    const clean = { ...media };
    delete clean.file;
    return clean;
  });
}
