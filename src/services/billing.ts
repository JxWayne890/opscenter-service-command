import { supabase } from './supabase';
import { ServiceType, ServiceRecord } from '../types';
import { TimeMath } from '../utils/timeMath';

const ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export const BillingService = {
  // ─── Service Types ───────────────────────────────

  async getServiceTypes(): Promise<ServiceType[]> {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('name');

    if (error) {
      console.error('Error fetching service types:', error);
      return [];
    }
    return data || [];
  },

  async upsertServiceType(serviceType: Partial<ServiceType>): Promise<ServiceType | null> {
    const payload = { ...serviceType, organization_id: ORG_ID };
    const { data, error } = await supabase
      .from('service_types')
      .upsert(payload, { onConflict: 'organization_id,name' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting service type:', error);
      return null;
    }
    return data;
  },

  async deleteServiceType(id: string): Promise<boolean> {
    const { error } = await supabase.from('service_types').delete().eq('id', id);
    return !error;
  },

  // ─── Service Records (Bookings) ──────────────────

  async getServiceRecords(filters?: { month?: string; status?: string }): Promise<ServiceRecord[]> {
    let query = supabase
      .from('service_records')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('check_in', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.month) {
      const start = `${filters.month}-01`;
      const endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + 1);
      const end = endDate.toISOString().split('T')[0];
      query = query.gte('check_in', start).lt('check_in', end);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching service records:', error);
      return [];
    }
    return data || [];
  },

  async createServiceRecord(record: Partial<ServiceRecord>): Promise<ServiceRecord | null> {
    const payload = {
      ...record,
      organization_id: ORG_ID,
      total_amount: (record.quantity || 1) * (record.unit_rate || 0),
    };

    const { data, error } = await supabase
      .from('service_records')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating service record:', error);
      return null;
    }
    return data;
  },

  async completeServiceRecord(id: string, checkOut: string, quantity: number): Promise<boolean> {
    const { data: record } = await supabase
      .from('service_records')
      .select('unit_rate')
      .eq('id', id)
      .single();

    const totalAmount = quantity * (record?.unit_rate || 0);

    const { error } = await supabase
      .from('service_records')
      .update({
        check_out: checkOut,
        quantity,
        total_amount: totalAmount,
        status: 'completed',
      })
      .eq('id', id);

    return !error;
  },

  async cancelServiceRecord(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('service_records')
      .update({ status: 'cancelled', total_amount: 0 })
      .eq('id', id);
    return !error;
  },

  // ─── Revenue Aggregation ─────────────────────────

  /**
   * Calculates actual revenue from service records for a given month.
   * Returns breakdown by category.
   */
  async getMonthlyRevenue(month: string): Promise<{
    boarding: number;
    daycare: number;
    training: number;
    grooming: number;
    other: number;
    total: number;
    recordCount: number;
  }> {
    const records = await this.getServiceRecords({ month });
    const completed = records.filter(r => r.status === 'completed' || r.status === 'active');

    const revenue = { boarding: 0, daycare: 0, training: 0, grooming: 0, other: 0, total: 0, recordCount: completed.length };

    completed.forEach(r => {
      const amount = r.total_amount || 0;
      const cat = r.service_category as keyof typeof revenue;
      if (cat in revenue && cat !== 'total' && cat !== 'recordCount') {
        (revenue as any)[cat] += amount;
      }
      revenue.total += amount;
    });

    return revenue;
  },

  /**
   * Calculates actual payroll from time entries for a given month.
   */
  calculateMonthlyPayroll(
    timeEntries: Array<{ clock_in: string; clock_out?: string | null; total_break_minutes: number; status?: string }>,
    staff: Array<{ id: string; hourly_rate?: number }>,
    month: string
  ): { totalCost: number; totalHours: number } {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    let totalHours = 0;
    let totalCost = 0;

    const monthEntries = timeEntries.filter(e =>
      new Date(e.clock_in) >= start && new Date(e.clock_in) < end && e.clock_out
    );

    const staffMap = new Map(staff.map(s => [s.id, s.hourly_rate || 0]));

    monthEntries.forEach((e: any) => {
      const netMS = TimeMath.calculateNetDurationMS(e.clock_in, e.clock_out, e.total_break_minutes);
      const hours = TimeMath.msToDecimalHours(netMS);
      totalHours += hours;
      totalCost += hours * (staffMap.get(e.user_id) || 0);
    });

    return { totalCost, totalHours };
  },
};
