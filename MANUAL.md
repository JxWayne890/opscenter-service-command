# OpsCenter User Manual & Tutorial Script
## A Dog's World — Operations Platform

---

## GETTING STARTED

### Logging In

1. Go to the app URL in your browser
2. You will see the sign-in screen
3. Enter your email address and password
4. Click "Sign In"
5. If you do not have an account, click "Create Account" to register
6. If your manager gave you an invite code, click "Have an Invite?" and enter the code

**Invite Codes:**
- Staff members use a 6-character code from their manager
- This links your account to the organization automatically

---

## NAVIGATION

### Desktop (Sidebar)

The sidebar is on the left side of the screen. From top to bottom:

1. **Pulse Dashboard** (Home icon) — Your main overview screen
2. **Schedule & Shifts** (Calendar icon) — View and manage the weekly schedule
3. **Time Clock** (Clock icon) — Clock in, clock out, take breaks

Then after the divider:

4. **Clients & Pets** (Dog icon) — Client and pet directory
5. **Staff Roster / My Timesheet** (People icon) — Staff list and timesheets
6. **Knowledge Hub** (Book icon) — SOPs, procedures, and FAQs
7. **Accountability** (Clipboard icon) — Daily checklists
8. **Communications** (Send icon) — Team and client messaging

Managers also see:

9. **Settings** (Gear icon) — Organization settings
10. **Financial** (Trend icon) — Revenue, payroll, and scenario planning
11. **Analytics** (Chart icon) — Weekly performance metrics

At the bottom:

12. **Sign Out** (Door icon) — Log out of your account

### Mobile (Bottom Dock)

The bottom dock shows:
- **Pulse** and **Schedule** on the left
- **OpsPilot AI** button in the center (the sparkle icon)
- **Time Clock** and **Menu** on the right

Tap the Menu button to access all other pages.

---

## PAGE BY PAGE GUIDE

---

### 1. PULSE DASHBOARD

**What it does:** Your at-a-glance view of everything happening right now.

**What you will see at the top (managers only):**

Three summary cards:
- **Staff On Duty** — How many people are currently clocked in
- **Today's Shifts** — How many shifts are scheduled today, plus how many are still open and unfilled
- **Coverage Ratio / Active Clients** — If staffing ratios are configured, shows the staff-to-dog ratio. Otherwise shows total active clients.

**Alert Section (managers only):**
- Shows any critical or warning alerts (understaffed, late clock-ins, missed shifts, medical flags, overtime risk)
- Each alert has a color: red for critical, amber for warning, blue for info
- Click an alert to go to the relevant page

**My Status Card (left column):**
- Shows whether you are clocked in, off clock, or on lunch
- If clocked in, shows a live timer counting your shift duration
- If on break, shows break duration with an amber indicator
- **Start Shift** button — clocks you in (will warn you if you are not scheduled or clocking in early)
- **End Shift** button — clocks you out

**Next Shift Info:**
- If you are not clocked in, shows when your next scheduled shift is
- Shows the date and start time

**Performance Widget (below My Status):**
- **Team Today** tab (managers) — Shows shift completion percentage for the whole team as colored grid blocks. Hover over each block to see the staff member's name and percentage.
- **History** tab — Shows your personal 14-day attendance history as a grid. Green equals perfect, lighter equals partial, red equals missed, gray equals off duty.

**Live Roster (center column):**
- Shows everyone currently clocked in with a green dot
- Filter tabs: All, Manager, Staff
- Each person shows their name, role, and status (Active or On Break)
- Click a person's name to view their timesheet details

**OpsPilot AI (right column):**
- Quick chat with the AI assistant
- Click a suggested question or type your own
- Can answer questions about who is working, schedules, hours, dogs, and SOPs

**Quick Links (below OpsPilot):**
- **Knowledge Hub** — Jump to SOPs and procedures
- **Comms Hub** — Jump to team messaging

---

### 2. SCHEDULE & SHIFTS

**What it does:** View, create, and manage the weekly work schedule.

