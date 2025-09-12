// GradientStatCard.tsx
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react"

type Trend = {
  isPositive: boolean;
  value: number | string; // e.g. 12 or "12"
};

type Progress = {
  percent: number; // 0..100
  ringSize?: number; // px (default 64)
  trackOpacity?: number; // 0..1 (default 0.2)
  strokeWidth?: number; // default 3
  // custom center content (e.g., amount + unit)
  center?: React.ReactNode;
};

type GradientStatCardProps = {
  title: string;
  /** Emoji or icon component */
  icon: LucideIcon; // e.g. <Icon className="h-4 w-4 text-white" /> or <span>🔥</span>
  /** Tailwind gradient string or any CSS background */
  background?: string; // default teal gradient
  /** Optional: main value (for Value mode) */
  value?: React.ReactNode;
  /** Optional: description under the value */
  description?: React.ReactNode;
  /** Optional: trend line (Value mode) */
  trend?: Trend;
  /** If provided → Progress mode; if omitted → Value mode */
  progress?: Progress;

  /** Extra classNames to merge */
  className?: string;
};

export function GradientStatCard({
  title,
  icon: Icon,
  background = "linear-gradient(135deg, #1ab0b0 0%, #0d8f8f 100%)",
  value,
  description,
  trend,
  progress,
  className = "",
}: GradientStatCardProps) {
  const ringSize = progress?.ringSize ?? 64; // px
  const strokeWidth = progress?.strokeWidth ?? 3;
  const radius = 15.9155; // matches your path
  const circumference = 2 * Math.PI * radius;
  const dash = progress ? Math.max(0, Math.min(100, progress.percent)) : 0;

  return (
    <Card
      className={`rounded-lg  text-white shadow-sm bg-transperant backdrop-blur-md ${className}`}
      //style={{ background }}
    >
      <CardHeader className="flex flex-row items-center space-x-2 mb-4 pb-0">
        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
          {/* If no icon provided, keep circle for layout consistency */}
          <Icon className="h-4 w-4 text-secondary" />
        </div>
        <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
      </CardHeader>

      <CardContent className="pt-2">
        {progress ? (
          // PROGRESS MODE
          <div className="flex flex-col items-center">
            <div
              className="relative mx-auto mb-2"
              style={{ width: ringSize, height: ringSize }}
            >
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
                role="img"
                aria-label={`${dash}%`}
              >
                <path
                  d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
                  fill="none"
                  stroke={`rgba(255,255,255,${progress.trackOpacity ?? 0.2})`}
                  strokeWidth={strokeWidth}
                />
                <path
                  d={`M18 2.0845 a ${radius} ${radius} 0 0 1 0 31.831 a ${radius} ${radius} 0 0 1 0 -31.831`}
                  fill="none"
                  stroke="white"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash}, 100`}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {progress.center}
              </div>
            </div>
          </div>
        ) : (
          // VALUE MODE
          <>
            <div className="text-2xl font-bold mb-2">{value}</div>

            {description && <p className="text-sm opacity-90">{description}</p>}

            {trend && (
              <p
                className={`text-xs mt-1 ${
                  trend.isPositive ? "text-green-200" : "text-red-300"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}% от миналия месец
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
