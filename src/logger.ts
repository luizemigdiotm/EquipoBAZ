export const authLogger = (event: string, ...args: any[]) => {
    console.log(`[Supabase Auth Event: ${event}]`, ...args);
};