**Top Controls:**
- **Arrow buttons** — Navigate between weeks
- **Publish Schedule** button — Makes draft shifts visible to staff
- **Repeat/Extend** button — Copy the current week's pattern forward
- **Templates** button — Open saved schedule templates
- **Undo** button — Reverse your last change

**The Calendar Grid:**
- 7 columns for Monday through Sunday
- Each row represents a staff member
- Shift blocks show the start time, end time, and role type
- Color coded: indigo for general, amber for kitchen, purple for management, etc.

**Coverage Indicators:**
- Each day column shows a dot or bar at the top
- Green equals fully staffed, no open shifts
- Amber equals 1-2 open shifts
- Red equals 3+ open shifts or understaffed

**Problem Days Bar (managers):**
- Shows upcoming days with staffing issues
- Appears as pill badges like "Sat 4/12 — 3 open"

**Creating a Shift:**
- Click the + button on any day/staff cell
- Fill in: date, start time, end time, staff member, role type
- Click Save

**Editing a Shift:**
- Click any existing shift block
- Modify the details and save
- Or drag it to a different day

**Open Shifts:**
- Shifts with no assigned staff member show as "Open"
- Urgent badge appears if shift starts within 24 hours

**Shift Exchange Board:**
- Staff can offer their shifts for swap
- Other staff can claim available shifts
- Managers approve or deny swap requests

---

### 3. TIME CLOCK

**What it does:** Clock in and out, take breaks, and track attendance.

**Today's Attendance Summary (managers only):**
- Lists every scheduled shift for today
- Shows each person's status:
  - **Clocked In** (green) — On duty
  - **Late** (amber) — Clocked in after scheduled start, shows minutes late
  - **Missed** (red) — Shift started and no clock-in recorded
  - **Upcoming** (gray) — Shift has not started yet

**Punch Pad:**
- Large clock display showing current time
- **Start Shift** button — Clock in. Shows your location for verification.
- **End Shift** button — Clock out when your shift is done.
- **Start Break** / **End Break** buttons — Track your lunch or break time.

**Attendance Badge:**
- When you clock in, a badge appears showing:
  - **On Time** (green) — Within 5 minutes of your scheduled start
  - **Early** (blue) — More than 15 minutes before your scheduled start
  - **Late** (amber) — After your scheduled start, with minutes shown
  - **Unscheduled** (gray) — No shift found for today

**Accountability Message:**
- If you are clocking in late, a message appears: "You are clocking in X minutes after your scheduled start time of [time]"

**Quick Action Buttons:**
- **Request Time Off** — Opens a form to submit PTO, sick time, etc.
- **Update Availability** — Set your preferred working days and hours

**Recent Activity:**
- Shows your last 5 clock-in/clock-out entries
- Each entry shows the date, times, break duration, and attendance badge

---

### 4. CLIENTS & PETS

**What it does:** Manage pet owners and their dogs with operational details.

**Today's Dogs Section (top of page):**
- Shows all pets with important flags
- **Medical alerts** — Red badges (allergies, medications, conditions)
- **Behavior tags** — Amber badges (reactive, anxious, etc.)
- **Dietary restrictions** — Blue badges (special food, feeding schedule)
- Each pet shows: name, breed, owner name, assigned staff member
- Pets with medical alerts sort to the top

**Check-In / Check-Out:**
- Toggle button per pet: "Check In" or "Check Out"
- Checked-in pets show a green "In Facility" badge
- Checked-out pets show "Departed"
- Counter at top shows total dogs in facility

**Filter Bar:**
- All | In Facility | Medical Alerts | Behavior Flags

**Client List:**
- Search bar to find clients by name or pet name
- Each client card shows: name, pet count, contact info, status
- Click a client to see their full details and pets

**Adding a Client:**
- Click the + button
- Fill in: name, email, phone, address, emergency contact, vet info
- Add pets with: name, breed, age, weight, medical alerts, behavior tags, dietary restrictions, feeding instructions
- Can add multiple pets per client

