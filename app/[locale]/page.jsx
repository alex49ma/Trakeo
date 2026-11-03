import { Button } from "@/components/ui/button";

import { testimonialsData } from "@/data/landing";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import FinisherHeader from "@/components/FinisherHeader";
import PaperGrain from "./_components/paper-grain";
import Hero from "./_components/hero";
import Promises from "./_components/promises";
import MonthTimeline from "./_components/month-timeline";

import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations('Landing');

  return (
    // The design leaves most text at the browser's normal line height, not Tailwind's 1.5
    <FinisherHeader className="leading-[normal]">
      <PaperGrain />
      <Hero />
      <Promises />
      <MonthTimeline />
      <div>
        <section className="py-20 relative z-10">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl text-orange-100 font-bold text-center mb-12">{t('testimonialsTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonialsData.map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <CardContent className="pt-4">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                        {testimonial.icon}
                      </div>
                      <div className="ml-4">
                        <div className="font-semibold">{t(`testimonials.${index}.name`)}</div>
                        <div className="text-sm text-gray-600">{t(`testimonials.${index}.role`)}</div>
                      </div>
                    </div>
                    <p className="text-gray-600">{t(`testimonials.${index}.quote`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        <section className="py-20 bg-white/10 backdrop-blur-md relative z-10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl text-orange-50 font-bold mb-4">{t('readyToStart')}</h2>
            <p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto">{t('signupDescription')}</p>
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">{t('getStarted')}</Button>
            </Link>
          </div>
        </section>

        {/* Large Footer for Landing Page */}
        <footer className="bg-orange-100/10 backdrop-blur-xs py-12 relative z-10">
          <div className="container mx-auto px-4 text-center text-gray-800">
            <p>{t('copyright')}</p>
          </div>
        </footer>
      </div>
    </FinisherHeader>
  );
}
