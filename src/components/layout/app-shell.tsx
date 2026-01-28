'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  PiggyBank, 
  Settings, 
  Menu,
  LogOut,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email?: string;
    full_name?: string;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-background border-border">
              <div className="flex h-14 items-center border-b border-border px-4">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                  <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                    <PiggyBank className="h-4 w-4 text-white" />
                  </div>
                  <span>BudgetWise</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'gradient-btn text-white'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex flex-1 items-center justify-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-white" />
              </div>
              <span>BudgetWise</span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-purple-500/20 text-purple-400">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <div className="flex items-center gap-2 p-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-background">
          <div className="flex h-14 items-center border-b border-border px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-white" />
              </div>
              <span>BudgetWise</span>
            </Link>
          </div>
          
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'gradient-btn text-white'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 hover:bg-secondary">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-purple-500/20 text-purple-400">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{user?.full_name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {user?.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile FAB for quick add */}
      <Link href="/transactions" className="fixed bottom-4 right-4 lg:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg gradient-btn border-0">
          <Plus className="h-6 w-6 text-white" />
          <span className="sr-only">Add transaction</span>
        </Button>
      </Link>
    </div>
  );
}
