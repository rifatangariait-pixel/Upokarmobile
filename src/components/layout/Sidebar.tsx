import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Users, FileText, Banknote, FileStack, Settings, Sparkles, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

export function Sidebar() {
  const { currentUser } = useStore();

  const links = [
    { name: 'ড্যাশবোর্ড (Dashboard)', path: '/', icon: LayoutDashboard, roles: ['Admin'] },
    { name: 'স্টক ম্যানেজমেন্ট (Inventory)', path: '/inventory', icon: Smartphone, roles: ['Admin', 'SalesOfficer', 'InventoryManager'] },
    { name: 'কাস্টমার প্রোফাইল (Customers)', path: '/customers', icon: Users, roles: ['Admin', 'SalesOfficer'] },
    { name: 'ইএমআই বিক্রি (EMI Sales)', path: '/sales', icon: FileStack, roles: ['Admin', 'SalesOfficer'] },
    { name: 'কালেকশন (Collection)', path: '/collection', icon: Banknote, roles: ['Admin', 'SalesOfficer'] },
    { name: 'রিজার্ভেশন (Reservations)', path: '/reservations', icon: Inbox, roles: ['Admin'] },
    { name: 'ইউজার্স (Users)', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'রিপোর্টস (Reports)', path: '/reports', icon: FileText, roles: ['Admin'] },
    { name: 'এআই ইনসাইটস (AI Insights)', path: '/ai-insights', icon: Sparkles, roles: ['Admin'] },
    { name: 'সেটিংস (Settings)', path: '/settings', icon: Settings, roles: ['Admin'] },
  ];

  const visibleLinks = links.filter(link => !link.roles || (currentUser && link.roles.includes(currentUser.role)));

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 font-bold text-lg border-b text-primary">
        Angaria Society
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
