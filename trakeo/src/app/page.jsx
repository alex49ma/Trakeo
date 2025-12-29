import { Button } from "@/components/ui/button";
import Image from "next/image";
import HeroSection from "@/components/hero";
import { featuresData, statsData, howItWorksData, testimonialsData } from "@/data/landing";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import FinisherHeader from "@/components/FinisherHeader";

export default function Home() {
  return (
    <FinisherHeader className="mt-40">
      <HeroSection />
      <section className="py-20 bg-orange-50/90 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsData.map((statsData, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">{statsData.value}</div>
                <div className="text-xl font-semibold text-gray-600">{statsData.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl text-orange-100 font-bold text-center mb-12">Everything you need to manage your finances</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => (
              <Card key={index} className="p-6">
                <CardContent className="space-y-4 pt-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 bg-orange-50/90 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl text-orange-600 font-bold text-center mb-16">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksData.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl text-orange-100 font-bold text-center mb-12">What our users say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialsData.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-4">
                  <div className="flex items-center mb-4">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={50}
                      height={50}
                      className="rounded-full" />
                    <div className="ml-4">
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-gray-600">{testimonial.quote}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 bg-white/10 backdrop-blur-md relative z-10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl text-orange-50 font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto">Sign up for a free account and start tracking your expenses today.</p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">Get Started</Button>
          </Link>
        </div>
      </section>
    </FinisherHeader>
  );
}
