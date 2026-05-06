import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured, mediaBucket } from '../lib/supabaseClient';
import { SEED_LOGS, SEED_USERS, sanitizeStoredMedia } from '../lib/trackerConfig';

const DataContext = createContext(null);

const LOG_SELECT = `
  id,
  user_id,
  team,
  work_date,
  hours,
  notes,
  verification_status,
  created_at,
  profiles:user_id (
    full_name,
    email,
    role,
    team
  ),
  work_log_media (
    id,
    storage_path,
    file_name,
    mime_type,
    size_bytes,
    created_at
  )
`;

function storagePathFor({ userId, logId, fileName }) {
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'attachment';

  const key = globalThis.crypto?.randomUUID?.() || Date.now();
  return `${userId}/${logId}/${key}-${safeName}`;
}

function localProfiles() {
  return JSON.parse(localStorage.getItem('abl_users') || JSON.stringify(SEED_USERS))
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
    }));
}

function initialLocalLogs() {
  const stored = localStorage.getItem('abl_logs');
  if (stored) return JSON.parse(stored);

  localStorage.setItem('abl_logs', JSON.stringify(SEED_LOGS));
  return SEED_LOGS;
}

async function signedMediaUrl(media) {
  if (!media.storage_path) return '';

  const { data, error } = await supabase
    .storage
    .from(mediaBucket)
    .createSignedUrl(media.storage_path, 60 * 60);

  if (error) return '';
  return data.signedUrl;
}

async function normalizeSupabaseLog(row) {
  const profile = row.profiles || {};
  const mediaFiles = await Promise.all((row.work_log_media || []).map(async media => ({
    id: media.id,
    name: media.file_name,
    type: media.mime_type,
    size: media.size_bytes,
    path: media.storage_path,
    url: await signedMediaUrl(media),
  })));

  return {
    id: row.id,
    userId: row.user_id,
    userName: profile.full_name || profile.email || 'Team Member',
    userRole: profile.role || 'collaborator',
    team: row.team || profile.team,
    date: row.work_date,
    hours: Number(row.hours),
    notes: row.notes,
    mediaFiles,
    verificationStatus: row.verification_status || 'verified',
    submittedAt: row.created_at,
  };
}

