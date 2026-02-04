
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://jenvvvneuewxazcdsdei.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbnZ2dm5ldWV3eGF6Y2RzZGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjkxNDEsImV4cCI6MjA4NDAwNTE0MX0.KFQZYLI73HTnoXR38PQqf3Q3DFFz0G0LGkbbnYjQAa0";

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    // Search for users with "John" in their name or email
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%John%');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log("Found Users:", data);
}

checkUser();
