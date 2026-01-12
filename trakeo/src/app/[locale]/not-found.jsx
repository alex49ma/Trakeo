import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const NotFound = () => {
    const t = useTranslations('NotFound');
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl text-orange-400 font-bold pb-4">404</h1>
            <h2 className="text-2xl font-bold pb-4">{t('title')}</h2>
            <p className="text-xl text-gray-600 font-bold pb-4">{t('description')}</p>
            <Link href="/">
                <Button>{t('homeButton')}</Button>
            </Link>
        </div>
    )
}

export default NotFound