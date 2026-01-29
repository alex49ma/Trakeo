"use client"

import React, { useState, useEffect } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { subcategorySchema } from '@/app/lib/schema'
import { Input } from './ui/input'
import { Button } from './ui/button'
import useFetch from '@/hooks/use-fetch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createSubcategory } from "@/actions/categories"
import { useTranslations } from 'next-intl'

const CreateSubcategoryDrawer = ({ children, categoryId, onSubcategoryCreated }) => {
    const [open, setOpen] = useState(false)
    const t = useTranslations('CreateSubcategory')
    const common = useTranslations('Common')

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(subcategorySchema),
        defaultValues: {
            name: "",
        }
    })

    const { data: newSubcategory, error, loading: createSubcategoryLoading, fetchData: createSubcategoryFn } = useFetch(createSubcategory)

    useEffect(() => {
        if (newSubcategory && !createSubcategoryLoading) {
            toast.success(t('success'))
            reset()
            setOpen(false)
            if (onSubcategoryCreated) {
                onSubcategoryCreated(newSubcategory.data)
            }
        }
    }, [createSubcategoryLoading, newSubcategory])

    useEffect(() => {
        if (error) {
            toast.error(error.message || t('error'))
        }
    }, [error])


    const onSubmit = async (data) => {
        if (!categoryId) {
            toast.error("Category is required")
            return
        }
        await createSubcategoryFn({ ...data, categoryId })
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

                        <div className="flex gap-4 pt-4">
                            <DrawerClose asChild>
                                <Button type="button" variant="prominentCancel" className="flex-1" disabled={createSubcategoryLoading}>{common('cancel')}</Button>
                            </DrawerClose>
                            <Button type="submit" variant="prominent" className="flex-1" disabled={createSubcategoryLoading}>
                                {createSubcategoryLoading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('creating')}</> : t('submit')}
                            </Button>
                        </div>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

export default CreateSubcategoryDrawer
