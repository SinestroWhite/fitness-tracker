// "use client"

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
// import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
// import type { Progress } from "@/lib/api"

// interface ProgressChartProps {
//   data: Progress[]
//   type: "weight" | "bodyFat"
// }

// export function ProgressChart({ data, type }: ProgressChartProps) {
//   const chartData = data
//     .filter((entry) => (type === "weight" ? entry.weightKg : entry.bodyFat))
//     .map((entry) => ({
//       date: new Date(entry.createdAt).toLocaleDateString("bg-BG", {
//         month: "short",
//         day: "numeric",
//       }),
//       value: type === "weight" ? entry.weightKg : entry.bodyFat,
//       fullDate: entry.createdAt,
//     }))
//     .reverse()

//   const title = type === "weight" ? "Тегло" : "Мастна тъкан"
//   const unit = type === "weight" ? "кг" : "%"
//   const color = type === "weight" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"

//   if (chartData.length === 0) {
//     return (
//       <Card>
//         <CardHeader>
//           <CardTitle>{title}</CardTitle>
//           <CardDescription>Няма данни за показване</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="flex items-center justify-center h-[200px] text-muted-foreground">
//             Добавете записи за да видите графиката
//           </div>
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>{title}</CardTitle>
//         <CardDescription>Проследяване на прогреса във времето</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <ChartContainer
//           config={{
//             value: {
//               label: title,
//               color: color,
//             },
//           }}
//           className="h-[200px]"
//         >
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={chartData}>
//               <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
//               <YAxis
//                 tick={{ fontSize: 12 }}
//                 tickLine={false}
//                 axisLine={false}
//                 domain={["dataMin - 5", "dataMax + 5"]}
//               />
//               <ChartTooltip
//                 content={
//                   <ChartTooltipContent
//                     formatter={(value) => [`${value} ${unit}`, title]}
//                     labelFormatter={(label, payload) => {
//                       if (payload && payload[0]) {
//                         return new Date(payload[0].payload.fullDate).toLocaleDateString("bg-BG", {
//                           year: "numeric",
//                           month: "long",
//                           day: "numeric",
//                         })
//                       }
//                       return label
//                     }}
//                   />
//                 }
//               />
//               <Line
//                 type="monotone"
//                 dataKey="value"
//                 stroke={color}
//                 strokeWidth={2}
//                 dot={{ fill: color, strokeWidth: 2, r: 4 }}
//                 activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         </ChartContainer>
//       </CardContent>
//     </Card>
//   )
// }


"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import type { Progress } from "@/lib/api"

interface ProgressChartProps {
  data: Progress[]
  type: "weight" | "bodyFat"
}

/**
 * Малък хук за медиa заявки (без външни библиотеки).
 */
function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    onChange()
    m.addEventListener?.("change", onChange)
    return () => m.removeEventListener?.("change", onChange)
  }, [query])

  return matches
}

export function ProgressChart({ data, type }: ProgressChartProps) {
  const isSmall = useMediaQuery("(max-width: 640px)")

  const chartData = data
    .filter((entry) => (type === "weight" ? entry.weightKg != null : entry.bodyFat != null))
    .map((entry) => ({
      date: new Date(entry.createdAt).toLocaleDateString("bg-BG", {
        month: "short",
        day: "numeric",
      }),
      value: type === "weight" ? entry.weightKg : entry.bodyFat,
      fullDate: entry.createdAt,
    }))
    .reverse()

  const title = type === "weight" ? "Тегло" : "Мастна тъкан"
  const unit = type === "weight" ? "кг" : "%"
  const color = type === "weight" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Няма данни за показване</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Добавете записи, за да видите графиката
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Проследяване на прогреса във времето</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <ChartContainer
          config={{
            value: {
              label: title,
              color: color,
            },
          }}
          className="h-[220px] sm:h-[260px] md:h-[320px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 20,
                left: 4,
                bottom: isSmall ? 36 : 24,
              }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: isSmall ? 10 : 12 }}
                tickLine={false}
                axisLine={false}
                angle={isSmall ? -35 : 0}
                textAnchor={isSmall ? "end" : "middle"}
                height={isSmall ? 50 : 30}
                interval="preserveStartEnd"
                minTickGap={isSmall ? 8 : 16}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}${unit === "%" ? "" : ""}`}
                tickLine={false}
                axisLine={false}
                width={isSmall ? 28 : 36}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value} ${unit}`, title]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return new Date(payload[0].payload.fullDate).toLocaleDateString("bg-BG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      }
                      return label
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: isSmall ? 3 : 4 }}
                activeDot={{ r: isSmall ? 5 : 6, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default ProgressChart

