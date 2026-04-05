import type { SupabaseClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  display_name: string
  created_at: string
}

export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertByEmail(email: string): Promise<User> {
    const displayName = email.split('@')[0]
    const { data, error } = await this.supabase
      .from('users')
      .upsert({ email, display_name: displayName }, { onConflict: 'email' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as User
  }

  async findById(id: string): Promise<User> {
    const { data, error } = await this.supabase.from('users').select('*').eq('id', id).single()

    if (error) throw new Error(error.message)
    return data as User
  }
}
