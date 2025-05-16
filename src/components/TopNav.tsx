import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Mail, Settings, Search, BookUser } from 'lucide-react'; // Assuming lucide-react is installed
import { ModeToggle } from '@/components/ui/mode-toggle';
import { UserProfileDialog } from '@/components/UserProfileDialog';

export function TopNav() {
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur px-6">
      {/* Search Bar - Adjust styling as needed */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[300px]"
        />
      </div>

      {/* Icons and User Avatar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mail className="h-5 w-5" />
          <span className="sr-only">Messages</span>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
        <ModeToggle />
        <Button variant="outline" size="icon" className="ml-2" aria-label="Edit profile" onClick={() => setProfileOpen(true)}>
          <BookUser className="h-[1.2rem] w-[1.2rem]" />
        </Button>
        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
        <Avatar className="h-9 w-9">
          {/* Replace with actual user image or fallback logic */}
          <AvatarImage src="/placeholder.svg" alt="@user" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
