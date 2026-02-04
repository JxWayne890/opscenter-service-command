import { createClient, AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug: Log connection status
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key loaded:', !!supabaseAnonKey);

// ==================== AUTH HELPERS ====================

export const AuthService = {
    /**
     * Sign up a new user with email and password
     */
    async signUp(email: string, password: string, metadata?: { full_name?: string }): Promise<{ user: User | null; error: string | null }> {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) {
            console.error('Sign up error:', error.message);
            return { user: null, error: error.message };
        }

        return { user: data.user, error: null };
    },

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Sign in error:', error.message);
            return { user: null, error: error.message };
        }

        return { user: data.user, error: null };
    },

    /**
     * Sign out the current user
     */
    async signOut(): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error.message);
            return { error: error.message };
        }
        return { error: null };
    },

    /**
     * Get the current session
     */
    async getSession(): Promise<Session | null> {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    /**
     * Get the current authenticated user
     */
    async getCurrentUser(): Promise<User | null> {
        const { data } = await supabase.auth.getUser();
        return data.user;
    },

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }
};