export function DataProvider({ children }) {
  const { user, authBackend } = useAuth();
  const [logs, setLogs] = useState(() => isSupabaseConfigured ? [] : initialLocalLogs());
  const [profiles, setProfiles] = useState(() => isSupabaseConfigured ? [] : localProfiles());
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [syncError, setSyncError] = useState('');

  const loadLocal = useCallback(() => {
    setLogs(initialLocalLogs());
    setProfiles(localProfiles());
    setLoading(false);
    setSyncError('');
  }, []);

  const loadSupabaseLogs = useCallback(async () => {
    if (!user || !supabase) {
      setLogs([]);
      setProfiles([]);
      return;
    }

    setLoading(true);
    setSyncError('');

    const profileQuery = user.role === 'executive'
      ? supabase.from('profiles').select('id, email, full_name, role, team, avatar_url').order('full_name')
      : supabase.from('profiles').select('id, email, full_name, role, team, avatar_url').eq('id', user.id);

    let logQuery = supabase
      .from('work_logs')
      .select(LOG_SELECT)
      .order('created_at', { ascending: false });

    if (user.role !== 'executive') {
      logQuery = logQuery.eq('user_id', user.id);
    }

    const [{ data: profileRows, error: profileError }, { data: logRows, error: logError }] = await Promise.all([
      profileQuery,
      logQuery,
    ]);

    if (profileError || logError) {
      setSyncError(profileError?.message || logError?.message || 'Unable to sync data.');
      setLoading(false);
      return;
    }

    const normalizedLogs = await Promise.all((logRows || []).map(normalizeSupabaseLog));
    setProfiles((profileRows || []).map(profile => ({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role,
      team: profile.team,
      avatarUrl: profile.avatar_url,
    })));
    setLogs(normalizedLogs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isSupabaseConfigured) loadSupabaseLogs();
  }, [authBackend, loadSupabaseLogs]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !supabase) return undefined;

    const channel = supabase
      .channel('work-log-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, loadSupabaseLogs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_log_media' }, loadSupabaseLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadSupabaseLogs]);

  const saveLocal = (updated) => {
    const cleaned = updated.map(log => ({
      ...log,
      mediaFiles: sanitizeStoredMedia(log.mediaFiles),
    }));

    localStorage.setItem('abl_logs', JSON.stringify(cleaned));
    setLogs(cleaned);
  };

  const uploadMedia = async ({ logId, files }) => {
    const mediaRows = [];

    for (const media of files) {
      if (!media.file) continue;

      const storagePath = storagePathFor({
        userId: user.id,
        logId,
        fileName: media.name,
      });

      const { error: uploadError } = await supabase
        .storage
        .from(mediaBucket)
        .upload(storagePath, media.file, {
          contentType: media.type || media.file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      mediaRows.push({
        work_log_id: logId,
        storage_path: storagePath,
        file_name: media.name,
        mime_type: media.type || media.file.type,
        size_bytes: media.size || media.file.size,
      });
    }

    if (!mediaRows.length) return;

    const { error } = await supabase
      .from('work_log_media')
      .insert(mediaRows);

    if (error) throw error;
  };

  const addLog = async (entry) => {
    setSyncError('');

    if (isSupabaseConfigured) {
      const verificationStatus = entry.mediaFiles?.length || entry.notes.trim().length >= 50
        ? 'verified'
        : 'needs_review';

      const { data: created, error } = await supabase
        .from('work_logs')
        .insert({
          user_id: user.id,
          team: user.team,
          work_date: entry.date,
          hours: entry.hours,
          notes: entry.notes,
          verification_status: verificationStatus,
        })
        .select('id')
        .single();

      if (error) {
        setSyncError(error.message);
        return { error: error.message };
      }

      try {
        await uploadMedia({ logId: created.id, files: entry.mediaFiles || [] });
        await loadSupabaseLogs();
      } catch (uploadError) {
        setSyncError(uploadError.message);
        await loadSupabaseLogs();
        return { error: uploadError.message };
      }

      return { ok: true, logId: created.id };
    }

    const newLog = {
      ...entry,
      id: 'l' + Date.now(),
      userRole: user.role,
      verificationStatus: entry.mediaFiles?.length || entry.notes.trim().length >= 50 ? 'verified' : 'needs_review',
      submittedAt: new Date().toISOString(),
    };

    saveLocal([newLog, ...logs]);
    return { ok: true, log: newLog };
  };

  const deleteLog = async (id) => {
    setSyncError('');

    if (isSupabaseConfigured) {
      const target = logs.find(log => log.id === id);
      const paths = target?.mediaFiles?.map(file => file.path).filter(Boolean) || [];

      if (paths.length) {
        await supabase.storage.from(mediaBucket).remove(paths);
      }

      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id);

      if (error) {
        setSyncError(error.message);
        return { error: error.message };
      }

      setLogs(current => current.filter(log => log.id !== id));
      return { ok: true };
    }

    saveLocal(logs.filter(log => log.id !== id));
    return { ok: true };
  };

  const getLogsForUser = (userId) => logs.filter(log => log.userId === userId);

  const getAllLogs = () => [...logs].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const getStats = () => {
    const total = logs.reduce((sum, log) => sum + Number(log.hours), 0);
    const byTeam = {};
    const byUser = {};

    logs.forEach(log => {
      byTeam[log.team] = (byTeam[log.team] || 0) + Number(log.hours);

      if (!byUser[log.userId]) {
        byUser[log.userId] = {
          name: log.userName,
          team: log.team,
          role: log.userRole || 'collaborator',
          hours: 0,
          entries: 0,
        };
      }

      byUser[log.userId].hours += Number(log.hours);
      byUser[log.userId].entries += 1;
    });

    return { total, byTeam, byUser, count: logs.length };
  };

  const getMembers = () => {
    const stats = getStats();
    const map = new Map();

    profiles.forEach(profile => {
      map.set(profile.id, {
        userId: profile.id,
        name: profile.name,
        email: profile.email,
        team: profile.team,
        role: profile.role || 'collaborator',
        hours: 0,
        entries: 0,
      });
    });

    Object.entries(stats.byUser).forEach(([userId, data]) => {
      const existing = map.get(userId) || {};
      map.set(userId, {
        userId,
        name: existing.name || data.name,
        email: existing.email || '',
        team: existing.team || data.team,
        role: existing.role || data.role || 'collaborator',
        hours: data.hours,
        entries: data.entries,
      });
    });

    return [...map.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
  };

  const value = {
    logs,
    profiles,
    loading,
    syncError,
    dataBackend: isSupabaseConfigured ? 'supabase' : 'local',
    addLog,
    deleteLog,
    refreshLogs: isSupabaseConfigured ? loadSupabaseLogs : loadLocal,
    getLogsForUser,
    getAllLogs,
    getStats,
    getMembers,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