---

### 5. STAFF ROSTER / MY TIMESHEET

**What it does:** Manage staff and review timesheets and payroll.

**For Staff:** Shows as "My Timesheet" with your own time entries and pay information.

**For Managers:** Shows as "Staff Roster" with tabs:

**Roster Tab:**
- List of all staff members
- Shows: name, role, weekly hours, hourly rate, status
- Click a person to view/edit their profile
- Manage schedule patterns, hourly rates, and status

**Timesheets Tab:**
- Time entry table with: date, clock in/out, breaks, net hours, status
- Schedule vs Actual column — Shows how actual hours compare to scheduled hours
- Overtime risk indicator: amber "Approaching OT" (35+ hours), red "Overtime" (40+ hours)
- Filter by staff member
- Add manual entries for corrections

**Requests Tab:**
- Time off requests from staff
- Approve or deny with notes

**Payroll Tab (managers only):**
- Period navigation (weekly, biweekly, or monthly based on settings)
- Staff list with hours worked, gross pay, and status
- Approve individual or bulk approve pay stubs
- Download/preview pay stub details
- Week-over-week labor cost comparison

---

### 6. KNOWLEDGE HUB

**What it does:** Searchable library of SOPs, procedures, and FAQs.

**Search Bar:**
- Type to filter entries by title, content, or tags
- Results update in real time

**Entry Cards:**
- Organized in a 3-column grid
- Each card shows: category badge, title, and content preview
- Critical procedures show a red border and "Critical" badge
- Click to view the full entry

**Critical Procedures Section:**
- Critical entries appear in a separate section at the top
- These are highlighted for immediate visibility

**Creating SOPs (managers only):**
- Click "+ Create SOP"
- Fill in: category, title, content, tags
- Mark as critical if it is a non-negotiable procedure

---

### 7. ACCOUNTABILITY (CHECKLISTS)

**What it does:** Daily checklists to make sure nothing gets missed. This is the staff follow-through system.

**Summary Cards at the Top:**
- **Today's Checklists** — Total number assigned for today
- **Pending** — How many still need completing
- **Completion** — Percentage complete (shows "--" if nothing assigned)
- **Required Items** — Count of non-negotiable items still incomplete

**Three Tabs:**

**Today's Tasks Tab:**
- Shows all checklists assigned for today
- Each checklist shows: template name, shift type badge, assigned person, completion progress bar
- Click to expand and see all items
- Check off items as you complete them — your name and timestamp are recorded
- Items marked "Required" (shield icon) are highlighted in amber and must be completed
- Progress bar fills as items are checked off
- Checklist status changes: Pending, In Progress, Complete

**Templates Tab (managers):**
- View all checklist templates
- Default templates included: Morning Opening, Evening Closing, Overnight Checks
- Each template shows: shift type, item count, and preview of first 4 items
- Edit or delete templates
- Create new templates with custom items

**History Tab:**
- Date picker to review past checklists
- Daily summary showing: checklists completed, items done, completion rate
- Individual checklist details with timestamps
- Missed required items highlighted in red

**Assigning Checklists (managers):**
- Click "Assign Checklist"
- Select a template, a staff member, and a date
- The checklist appears in that person's Today's Tasks

**Creating Templates (managers):**
- Click "New Template"
- Name the template and select shift type (morning, afternoon, evening, overnight, any)
- Add items one by one
- Mark items as "Required" (non-negotiable) with the shield checkbox
- Required items are highlighted and must be completed before the checklist can be marked done

---

### 8. COMMUNICATIONS

**What it does:** Internal messaging between team members and clients.

**Tabs:** All | Team | Clients

**Conversation List (left side):**
- Search conversations
- Each thread shows: person's name, avatar, last message preview, timestamp
- Urgent messages show a red "Urgent" badge and red left border
- Unread messages show a blue dot
- "Needs Response" indicator appears on messages unanswered for 4+ hours

