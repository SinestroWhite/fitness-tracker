import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldX } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Няма достъп</CardTitle>
          <CardDescription>Нямате необходимите права за достъп до тази страница</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full cursor-pointer">
            <Link href="/dashboard">Обратно към началото</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
