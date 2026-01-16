import { Shift, StaffingRatio, StaffingRule } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface ProjectRequirements {
    startDate: Date;
    endDate: Date;
    projectedCounts: {
        daycare: number;
        boarding: number;
        suites: number;
    };
    organization_id: string;
    ratios: StaffingRatio[];
    rules: StaffingRule[];
}

export class ScheduleGenerator {
    static generate(req: ProjectRequirements): Shift[] {
        const generatedShifts: Shift[] = [];
        const { startDate, endDate, projectedCounts, organization_id, ratios } = req;

        // Normalize dates to midnight
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        for (let i = 0; i < daysDiff; i++) {
            const currentDay = new Date(start);
            currentDay.setDate(start.getDate() + i);

            // Calculate staff needed per zone based on ratios
            // Simple formula: Math.ceil(DogCount / RatioDogCount) * RatioStaffCount

            // 1. Daycare Shift (e.g., 7am - 7pm)
            const daycareRatio = ratios.find(r => r.zone_name === 'Daycare') || { staff_count: 1, dog_count: 15 };
            const daycareStaffNeeded = Math.ceil(projectedCounts.daycare / daycareRatio.dog_count) * daycareRatio.staff_count;

            for (let j = 0; j < daycareStaffNeeded; j++) {
                generatedShifts.push(this.createShift(currentDay, 7, 19, 'Handler', organization_id, 'Daycare Coverage'));
            }

            // 2. Boarding Shift (e.g., 7am - 7pm)
            const boardingRatio = ratios.find(r => r.zone_name === 'Boarding') || { staff_count: 1, dog_count: 30 };
            const boardingStaffNeeded = Math.ceil(projectedCounts.boarding / boardingRatio.dog_count) * boardingRatio.staff_count;

            for (let j = 0; j < boardingStaffNeeded; j++) {
                generatedShifts.push(this.createShift(currentDay, 7, 19, 'Kennel Attendant', organization_id, 'Boarding Coverage'));
            }

            // 3. Overnight (e.g., 7pm - 7am next day) - Fixed rule often overrides ratios?
            // Assuming a simple 2 staff fixed rule for now as per "Overnight rules" prompt
            generatedShifts.push(this.createShift(currentDay, 19, 31, 'Overnight Lead', organization_id, 'Night Watch')); // 19:00 to 07:00 (+1 day)
            generatedShifts.push(this.createShift(currentDay, 19, 31, 'Overnight Handler', organization_id, 'Night Watch'));
        }

        return generatedShifts;
    }

    private static createShift(date: Date, startHour: number, endHour: number, role: string, orgId: string, notes: string): Shift {
        const startTime = new Date(date);
        startTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(date);
        endTime.setHours(endHour, 0, 0, 0); // Handles overflow to next day automatically by Date object if hours > 24, but setHours logic acts on the specific date instance.
        // Wait, setHours(31) on Jan 1 will allow JS to wrap to Jan 2 07:00? Yes. 31 - 24 = 7.

        return {
            id: uuidv4(),
            organization_id: orgId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            role_type: role,
            status: 'draft',
            is_open: true,
            notes: notes
        };
    }
}
