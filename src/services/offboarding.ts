
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { SupabaseService } from './db';
import { supabase } from './supabase';

const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
            return JSON.stringify(val); // Handle commas/quotes
        }).join(','))
    ];
    return csvRows.join('\n');
};

export const OffboardingService = {
    async downloadBulkArchive(staffMembers: { id: string, name: string }[]) {
        const zip = new JSZip();

        // Process sequentially to be nice to the DB
        for (const staff of staffMembers) {
            const folder = zip.folder(staff.name.replace(/[^a-z0-9]/gi, '_'));
            if (folder) {
                await this.addStaffToZip(folder, staff.id, staff.name);
            }
        }

        const date = new Date().toISOString().split('T')[0];
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `bulk_offboarding_${date}.zip`);
        return true;
    },

    // Helper to add files to a generic zip container (root or folder)
    async addStaffToZip(zipContainer: JSZip, staffId: string, staffName: string) {
        const [profile] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', staffId).single(),
        ]);

        const { data: timeEntries } = await supabase.from('time_entries').select('*').eq('user_id', staffId);
        const { data: shifts } = await supabase.from('shifts').select('*').eq('user_id', staffId);
        const { data: payStubs } = await supabase.from('pay_stubs').select('*').eq('user_id', staffId);
        const { data: requests } = await supabase.from('time_off_requests').select('*').eq('user_id', staffId);

        if (profile.data) zipContainer.file(`${staffName}_profile.csv`, convertToCSV([profile.data]));
        if (timeEntries && timeEntries.length) zipContainer.file('timesheets.csv', convertToCSV(timeEntries));
        if (shifts && shifts.length) zipContainer.file('shifts.csv', convertToCSV(shifts));
        if (payStubs && payStubs.length) zipContainer.file('pay_stubs.csv', convertToCSV(payStubs));
        if (requests && requests.length) zipContainer.file('requests.csv', convertToCSV(requests));
    },

    /**
     * Generates a ZIP file containing all records for a staff member.
     */
    async downloadStaffArchive(staffId: string, staffName: string) {
        const zip = new JSZip();
        // Use helper
        await this.addStaffToZip(zip, staffId, staffName);

        const safeName = staffName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${safeName}_full_records.zip`);
        return true;
    },

    async nukeStaffMembers(staffIds: string[]) {
        console.log(`[Offboarding] Nuking ${staffIds.length} staff members...`);
        const results = await Promise.all(staffIds.map(id => this.nukeStaffMember(id)));
        return results.every(Boolean);
    },

    /**
     * Permanently deletes a staff member and all related records.
     */
    async nukeStaffMember(staffId: string) {
        console.log(`[Offboarding] Nuking staff member ${staffId}...`);

        // We delete children first to avoid constraints (though Cascade might be on, explicit is safer)
        await supabase.from('time_entries').delete().eq('user_id', staffId);
        await supabase.from('shifts').delete().eq('user_id', staffId);
        await supabase.from('time_off_requests').delete().eq('user_id', staffId);
        await supabase.from('shift_swaps').delete().or(`requester_id.eq.${staffId},recipient_id.eq.${staffId}`);
        await supabase.from('pay_stubs').delete().eq('user_id', staffId);
        await supabase.from('invitations').delete().eq('email', (await supabase.from('profiles').select('email').eq('id', staffId).single()).data?.email);

        // Finally, the Profile
        const { error } = await supabase.from('profiles').delete().eq('id', staffId);

        if (error) {
            console.error('Failed to delete profile:', error);
            throw error;
        }

        return true;
    }
};
