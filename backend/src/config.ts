export const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY ?? 'MISSING_SUPABASE_SERVICE_KEY',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? 'MISSING_ANTHROPIC_API_KEY',
}
