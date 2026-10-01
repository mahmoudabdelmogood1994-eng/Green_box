'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wrench, Globe } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from "@/context/language-context";
import { translations } from "@/lib/translations";

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <Wrench className="h-6 w-6 text-primary" />
      <h1 className="text-xl md:text-2xl font-semibold">{t[title] || title}</h1>
      <div className="ml-auto flex items-center gap-4">
        <LanguageSwitcher />
        <Avatar>
          <AvatarImage src="https://picsum.photos/seed/user/40/40" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
