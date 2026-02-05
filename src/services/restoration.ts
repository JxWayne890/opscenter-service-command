import JSZip from 'jszip';
import { Profile, TimeEntry, Shift } from '../types';

/**
 * Basic CSV parser that handles quoted values and commas.
 */
const parseCSVString = (csv: string): any[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1).map(line => {
        // Simple regex to split by comma but ignore commas inside quotes
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            let val = values[i] ? values[i].replace(/^"|"$/g, '').trim() : '';
            row[header] = val;
        });
        return row;
    });
};

export const RestorationService = {
    /**
     * Parses a profile CSV and returns a partial Profile object.
     */
    parseProfileExport(csv: string): Partial<Profile> | null {
        const data = parseCSVString(csv);
        if (data.length === 0) return null;

        const row = data[0];
        return {
            id: row.id,
            full_name: row.full_name,
            email: row.email,
            role: row.role as any,
            status: row.status as any,
            hourly_rate: parseFloat(row.hourly_rate) || 0,
            avatar_url: row.avatar_url,
            organization_id: row.organization_id
        };
    },

    /**
     * Parses a timesheets CSV and returns an array of TimeEntry objects.
     */
    parseTimesheetExport(csv: string): Omit<TimeEntry, 'id'>[] {
        const data = parseCSVString(csv);
        return data.map(row => ({
            user_id: row.user_id,
            organization_id: row.organization_id,
            clock_in: row.clock_in,
            clock_out: row.clock_out,
            total_break_minutes: parseInt(row.total_break_minutes) || 0,
            status: row.status as any,
            notes: row.notes
        }));
    },

    /**
     * Parses a shifts CSV and returns an array of Shift objects.
     */
    parseShiftExport(csv: string): Omit<Shift, 'id'>[] {
        const data = parseCSVString(csv);
        return data.map(row => ({
            user_id: row.user_id,
            organization_id: row.organization_id,
            start_time: row.start_time,
            end_time: row.end_time,
            role_type: row.role_type,
            status: row.status,
            is_open: row.is_open,
            notes: row.notes
        }));
    },

    async parseZipArchive(zipBlob: Blob): Promise<any[]> {
        const zip = await JSZip.loadAsync(zipBlob);
        const files: { name: string, fullPath: string, content: string }[] = [];

        // Extract all CSV contents from zip
        for (const [path, file] of Object.entries(zip.files)) {
            if (!file.dir && path.toLowerCase().endsWith('.csv')) {
                const content = await file.async('string');
                files.push({ name: path.split('/').pop() || '', fullPath: path, content });
            }
        }

        return this.groupBulkRecords(files);
    },

    /**
     * Groups a flat list of file contents into staff restoration bundles based on directory structure.
     */
    groupBulkRecords(files: { name: string, fullPath: string, content: string }[]): any[] {
        const groups: Record<string, any> = {};

        files.forEach(file => {
            // Use parent directory as group ID, or "root" if none
            const parts = file.fullPath.split('/');
            const groupId = parts.length > 1 ? parts[parts.length - 2] : 'root';

            if (!groups[groupId]) {
                groups[groupId] = { profile: null, timesheets: [], shifts: [] };
            }

            const lowerName = file.name.toLowerCase();
            if (lowerName.includes('profile')) {
                groups[groupId].profile = this.parseProfileExport(file.content);
            } else if (lowerName.includes('timesheets')) {
                groups[groupId].timesheets = this.parseTimesheetExport(file.content);
            } else if (lowerName.includes('shifts')) {
                groups[groupId].shifts = this.parseShiftExport(file.content);
            }
        });

        // Convert to array and filter out groups without a profile
        return Object.values(groups).filter(g => g.profile !== null);
    }
};
