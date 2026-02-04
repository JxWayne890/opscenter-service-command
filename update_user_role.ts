
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jenvvvneuewxazcdsdei.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbnZ2dm5ldWV3eGF6Y2RzZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjkxNDEsImV4cCI6MjA4NDAwNTE0MX0.KFQZYLI73HTnoXR38PQqf3Q3DFFz0G0LGkbbnYjQAa0";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateUserRole() {
    const userId = '99deb712-5724-463a-b47c-fb8e9179ff14'; // John W Johnson
    const { error } = await supabase
        .from('profiles')
        .update({ role: 'owner' })
        .eq('id', userId);

    if (error) {
        console.error("Error updating role:", error);
    } else {
        console.log(`Successfully updated role for user ${userId} to owner.`);
    }
}

updateUserRole();
