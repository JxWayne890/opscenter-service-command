
import { AppState, Profile, Shift, KnowledgeEntry, CommTemplate } from '../types';
import { MOCK_SHIFTS, MOCK_KB, MOCK_TEMPLATES } from './mockData';

/**
 * Service Command DB Interface
 * This is designed to be replaced by Supabase client calls.
 * All functions accept organization_id to enforce multi-tenant logic.
 */

class DatabaseService {
  async getShifts(organization_id: string): Promise<Shift[]> {
    // In real app: supabase.from('shifts').select('*').eq('organization_id', organization_id)
    return MOCK_SHIFTS.filter(s => s.organization_id === organization_id);
  }

  async getKnowledgeBase(organization_id: string): Promise<KnowledgeEntry[]> {
    // In real app: supabase.from('knowledge_entries').select('*').eq('organization_id', organization_id)
    return MOCK_KB.filter(k => k.organization_id === organization_id);
  }

  async getTemplates(organization_id: string): Promise<CommTemplate[]> {
    // In real app: supabase.from('comm_templates').select('*').eq('organization_id', organization_id)
    return MOCK_TEMPLATES.filter(t => t.organization_id === organization_id);
  }

  async clockIn(user_id: string, organization_id: string): Promise<boolean> {
    console.log(`Clocking in user ${user_id} for org ${organization_id}`);
    return true;
  }
}

export const db = new DatabaseService();
