'use client';

import { ThalloLogo } from '@/components/ui/thallo-logo';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  PiggyBank, 
  Settings, 
  Menu,
  LogOut,
  Plus,
  CreditCard,
  Target,
  Trophy,
  Wallet,
  Brain,
  Sparkles,
  Shield,
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
import { prefetchAllData } from '@/lib/hooks/use-data';
import { MobileAppView } from '@/components/layout/mobile-app-view';
import { ChatWidget } from '@/components/chat/chat-widget';
// Ambient background is now pure CSS on body (globals.css) — no component needed

const SWIPEABLE_PATHS = [
  '/dashboard',
  '/transactions',
  '/budgets',
  '/debts',
  '/savings',
  '/credit',
  '/review',
  '/coaching',
  '/score',
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

const getNavigation = (isDemo: boolean) => [
  { name: 'Dashboard', href: isDemo ? '/demo' : '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: isDemo ? '/demo' : '/transactions', icon: Receipt },
  { name: 'Budgets', href: isDemo ? '/demo' : '/budgets', icon: Wallet },
  { name: 'Debts', href: isDemo ? '/demo' : '/debts', icon: CreditCard },
  { name: 'Savings', href: isDemo ? '/demo' : '/savings', icon: PiggyBank },
  { name: 'Credit', href: isDemo ? '/demo' : '/credit', icon: Shield },
  { name: 'Review', href: isDemo ? '/demo' : '/review', icon: Sparkles },
  { name: 'AI Coach', href: isDemo ? '/demo' : '/coaching', icon: Brain },
  { name: 'Score', href: isDemo ? '/demo' : '/score', icon: Trophy },
  { name: 'Settings', href: isDemo ? '/demo' : '/settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email?: string;
    full_name?: string;
  };
  isDemo?: boolean;
}

export function AppShell({ children, user, isDemo = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prefetched = useRef(false);

  // Prefetch all page data on first mount so navigation is instant
  useEffect(() => {
    if (!isDemo && !prefetched.current) {
      prefetched.current = true;
      prefetchAllData();
    }
  }, [isDemo]);
  
  const navigation = getNavigation(isDemo);
  const homeLink = isDemo ? '/demo' : '/dashboard';

  const isSwipeablePage = !isDemo && SWIPEABLE_PATHS.includes(pathname);
  const showMobileCube = isMobile && isSwipeablePage;

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  const handleLogout = async () => {
    if (isDemo) {
      router.push('/');
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="overflow-x-hidden relative">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md lg:hidden relative">
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
                <Link href={homeLink} className="flex items-center gap-2 font-semibold">
                  <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                    <ThalloLogo size="sm" />
                  </div>
                  <span>Thallo</span>
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
            <Link href={homeLink} className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                <ThalloLogo size="sm" />
              </div>
              <span>Thallo</span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-[#3D6B5233] text-[#5A9A74]">{initials}</AvatarFallback>
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
                <Link href={isDemo ? "/demo" : "/settings"}>
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

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border bg-background/95 backdrop-blur-sm">
          <div className="flex h-14 items-center border-b border-border px-6">
            <Link href={homeLink} className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                <ThalloLogo size="sm" />
              </div>
              <span>Thallo</span>
            </Link>
          </div>
          
          <nav data-tour="nav-menu" className="flex flex-1 flex-col gap-1 p-4">
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
                    <AvatarFallback className="text-xs bg-[#3D6B5233] text-[#5A9A74]">{initials}</AvatarFallback>
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
                  <Link href={isDemo ? "/demo" : "/settings"}>
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
        <main className="flex-1 lg:pl-64 overflow-x-hidden" style={{ minHeight: '100dvh' }}>
          {showMobileCube ? (
            <MobileAppView initialPath={pathname} />
          ) : (
            <div 
              className="p-4 lg:p-6 lg:pb-6 max-w-6xl mx-auto"
              style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Mobile FAB for quick add */}
      {!isDemo && (
        <Link href="/transactions" className="fixed bottom-4 right-4 lg:hidden z-40">
          <Button size="lg" className="h-14 w-14 rounded-full shadow-lg gradient-btn border-0">
            <Plus className="h-6 w-6 text-white" />
            <span className="sr-only">Add transaction</span>
          </Button>
        </Link>
      )}

      {/* AI Chat Widget — authenticated users only */}
      {!isDemo && <ChatWidget />}
    </div>
  );
}
