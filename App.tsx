import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { MOCK_ORG } from './services/mockData';
import { ViewType } from './types';
import Sidebar, { MobileNav } from './components/Sidebar';
import Header from './components/Header';
import PulseView from './components/views/PulseView';
import KnowledgeHub from './components/views/KnowledgeHub';
import CommsHub from './components/views/CommsHub';
import RosterView from './components/views/RosterView';
import InviteStaffModal from './components/InviteStaffModal';
import ScheduleView from './components/views/ScheduleView';
import TimeClockView from './components/views/TimeClockView';
import SettingsView from './components/views/SettingsView';
import { OpsCenterProvider, useOpsCenter } from './services/store';

const DashboardContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('pulse');
  const { currentUser } = useOpsCenter();

  return (
    <div className="min-h-screen flex p-4 lg:p-6 gap-6 bg-slate-50">
      <InviteStaffModal />
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col space-y-6">
        <Header user={currentUser} org={MOCK_ORG} />
        <main className="max-w-[1600px] w-full mx-auto pb-24 lg:pb-0">
          {activeView === 'pulse' && <PulseView setActiveView={setActiveView} />}
          {activeView === 'schedule' && <ScheduleView />}
          {activeView === 'timeclock' && <TimeClockView />}
          {activeView === 'roster' && <RosterView />}
          {activeView === 'knowledge' && <KnowledgeHub />}
          {activeView === 'comms' && <CommsHub />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
      <MobileNav activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <OpsCenterProvider>
      <DashboardContent />
    </OpsCenterProvider>
  );
};

export default App;
