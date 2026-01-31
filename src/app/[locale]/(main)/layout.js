import React from 'react'
import FinisherHeader from "@/components/FinisherHeader";
import { useTranslations } from "next-intl";

const MainLayout = ({ children }) => {
    const t = useTranslations('Footer');

    return (
        <FinisherHeader className="flex-1 flex flex-col min-h-screen">
            <div className="container mx-auto my-32 flex-grow">{children}</div>
            <footer className="bg-orange-100/10 backdrop-blur-xs py-6 relative z-10 mt-auto">
                <div className="container mx-auto px-4 text-center text-gray-800">
                    <p>{t('copyright')}</p>
                </div>
            </footer>
        </FinisherHeader>
    )
}

export default MainLayout