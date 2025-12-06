
import { createClient } from '@supabase/supabase-js';

// Config from src/supabase.ts
const supabaseUrl = 'https://tkqtinhoyagmwqdqsauf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcXRpbmhveWFnbXdxZHFzYXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzE4NzYsImV4cCI6MjA4MDU0Nzg3Nn0.3ANv_Yus-t_D2V3QCz_Fiu2GLZgZWJXB8Wv8S1Q2TwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing Supabase connection...");
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

    try {
        // Just check health or simple query
        const promise = supabase.from('profiles').select('count', { count: 'exact', head: true });
        const { count, error } = await Promise.race([promise, timeout]);

        if (error) {
            console.error("Connection error:", error);
        } else {
            console.log("Connection successful. Count result:", count);
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testConnection();
