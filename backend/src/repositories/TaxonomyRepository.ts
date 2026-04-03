import type { SupabaseClient } from '@supabase/supabase-js'

export interface TaxonomyEntry {
  id: string
  category: string
  type: string
  subtype: string | null
}

export interface TaxonomyTypeNode {
  type: string
  subtypes: string[]
}

export interface TaxonomyCategoryNode {
  category: string
  types: TaxonomyTypeNode[]
}

export type TaxonomyTree = TaxonomyCategoryNode[]

export class TaxonomyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAll(): Promise<TaxonomyEntry[]> {
    const { data, error } = await this.supabase
      .from('taxonomy')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch taxonomy: ${error.message}`)
    }

    return data as TaxonomyEntry[]
  }

  async getTree(): Promise<TaxonomyTree> {
    const entries = await this.getAll()

    const categoryMap = new Map<string, Map<string, string[]>>()

    for (const entry of entries) {
      if (!categoryMap.has(entry.category)) {
        categoryMap.set(entry.category, new Map())
      }
      const typeMap = categoryMap.get(entry.category)!
      if (!typeMap.has(entry.type)) {
        typeMap.set(entry.type, [])
      }
      if (entry.subtype) {
        typeMap.get(entry.type)!.push(entry.subtype)
      }
    }

    return Array.from(categoryMap.entries()).map(([category, typeMap]) => ({
      category,
      types: Array.from(typeMap.entries()).map(([type, subtypes]) => ({
        type,
        subtypes,
      })),
    }))
  }
}
