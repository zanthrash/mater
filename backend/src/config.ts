function required(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export const config = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseKey: required('SUPABASE_SERVICE_KEY'),
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
}
