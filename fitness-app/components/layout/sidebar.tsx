"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Dumbbell,
  UserCheck,
  UserPlus,
  Activity,
  Calendar,
  ClipboardList,
  CalendarDays,
  BookOpen,
  UtensilsCrossed,
  Apple,
  Utensils,
  MessageSquare,
  Calculator,
} from "lucide-react";

const navigation = [
  {
    name: "Табло",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["user", "trainer", "admin"],
  },
  {
    name: "Моят профил",
    href: "/profile",
    icon: User,
    roles: ["user", "trainer", "admin"],
  },
  {
    name: "Прогрес",
    href: "/progress",
    icon: TrendingUp,
    roles: ["user"],
  },
  {
    name: "Разписание",
    href: "/schedule",
    icon: CalendarDays,
    roles: ["user"],
  },
  {
    name: "Моето хранене",
    href: "/nutrition",
    icon: Utensils,
    roles: ["user"],
  },
  {
    name: "Хранителен график",
    href: "/nutrition-schedule",
    icon: Apple,
    roles: ["user"],
  },
  {
    name: "Избери треньор",
    href: "/select-trainer",
    icon: UserPlus,
    roles: ["user"],
  },
  {
    name: "Калкулатор",
    href: "/calculator",
    icon: Calculator,
    roles: ["user", "trainer"],
  },
  {
    name: "Моите ревюта",
    href: "/reviews",
    icon: MessageSquare,
    roles: ["trainer"],
  },
  {
    name: "Упражнения",
    href: "/exercises",
    icon: Activity,
    roles: ["trainer", "admin"],
  },
  {
    name: "Тренировки",
    href: "/sessions",
    icon: Calendar,
    roles: ["trainer", "admin"],
  },
  {
    name: "Тренировъчни планове",
    href: "/workout-plans",
    icon: ClipboardList,
    roles: ["trainer", "admin"],
  },
  {
    name: "Храни",
    href: "/meals",
    icon: UtensilsCrossed,
    roles: ["trainer", "admin"],
  },
  {
    name: "Хранителни планове",
    href: "/nutrition-plans",
    icon: BookOpen,
    roles: ["trainer", "admin"],
  },
  // {
  //   name: "Тренировки",
  //   href: "/workouts",
  //   icon: Dumbbell,
  //   roles: ["trainer", "user"],
  // },
  {
    name: "Клиенти",
    href: "/clients",
    icon: UserCheck,
    roles: ["trainer"],
  },
  {
    name: "Потребители",
    href: "/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    name: "Настройки",
    href: "/settings",
    icon: Settings,
    roles: [],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    // tell RequireAuth this was an explicit logout
    sessionStorage.setItem("logoutIntent", "1");
    try {
      await logout();
    } finally {
      router.replace("/login"); // ✅ no ?reason, so no banner
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r-1 border-gray-500 bg-transperant backdrop-blur-md">
      <div className="flex h-16 items-center px-6 border-b-1 border-gray-500">
        <h1 className="text-xl text-secondary font-bold">FitJourney</h1>
      </div>

      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full text-secondary cursor-pointer justify-start group", // 👈 add group here
                    isActive && "bg-secondary text-primary"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 text-secondary group-hover:text-primary",
                      isActive && "text-primary"
                    )}
                  />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t-1 border-gray-500 p-4">
        <div className="mb-4 px-2">
          <p className="text-sm text-secondary font-medium">{user.name}</p>
          <p className="text-xs text-secondary">{user.email}</p>
          <p className="text-xs text-secondary capitalize">
            {user.role === "user" && "Потребител"}
            {user.role === "trainer" && "Треньор"}
            {user.role === "admin" && "Администратор"}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full text-secondary cursor-pointer justify-start  hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Изход
        </Button>
      </div>
    </div>
  );
}
