import React from 'react'
import { Link } from '@/i18n/navigation';
import { Button } from './ui/button'
import Image from 'next/image'
import { ArrowDown, ArrowRight } from 'lucide-react'

import { useTranslations } from 'next-intl';

const HeroSection = () => {
    const t = useTranslations('Hero');

    return (
        <div className="pb-20 px-4">
            <div className="container mx-auto text-center">
                <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">{t('title1')}</h1>
                <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">{t('title2')}</h1>
                <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: t.raw('subtitle') }}></p>
                <div className="flex flex-wrap justify-center gap-4 pb-8">
                    <Button asChild size="lg" className="h-11 px-7 font-semibold bg-orange-700 hover:bg-orange-800 text-white shadow-md">
                        <Link href="/dashboard">
                            {t('getStarted')}
                            <ArrowRight />
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-11 px-7">
                        <a href="#how-it-works">
                            {t('seeHowItWorks')}
                            <ArrowDown />
                        </a>
                    </Button>
                </div>
                <div className="perspective-[1000px]">
                    <div>
                        <Image src="/banner-v1.png"
                            width={1280}
                            height={720}
                            alt="Dashboard Preview"
                            className="rounded-lg shadow-2xl border mx-auto"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeroSection