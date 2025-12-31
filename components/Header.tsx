import React from 'react';
import { Bell } from 'lucide-react';
import { Organization, Profile } from '../types';
import { useOpsCenter } from '../services/store';

interface HeaderProps {
    user: Profile;
    org: Organization;
}

const Header: React.FC<HeaderProps> = ({ user, org }) => {
    const { setInviteModalOpen } = useOpsCenter();

    return (
        <header className="flex items-center justify-between px-4 pt-4 pb-2 md:pt-0">
            <div className="flex items-center space-x-12">
                <div className="flex items-center space-x-3 md:space-x-4">
                    <img src={user.avatar_url} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-lg" alt="User Avatar" />
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center space-x-2">
                            <h3 className="text-sm md:text-base font-bold text-slate-900 leading-tight">{user.full_name?.split(' ')[1]}</h3>
                            <span className="hidden sm:inline-block text-[10px] font-bold text-slate-400 uppercase">32y tenure</span>
                        </div>
                        <p className="text-[10px] md:text-[11px] font-medium text-slate-500 leading-tight">Lead Clinician</p>
                    </div>
                </div>

                <div className="hidden lg:flex space-x-12">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Org ID</p>
                        <p className="text-sm font-bold text-slate-900">{org.slug}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Role</p>
                        <p className="text-sm font-bold text-slate-900 uppercase">Owner</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
                <div className="hidden md:flex space-x-2 bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/50">
                    <div className="px-3 py-1.5 bg-white rounded-lg shadow-sm text-[10px] font-bold uppercase">12 Nov, Wed</div>
                    <button className="p-1.5 text-slate-500"><Bell size={16} /></button>
                </div>

                {/* Mobile Action Row */}
                <div className="md:hidden flex items-center space-x-2">
                    <button className="p-2 text-slate-400 active:text-slate-600 bg-transparent active:bg-slate-100 rounded-full transition-colors">
                        <Bell size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
