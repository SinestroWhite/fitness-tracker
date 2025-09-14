// "use client"

// import { useEffect } from "react"
// import { useRouter } from "next/navigation"
// import { useAuth } from "@/contexts/auth-context"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import Link from "next/link"

// export default function HomePage() {
//   const { user, loading } = useAuth()
//   const router = useRouter()

//   useEffect(() => {
//     if (!loading && user) {
//       router.push("/dashboard")
//     } else {
//       router.replace("/login");
//     }
//   }, [user, loading, router])

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//       </div>
//     )
//   }

//   if (user) {
//     return null // Will redirect to dashboard
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <Card className="w-full max-w-md text-center">
//         <CardHeader className="space-y-4">
//           <CardTitle className="text-3xl font-bold">FitJourney</CardTitle>
//           <CardDescription className="text-lg">
//             Проследявайте своя фитнес прогрес и постигайте целите си
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <Button asChild className="w-full cursor-pointer" size="lg">
//             <Link href="/login">Влез в профила си</Link>
//           </Button>
//           <Button asChild variant="outline" className="w-full bg-transparent cursor-pointer" size="lg">
//             <Link href="/register">Създай нов профил</Link>
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  CheckCircle,
  Search,
} from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-secondary">
        {/* Main navigation */}
        <div className="relative">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <div className="flex items-center gap-2">

                <span className="text-2xl font-bold text-secondary">FitJourney</span>
              </div>


              <div className="flex items-center gap-4">
          <Button onClick={()=> router.push("/login")} className="px-4 py-2 rounded bg-secondary text-primary font-semibold hover:bg-gray-100">
            ВХОД
          </Button>
        </div>

            </div>
          </div>
        </div>
      </header>

      <section className="relative min-h-screen flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg" // file at /public/hero.jpg
            alt="Fitness Gym Background"
            fill // makes it cover the container
            sizes="100vw"
            priority
            style={{ objectFit: "cover" }}
          />
          <div className="absolute inset-0 bg-primary/50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Welcome Text */}
            <div className="mb-6">
              <span className="text-red-500 font-bold text-lg tracking-wider uppercase">
                ЗА ВСИЧКИ КОИТО ИСКАТ ДА СПОРТУВАТ
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-secondary mb-6 leading-tight">
              „Твоят личен треньор – в джоба ти“
            </h1>

            {/* Description */}
            <p className="text-secondary/90 text-lg mb-8 max-w-xl leading-relaxed">
              Регистрирай се, избери своя треньор и получи персонализиран
              хранителен режим и тренировъчна програма. Всичко на едно място –
              за да постигнеш целите си по най-удобния начин.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button onClick={()=> router.push("/register")} className="bg-secondary hover:bg-primary/90 hover:text-secondary text-primary px-8 py-6 text-lg font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Регистрирайте се
              </Button>
              {/* <Button className="bg-red-600 hover:bg-red-700 text-secondary px-8 py-4 text-lg font-semibold">
                Learn More
              </Button> */}
            </div>
          </div>

        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* Left side - Navy background with content */}
          <div className="bg-primary text-secondary p-12 lg:p-16 flex flex-col justify-center relative">
            {/* Diagonal cut effect */}
            <div className="absolute top-0 right-0 w-32 h-full bg-red-600 transform skew-x-12 translate-x-16"></div>

            <div className="relative z-10">
              <span className="text-red-500 font-bold text-sm tracking-wider uppercase mb-4 block">
                ЗА ПРИЛОЖЕНИЕТО
              </span>

              <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Как работи приложението
              </h2>

              <div className="mb-8">
                <ul className="list-inside text-secondary space-y-4">
                  <li>
                    <p className="font-semibold">1. Регистрация</p>
                    <p className=" text-gray-300">
                      Създаваш профил бързо и лесно.
                    </p>
                  </li>
                  <li>
                    <p className="font-semibold">2. Избор на треньор</p>
                    <p className=" text-gray-300">
                      Разглеждаш профилите на сертифицирани специалисти.
                    </p>
                  </li>
                  <li>
                    <p className="font-semibold">3. Персонален план</p>
                    <p className=" text-gray-300">
                      Треньорът ти изготвя индивидуален хранителен режим и
                      тренировъчна програма.
                    </p>
                  </li>
                  <li>
                    <p className="font-semibold">4. Проследяване на прогреса</p>
                    <p className=" text-gray-300">
                      Отбелязваш резултатите си.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
              <Button onClick={()=> router.push("/register")} className="bg-secondary hover:bg-primary/90 hover:text-secondary text-primary px-8 py-6 text-lg font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Регистрирайте се
              </Button>
                
              </div>
            </div>
          </div>

          {/* Right side - Red background with trainer image */}
          <div className="bg-red-600 relative flex items-center justify-center p-8">
            <img
              src="/second.jpg"
              alt="Personal trainer working with client"
              className="max-w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[600px]">
          {/* Left side - Content with gradient background */}
          <div className="bg-gradient-to-r from-primary to-red-950 text-secondary p-12 lg:p-16 flex flex-col justify-center">
            <div className="max-w-lg">
              <span className="text-red-500 font-bold text-sm tracking-wider uppercase mb-4 block">
                ФИТНЕС ЦЕЛИ
              </span>

              <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">
                За кого е приложението
              </h2>

              {/* Feature boxes */}

              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">🏆</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold">
                      За хора, които искат да отслабнат.
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">💪</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">
                      За тези, които желаят да качат мускулна маса.
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">🔥</span>
                    </div>
                  </div>
                  <div>
                    <h3 className=" font-bold mb-2">
                      За заети хора, които нямат време да ходят по фитнес зали,
                      но искат план и насоки.
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">🏋🏻</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">
                      За всеки, който иска професионален треньор на разположение
                      – навсякъде и по всяко време.
                    </h3>
                  </div>
                </div>
              </div>

              <Button onClick={()=> router.push("/register")} className="bg-secondary hover:bg-primary/90 hover:text-secondary text-primary px-8 py-6 text-lg font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Регистрирайте се
              </Button>
            </div>
          </div>

          {/* Right side - Image with gradient background */}
          <div className="bg-gradient-to-l from-red-400 to-red-950 relative flex items-center justify-center p-8">
            <Image
              src="/third.jpg"
              alt="Fitness Gym Background"
              fill
              sizes="100vw"
              priority
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-orange-50 to-orange-100">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            {/* <span className="text-red-500 font-bold text-sm tracking-wider uppercase mb-4 block">
            Защо да избереш нас
            </span> */}
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            Защо да избереш нас
            </h2> 
          </div>

          {/* Cards Container with Border Frame */}
          <div className="relative max-w-6xl mx-auto">
            {/* Red border frame */}
            <div className="absolute inset-0 border-2 border-red-500 rounded-lg"></div>

            {/* Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 p-8 bg-secondary rounded-lg">
              {/* Card 1 */}
              <div className="text-center">
                <div className="relative w-full h-48 sm:h-56 md:h-64 mb-6">
                  <Image
                    src="/one.png"
                    alt="Fitness Gym Background"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">
                Истински треньори
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                работиш с професионалисти, а не с автоматични програми.
                </p>

              </div>

              {/* Card 2 */}
              <div className="text-center">
                <div className="relative w-full h-48 sm:h-56 md:h-64 mb-6">
                  <Image
                    src="/two.jpg"
                    alt="Fitness Gym Background"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">
                Индивидуален подход
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                твоят план е съобразен с твоите цели, навици и ниво.
                </p>

              </div>

              {/* Card 3 */}
              <div className="text-center">
                <div className="relative w-full h-48 sm:h-56 md:h-64 mb-6">
                  <Image
                    src="/three.jpg"
                    alt="Fitness Gym Background"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">
                Мотивация и подкрепа
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                треньорът е винаги до теб с насоки и съвети.
                </p>

              </div>

              <div className="text-center">
                <div className="relative w-full h-48 sm:h-56 md:h-64 mb-6">
                  <Image
                    src="/four.jpg"
                    alt="Fitness Gym Background"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority
                    style={{ objectFit: "cover" }}
                    className="rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold text-primary mb-4">
                Гъвкавост
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                тренираш където и когато искаш.
                </p>

              </div>
            </div>
          </div>
        </div>
      </section>

     <section className="relative py-20 bg-gradient-to-br from-primary via-red-900 to-red-900 text-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Red accent text */}
            <span className="text-red-400 font-bold text-sm tracking-wider uppercase mb-6 block">
              ЗАПОЧНИ СВОЕТО ФИТНЕС ПЪТЕШЕСТВИЕ
            </span>

            {/* Main heading with better typography */}
            <h2 className="text-5xl md:text-7xl font-bold mb-8 text-secondary leading-tight">Започни днес!</h2>

            {/* Description with better styling */}
            <p className="text-xl md:text-2xl mb-12 text-secondary/90 leading-relaxed max-w-3xl mx-auto">
              Избери своя треньор и направи първата стъпка към по-здраво, по-силно и по-уверено „Аз".
            </p>

            {/* Enhanced button with additional styling */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={()=> router.push("/register")} className="bg-secondary hover:bg-primary/90 hover:text-secondary text-primary px-8 py-6 text-lg font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Регистрирайте се
              </Button>

            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-secondary/70">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-400" />
                <span>Безплатна регистрация</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-400" />
                <span>Сертифицирани треньори</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-400" />
                <span>Персонален подход</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
