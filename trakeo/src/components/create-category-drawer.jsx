"use client"

import React, { useState, useEffect } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema } from '@/app/lib/schema'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import useFetch from '@/hooks/use-fetch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createCategory } from "@/actions/categories"
import { useTranslations } from 'next-intl'

const CreateCategoryDrawer = ({ children, onCategoryCreated }) => {
    const [open, setOpen] = useState(false)
    const t = useTranslations('CreateCategory')
    const common = useTranslations('Common')

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: "",
            type: "EXPENSE",
            color: "#22c55e",
            icon: "Wallet"
        }
    })

    const { data: newCategory, error, loading: createCategoryLoading, fetchData: createCategoryFn } = useFetch(createCategory)

    useEffect(() => {
        if (newCategory && !createCategoryLoading) {
            toast.success(t('success'))
            reset()
            setOpen(false)
            if (onCategoryCreated) {
                onCategoryCreated(newCategory.data)
            }
        }
    }, [createCategoryLoading, newCategory])

    useEffect(() => {
        if (error) {
            toast.error(error.message || t('error'))
        }
    }, [error])


    const onSubmit = async (data) => {
        await createCategoryFn(data)
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{t('title')}</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4">
                    <form className="space-y-4" onSubmit={(e) => {
                        e.stopPropagation()
                        handleSubmit(onSubmit)(e)
                    }}>
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">{t('name')}</label>
                            <Input id="name" placeholder={t('namePlaceholder')} {...register("name")} />
                            {errors.name &&
                                <p className="text-sm text-red-500">{errors.name.message}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="type" className="text-sm font-medium">{t('type')}</label>
                            <Select onValueChange={(value) => setValue("type", value)} defaultValue={watch("type")}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder={t('selectType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INCOME">{common('income')}</SelectItem>
                                    <SelectItem value="EXPENSE">{common('expense')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.type &&
                                <p className="text-sm text-red-500">{errors.type.message}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="color" className="text-sm font-medium">{t('color')}</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="color"
                                    type="color"
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    {...register("color")}
                                />
                                <span className="text-sm text-muted-foreground">{watch("color")}</span>
                            </div>
                            {errors.color &&
                                <p className="text-sm text-red-500">{errors.color.message}</p>
                            }
                        </div>

                        <div className="flex gap-4 pt-4">
                            <DrawerClose asChild>
                                <Button type="button" variant="prominentCancel" className="flex-1" disabled={createCategoryLoading}>{common('cancel')}</Button>
                            </DrawerClose>
                            <Button type="submit" variant="prominent" className="flex-1" disabled={createCategoryLoading}>
                                {createCategoryLoading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('creating')}</> : t('submit')}
                            </Button>
                        </div>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

export default CreateCategoryDrawer
