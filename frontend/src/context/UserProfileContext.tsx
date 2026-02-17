import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UserProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    login: (id: string) => Promise<boolean>;
    loginByName: (name: string) => Promise<boolean>;
    createProfile: (data: Partial<UserProfile>) => Promise<UserProfile | null>;
    updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
    logout: () => void;
    toggleFavorite: (formationId: string) => Promise<void>;
    isFavorite: (formationId: string) => boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
    profile: null,
    loading: false,
    login: async () => false,
    loginByName: async () => false,
    createProfile: async () => null,
    updateProfile: async () => false,
    logout: () => { },
    toggleFavorite: async () => { },
    isFavorite: () => false,
});

export function useUserProfile() {
    return useContext(UserProfileContext);
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);

    // On mount, try to restore session from localStorage
    useEffect(() => {
        const savedId = localStorage.getItem('userId');
        if (savedId) {
            login(savedId);
        }
    }, []);

    const login = async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${id}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                localStorage.setItem('userId', id);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const loginByName = async (name: string): Promise<boolean> => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/by-name/${encodeURIComponent(name)}`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                localStorage.setItem('userId', data.id);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async (data: Partial<UserProfile>): Promise<UserProfile | null> => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const p = await res.json();
                setProfile(p);
                localStorage.setItem('userId', p.id);
                return p;
            }
            return null;
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
        if (!profile) return false;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${profile.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setProfile(null);
        localStorage.removeItem('userId');
    };

    const toggleFavorite = async (formationId: string): Promise<void> => {
        if (!profile) return;
        const isFav = profile.favoriteIds.includes(formationId);
        const method = isFav ? 'DELETE' : 'POST';
        try {
            await fetch(`${API_URL}/users/${profile.id}/favorites/${formationId}`, { method });
            // Optimistic update
            setProfile(prev => {
                if (!prev) return prev;
                const newFavs = isFav
                    ? prev.favoriteIds.filter(id => id !== formationId)
                    : [...prev.favoriteIds, formationId];
                return { ...prev, favoriteIds: newFavs };
            });
        } catch {
            // Ignore errors silently
        }
    };

    const isFavorite = (formationId: string): boolean => {
        return profile?.favoriteIds.includes(formationId) ?? false;
    };

    return (
        <UserProfileContext.Provider value={{ profile, loading, login, loginByName, createProfile, updateProfile, logout, toggleFavorite, isFavorite }}>
            {children}
        </UserProfileContext.Provider>
    );
}
