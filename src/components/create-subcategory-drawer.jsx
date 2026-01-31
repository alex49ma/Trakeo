import React, { useState, useEffect } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { subcategorySchema } from '@/app/lib/schema'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import useFetch from '@/hooks/use-fetch'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createSubcategory, updateSubcategory } from "@/actions/categories"
import { useTranslations } from 'next-intl'

const CreateSubcategoryDrawer = ({ children, categoryId, onSubcategoryCreated, subcategoryToEdit = null, categories = [], open: controlledOpen, onOpenChange: controlledOnOpenChange }) => {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen
    const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId)

    const t = useTranslations('CreateSubcategory')
    const common = useTranslations('Common')

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
        resolver: zodResolver(subcategorySchema),
        defaultValues: {
            name: "",
        }
    })

    useEffect(() => {
        if (subcategoryToEdit) {
            setValue("name", subcategoryToEdit.name)
            // If we supported moving subcategories, we'd set categoryId here too, but for now we assume it stays in same category or isn't relevant for update
        } else {
            reset({
                name: ""
            })
            if (!categoryId) setSelectedCategoryId("") // Reset selection if not pre-determined
        }
    }, [subcategoryToEdit, setValue, reset, open, categoryId])

    const { data: newSubcategory, error: createError, loading: createSubcategoryLoading, fetchData: createSubcategoryFn } = useFetch(createSubcategory)
    const { data: updatedSubcategory, error: updateError, loading: updateSubcategoryLoading, fetchData: updateSubcategoryFn } = useFetch(updateSubcategory)

    const loading = createSubcategoryLoading || updateSubcategoryLoading

    useEffect(() => {
        if (newSubcategory && !createSubcategoryLoading) {
            toast.success(t('success'))
            reset()
            setOpen(false)
            if (onSubcategoryCreated) onSubcategoryCreated(newSubcategory.data)
        }
    }, [createSubcategoryLoading, newSubcategory])

    useEffect(() => {
        if (updatedSubcategory && !updateSubcategoryLoading) {
            toast.success(t('updateSuccess'))
            setOpen(false)
            if (onSubcategoryCreated) onSubcategoryCreated(updatedSubcategory.data)
        }
    }, [updateSubcategoryLoading, updatedSubcategory])

    useEffect(() => {
        const error = createError || updateError
        if (error) {
            toast.error(error.message || t('error'))
        }
    }, [createError, updateError])


    const onSubmit = async (data) => {
        if (subcategoryToEdit) {
            await updateSubcategoryFn(subcategoryToEdit.id, data)
        } else {
            const catId = categoryId || selectedCategoryId
            if (!catId) {
                toast.error(t('selectCategoryError') || "Category is required")
                return
            }
            await createSubcategoryFn({ ...data, categoryId: catId })
        }
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{children}</DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{subcategoryToEdit ? t('editTitle') : t('title')}</DrawerTitle>
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

                        {!categoryId && !subcategoryToEdit && (
                            <div className="space-y-2">
                                <label htmlFor="category" className="text-sm font-medium">{t('category') || "Category"}</label>
                                <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId}>
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder={t('selectCategory') || "Select Category"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                                                    {cat.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            <DrawerClose asChild>
                                <Button type="button" variant="prominentCancel" className="flex-1" disabled={loading}>{common('cancel')}</Button>
                            </DrawerClose>
                            <Button type="submit" variant="prominent" className="flex-1" disabled={loading}>
                                {loading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {subcategoryToEdit ? t('isUpdating') : t('creating')}</> : (subcategoryToEdit ? common('save') : t('submit'))}
                            </Button>
                        </div>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    )
}

export default CreateSubcategoryDrawer