**Message Thread (right side):**
- Your messages appear on the right in blue
- Other person's messages appear on the left in gray
- Images can be sent and viewed inline (click to enlarge)
- Timestamps shown on each message

**Sending Messages:**
- Type in the text field at the bottom
- Click the send button or press Enter
- Attach images with the image button
- Mark a message as "Urgent" with the priority toggle

**Bulk Actions:**
- Toggle selection mode
- Select multiple conversations
- Delete selected conversations

---

### 9. SETTINGS (Managers Only)

**What it does:** Configure your organization's settings.

**Organization Details:**
- Company name
- Industry
- Timezone

**Staff Management:**
- Invite new staff with invite codes
- Set roles (staff, manager)
- Manage hourly rates

**Service Types:**
- Configure services: boarding, daycare, training, grooming
- Set rates and rate units (per night, per day, per session, per hour)
- Activate or deactivate services

**Pay Period Configuration:**
- Set pay period type: weekly, biweekly, or monthly
- Set pay period start day

---

### 10. FINANCIAL (Managers Only)

**What it does:** Revenue tracking, breakeven analysis, and financial planning.

**Month Navigation:**
- Arrow buttons to move between months

**Snapshot Overview:**
- Total revenue breakdown by service type
- Total payroll costs
- Profit/loss calculation
- Margin percentage

**Boarding Calculator:**
- Project revenue based on occupancy and nightly rate
- Adjust variables to see projections

**Scenario Planner:**
- "What if" tool: adjust pay rates, add staff, change boarding volume
- See how changes affect your bottom line
- Compare scenarios against actual numbers

---

### 11. ANALYTICS (Managers Only)

**What it does:** Weekly performance metrics and team insights.

**Key Metrics (4 cards):**
- **Total Hours** — All staff hours this week (shows "--" if no activity)
- **Est. Payroll** — Estimated payroll cost (shows "--" if no data)
- **Utilization** — Percentage of active staff who clocked in this week
- **Overtime** — Count of staff in overtime or approaching 40 hours

**Top Hours This Week:**
- Ranked list of staff by hours worked
- Shows overtime badges (red "OT" or amber "!")
- Shows gross pay per person

**Schedule Overview:**
- Total shifts scheduled this week
- Published/approved shifts count
- Open/unassigned shifts count
- Average hours per employee

**Quick Stats:**
- Active staff count
- Total clients
- Pay stubs count
- Pay period type

---

### 12. OPSPILOT AI ASSISTANT

**What it does:** Ask questions and get instant answers about your operation.

**How to access:**
- Desktop: Chat widget on the Pulse Dashboard
- Mobile: Tap the sparkle button in the center of the bottom dock

**What you can ask:**
- "Who is working today?"
- "What shifts are open?"
- "How many hours have I worked?"
- "Are we properly staffed right now?"
- "Who is late or missing today?"
- "Any dogs with medical alerts?"
- "What is the closing procedure?"
- "Who is approaching overtime this week?"

**Two Tabs:**
- **Chat** — Type or tap a question to get an answer
- **Questions** — Browse all available questions organized by category

**How it works:**
- Answers come from your live data (schedules, time entries, staff, clients, knowledge base)
- Manager questions (payroll, overtime, financial) are only available to managers
- Sessions auto-clear after 30 minutes of inactivity

---

## QUICK REFERENCE

| I need to... | Go to... |
|---|---|
| Clock in or out | Time Clock |
| See who is working | Pulse Dashboard (Live Roster) |
| Check today's schedule | Schedule & Shifts |
| Request time off | Time Clock, then "Request Time Off" |
| Find a dog's medical info | Clients & Pets (Today's Dogs section) |
| Complete my daily checklist | Accountability |
| Message a coworker | Communications |
| Look up a procedure | Knowledge Hub or ask OpsPilot |
| Check my hours | My Timesheet |
| See if we are understaffed | Pulse Dashboard (health bar and alerts) |
| Review payroll | Staff Roster, Payroll tab (managers) |
| Plan finances | Financial (managers) |
