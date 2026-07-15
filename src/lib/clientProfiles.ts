import { initialState, type TasteState } from "../taste/model";

export interface ClientProfile {
  id: string;
  name: string;
  createdAt: number;
  state: TasteState;
}

export interface ProfileStore {
  activeId: string;
  profiles: ClientProfile[];
}

const STORAGE_KEY = "taste-engine.clients.v1";

function newId(): string {
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function freshProfile(name: string): ClientProfile {
  return { id: newId(), name, createdAt: Date.now(), state: initialState() };
}

function defaultStore(): ProfileStore {
  const first = freshProfile("Client 1");
  return { activeId: first.id, profiles: [first] };
}

// Every read/write goes through this module so App.tsx never touches
// localStorage directly and a corrupt/missing store always degrades to a
// single fresh profile instead of crashing the app.
export function loadStore(): ProfileStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProfileStore>;
      if (parsed.profiles?.length && parsed.activeId) return { activeId: parsed.activeId, profiles: parsed.profiles };
    }
  } catch {
    // fall through to a fresh default store below
  }
  // Persist immediately so a second loadStore() call in the same render
  // (e.g. a sibling useState initializer) reads back this exact profile
  // instead of independently minting a second, mismatched default.
  const fresh = defaultStore();
  saveStore(fresh);
  return fresh;
}

function saveStore(store: ProfileStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage can be unavailable (private browsing, quota) — the
    // session still works in-memory, it just won't persist across reloads.
  }
}

export function getActiveProfile(store: ProfileStore): ClientProfile {
  return store.profiles.find((p) => p.id === store.activeId) ?? store.profiles[0];
}

export function saveTasteState(store: ProfileStore, profileId: string, state: TasteState): ProfileStore {
  const next: ProfileStore = {
    ...store,
    profiles: store.profiles.map((p) => (p.id === profileId ? { ...p, state } : p)),
  };
  saveStore(next);
  return next;
}

export function switchProfile(store: ProfileStore, profileId: string): ProfileStore {
  if (!store.profiles.some((p) => p.id === profileId)) return store;
  const next: ProfileStore = { ...store, activeId: profileId };
  saveStore(next);
  return next;
}

export function createProfile(store: ProfileStore, name: string): ProfileStore {
  const profile = freshProfile(name.trim() || `Client ${store.profiles.length + 1}`);
  const next: ProfileStore = { activeId: profile.id, profiles: [...store.profiles, profile] };
  saveStore(next);
  return next;
}

export function renameProfile(store: ProfileStore, profileId: string, name: string): ProfileStore {
  const trimmed = name.trim();
  if (!trimmed) return store;
  const next: ProfileStore = {
    ...store,
    profiles: store.profiles.map((p) => (p.id === profileId ? { ...p, name: trimmed } : p)),
  };
  saveStore(next);
  return next;
}

// Refuses to delete the last remaining profile — there must always be at
// least one client to swipe into.
export function deleteProfile(store: ProfileStore, profileId: string): ProfileStore {
  if (store.profiles.length <= 1) return store;
  const profiles = store.profiles.filter((p) => p.id !== profileId);
  const activeId = store.activeId === profileId ? profiles[0].id : store.activeId;
  const next: ProfileStore = { activeId, profiles };
  saveStore(next);
  return next;
}
