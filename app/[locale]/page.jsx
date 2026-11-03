import FinisherHeader from "@/components/FinisherHeader";
import PaperGrain from "./_components/paper-grain";
import Hero from "./_components/hero";
import Promises from "./_components/promises";
import MonthTimeline from "./_components/month-timeline";
import WhoFor from "./_components/who-for";
import Faq from "./_components/faq";
import FinalCta from "./_components/final-cta";
import LandingFooter from "./_components/landing-footer";

export default function Home() {
  return (
    // The design leaves most text at the browser's normal line height, not Tailwind's 1.5
    <FinisherHeader className="leading-[normal]">
      <PaperGrain />
      <Hero />
      <Promises />
      <MonthTimeline />
      <WhoFor />
      <Faq />
      <FinalCta />
      <LandingFooter />
    </FinisherHeader>
  );
}
