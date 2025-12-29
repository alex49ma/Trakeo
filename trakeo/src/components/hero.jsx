import React from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import Image from 'next/image'

const HeroSection = () => {
    return (
        <div className="pb-20 px-4">
            <div className="container mx-auto text-center">
                <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">The tool to track</h1>
                <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">your finances</h1>
                <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">Track your expenses and income in one place<br />Analyze and get key insights</p>
                <div className="flex justify-center space-x-4 pb-8">
                    <Link href="/dashboard">
                        <Button size="lg" variant="outline" className="px-8">Get Started</Button>
                    </Link>
                    <Link href="/">
                        <Button size="lg" variant="outline" className="px-8">Watch Demo</Button>
                    </Link>
                </div>
                <div className="perspective-[1000px]">
                    <div>
                        <Image src="/banner.png"
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