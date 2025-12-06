import { createClient } from '@supabase/supabase-js';

// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE
export const supabaseUrl = 'https://tkqtinhoyagmwqdqsauf.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcXRpbmhveWFnbXdxZHFzYXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzE4NzYsImV4cCI6MjA4MDU0Nzg3Nn0.3ANv_Yus-t_D2V3QCz_Fiu2GLZgZWJXB8Wv8S1Q2TwI';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Disable auto-persistence to avoid hangs
    },
    global: {
        fetch: (...args) => fetch(...args) // Force usage of native fetch
    }
});