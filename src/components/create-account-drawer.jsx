"use client"

import React, { useState } from 'react'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './ui/drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema } from '@/app/lib/schema'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Button } from './ui/button'
import useFetch from '@/hooks/use-fetch'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { createAccount } from "@/actions/dashboard";

import { useTranslations } from 'next-intl';

const CreateAccountDrawer = ({ children }) => {
    const [open, setOpen] = useState(false)
    const t = useTranslations('CreateAccount');
    const common = useTranslations('Common');

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
        resolver: zodResolver(accountSchema),
        defaultValues: {
            name: "",
            type: "CURRENT",
            balance: "",
            isDefault: false
        }
    })

    const { data: newAccount, error, loading: createAccountLoading, fetchData: createAccountFn } = useFetch(createAccount)

    useEffect(() => {
        if (newAccount && !createAccountLoading) {
            toast.success(t('success'))
            reset()
            setOpen(false)
        }
    }, [createAccountLoading, newAccount])

    useEffect(() => {
        if (error) {
            toast.error(error.message || t('error'))
        }
    }, [error])


    const onSubmit = async (data) => {
        await createAccountFn(data)
    }

    return (
        <div>
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{children}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>{t('title')}</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-4">
                        <form action="" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>


                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">{t('accountName')}</label>
                                <Input id="name" placeholder={t('accountNamePlaceholder')} {...register("name")} />
                                {errors.name &&
                                    <p className=" text-sm text-red-500">{errors.name.message}</p>
                                }
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="type" className="text-sm font-medium">{t('accountType')}</label>
                                <Select onValueChange={(value) => setValue("type", value)} defaultValue={watch("type")}>
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder={t('accountType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CURRENT">{common('accountType.CURRENT')}</SelectItem>
                                        <SelectItem value="SAVINGS">{common('accountType.SAVINGS')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type &&
                                    <p className=" text-sm text-red-500">{errors.type.message}</p>
                                }
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="balance" className="text-sm font-medium"> {t('initialBalance')}</label>
                                <Input id="balance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00" {...register("balance")} />
                                {errors.balance &&
                                    <p className=" text-sm text-red-500">{errors.balance.message}</p>
                                }
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <label htmlFor="isDefault" className="text-sm font-medium cursor-pointer"> {t('setAsDefault')}</label>
                                    <p className="text-sm text-muted-foreground">{t('defaultDescription')}</p>
                                </div>
                                <Switch
                                    id="isDefault"
                                    onCheckedChange={(checked) => setValue("isDefault", checked)}
                                    checked={watch("isDefault")}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <DrawerClose asChild>
                                    <Button type="button" variant="prominentCancel" className="flex-1" disabled={createAccountLoading}>{common('cancel')}</Button>
                                </DrawerClose>
                                <Button type="submit" variant="prominent" className="flex-1" disabled={createAccountLoading}>
                                    {createAccountLoading ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('creating')}</> : t('submit')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

export default CreateAccountDrawer