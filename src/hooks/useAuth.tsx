import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  team_id: string | null;
  current_level: number;
  xp_points: number;
  current_streak: number;
  onboarding_completed: boolean;
  promo_validated: boolean;
}

export type AppRole = "owner" | "admin" | "manager" | "rep";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isLoading: boolean;
  profileLoaded: boolean;
  profileError: string | null;
  role: AppRole | null;
  canManageTeam: boolean;
  /** Backward-compatible alias — true for owner, admin, or manager. */
  isManager: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const MANAGEMENT_ROLES: readonly AppRole[] = ["owner", "admin", "manager"];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const [{ data: profileData, error: pErr }, { data: roleData, error: rErr }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (pErr) {
        console.error('[useAuth] profile fetch error', pErr);
        setProfileError(pErr.message);
      } else {
        setProfileError(null);
      }
      if (rErr) {
        console.error('[useAuth] role fetch error', rErr);
      }

      setProfile((profileData as Profile) ?? null);
      setRole((roleData?.role as AppRole | undefined) ?? null);
    } catch (err: any) {
      console.error('[useAuth] fetchProfile threw', err);
      setProfileError(err?.message ?? 'Failed to load profile');
      setProfile(null);
      setRole(null);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST, then get session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfileLoaded(false);
          // Use setTimeout to avoid Supabase deadlock on auth state change
          setTimeout(() => {
            if (mounted) fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsManager(false);
          setProfileLoaded(true);
          setProfileError(null);
        }
        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, isLoading: loading, profileLoaded, profileError, isManager, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
