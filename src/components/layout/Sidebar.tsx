import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, FileText, Banknote, FileStack, Settings, Sparkles, Inbox, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { hasPermission } from '../../utils/permissions';
import { AppPermission } from '../../types';

export function Sidebar() {
  const { currentUser } = useStore();

  const links: { name: string; path: string; icon: any; permission: AppPermission }[] = [
    { name: 'ড্যাশবোর্ড (Dashboard)', path: '/', icon: LayoutDashboard, permission: 'Dashboard' },
    { name: 'স্টক (New Phone)', path: '/inventory/new', icon: Smartphone, permission: 'New Phone Stock' },
    { name: 'স্টক (Diamond Phone)', path: '/inventory/used', icon: Smartphone, permission: 'Diamond Phone Stock' },
    { name: 'কাস্টমার প্রোফাইল (Customers)', path: '/customers', icon: Users, permission: 'Customer Management' },
    { name: 'বিক্রি (New Phone)', path: '/sales/new', icon: FileStack, permission: 'Sales' },
    { name: 'বিক্রি (Diamond Phone)', path: '/sales/used', icon: FileStack, permission: 'Sales' },
    { name: 'কালেকশন (Collection)', path: '/collection', icon: Banknote, permission: 'Payments' },
    { name: 'রিজার্ভেশন (Reservations)', path: '/reservations', icon: Inbox, permission: 'Reservations' },
    { name: 'ইউজার্স (Users)', path: '/users', icon: Users, permission: 'User Management' },
    { name: 'দৈনিক রিপোর্ট (Daily)', path: '/daily-report', icon: FileText, permission: 'Daily Report' },
    { name: 'রিপোর্ট (New Phone)', path: '/reports/new', icon: FileText, permission: 'New Phone Report' },
    { name: 'রিপোর্ট (Diamond Phone)', path: '/reports/used', icon: FileText, permission: 'Diamond Phone Report' },
    { name: 'রিপোর্ট (Combined)', path: '/reports/combined', icon: FileText, permission: 'Combined Report' },
    { name: 'Diamond Secret Report', path: '/diamond-secret-report', icon: Lock, permission: 'Diamond Secret Report' },
    { name: 'এআই ইনসাইটস (AI)', path: '/ai-insights', icon: Sparkles, permission: 'AI Assistant' },
    { name: 'সেটিংস (Settings)', path: '/settings', icon: Settings, permission: 'Settings' },
  ];
  
  console.log("Current User:", currentUser);
  console.log("Role:", currentUser?.role);
  console.log("Custom Permissions:", currentUser?.custom_permissions);
  const visibleLinks = links.filter(link => hasPermission(currentUser, link.permission));

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full shrink-0">
      <div className="h-20 flex flex-col justify-center px-6 border-b text-primary">
        <span className="font-bold text-2xl tracking-wider">উপকার</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">আঙ্গারিয়া ক্ষুদ্র ব্যবসায়ী সমবায়<br/>সমিতির অঙ্গসংগঠন</span>
      </div>
      <div className="flex-1 overflow-auto py-4 px-3 flex flex-col gap-1">
        {visibleLinks.map(link => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className="w-4 h-4" />
            {link.name}
          </NavLink>
        ))}
      </div>
      <div className="p-4 border-t text-xs text-muted-foreground text-center">
        Powered by AI Studio
      </div>
    </aside>
  );
}
