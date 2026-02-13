import { supabase } from './supabase';
import { FinancialInput, RevenueRecord, PayrollRecord, FinancialMonthData } from '../types';

export const FinancialService = {
    // Fetch all financial data for a specific month
    async getMonthlyData(organizationId: string, month: Date): Promise<FinancialMonthData> {
        const monthStr = month.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

        try {
            const [inputs, revenue, payroll] = await Promise.all([
                supabase
                    .from('monthly_financial_inputs')
                    .select('*')
                    .eq('organization_id', organizationId)
                    .eq('month', monthStr)
                    .single(),
                supabase
                    .from('monthly_revenue')
                    .select('*')
                    .eq('organization_id', organizationId)
                    .eq('month', monthStr)
                    .single(),
                supabase
                    .from('monthly_payroll_summary')
                    .select('*')
                    .eq('organization_id', organizationId)
                    .eq('month', monthStr)
                    .single()
            ]);

            return {
                inputs: inputs.data || null,
                revenue: revenue.data || null,
                payroll: payroll.data || null
            };
        } catch (error) {
            console.error('Error fetching financial data:', error);
            return { inputs: null, revenue: null, payroll: null };
        }
    },

    // Update or Insert Financial Inputs
    async upsertInputs(data: Partial<FinancialInput> & { organization_id: string; month: string }) {
        const { data: result, error } = await supabase
            .from('monthly_financial_inputs')
            .upsert(data, { onConflict: 'organization_id,month' })
            .select()
            .single();

        if (error) throw error;
        return result;
    },

    // Update or Insert Revenue
    async upsertRevenue(data: Partial<RevenueRecord> & { organization_id: string; month: string }) {
        const { data: result, error } = await supabase
            .from('monthly_revenue')
            .upsert(data, { onConflict: 'organization_id,month' })
            .select()
            .single();

        if (error) throw error;
        return result;
    },

    // Update or Insert Payroll (Manual Override if needed, though typically calculated)
    async upsertPayroll(data: Partial<PayrollRecord> & { organization_id: string; month: string }) {
        const { data: result, error } = await supabase
            .from('monthly_payroll_summary')
            .upsert(data, { onConflict: 'organization_id,month' })
            .select()
            .single();

        if (error) throw error;
        return result;
    }
};
