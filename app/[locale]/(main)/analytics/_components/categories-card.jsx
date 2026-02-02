"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import CreateCategoryDrawer from "@/components/create-category-drawer"
import CreateSubcategoryDrawer from "@/components/create-subcategory-drawer"
import { useTranslations } from 'next-intl'
import { deleteCategory, deleteSubcategory } from "@/actions/categories"
import useFetch from "@/hooks/use-fetch"
import { toast } from "sonner"

const CategoriesCard = ({ categories }) => {
    const t = useTranslations('CategoriesCard')
    const common = useTranslations('Common')

    const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
    const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false)

    // Edit states
    const [editingCategory, setEditingCategory] = useState(null)
    const [editingSubcategory, setEditingSubcategory] = useState(null)

    // Delete actions
    const { loading: deleteCategoryLoading, fetchData: deleteCategoryFn } = useFetch(deleteCategory)
    const { loading: deleteSubcategoryLoading, fetchData: deleteSubcategoryFn } = useFetch(deleteSubcategory)

    const handleDeleteCategory = async (id) => {
        if (window.confirm(t('deleteCategoryConfirm'))) {
            await deleteCategoryFn(id)
            toast.success(t('categoryDeleted'))
            // Optimistic update or wait for revalidate - parent should handle data refresh if passed as prop? 
            // Since we are using server actions with revalidatePath, the page should refresh.
            // But we might need router.refresh() if revalidatePath doesn't trigger client refresh automatically in all cases?
            // Usually revalidatePath works.
        }
    }

    const handleDeleteSubcategory = async (id) => {
        if (window.confirm(t('deleteSubcategoryConfirm'))) {
            await deleteSubcategoryFn(id)
            toast.success(t('subcategoryDeleted'))
        }
    }

    const expenseCategories = categories.filter(c => c.type === "EXPENSE")
    const incomeCategories = categories.filter(c => c.type === "INCOME")

    const CategoryItem = ({ category }) => (
        <div className="mb-4">
            <div className="flex items-center justify-between group p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900">
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></span>
                    <span className="font-medium">{category.name}</span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                            <Pencil className="mr-2 h-4 w-4" /> {common('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {common('delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {category.subCategories && category.subCategories.length > 0 && (
                <div className="ml-8 space-y-1 mt-1 border-l-2 pl-2 border-slate-100 dark:border-slate-800">
                    {category.subCategories.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between group/sub p-1 rounded-sm hover:bg-slate-50 dark:hover:bg-slate-900 text-sm">
                            <span>{sub.name}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover/sub:opacity-100">
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingSubcategory(sub)}>
                                        <Pencil className="mr-2 h-4 w-4" /> {common('edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSubcategory(sub.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> {common('delete')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                    <CardTitle>{t('title')}</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCreateCategoryOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> {t('newCategory')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCreateSubcategoryOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> {t('newSubcategory')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-lg mb-4 text-muted-foreground">{common('expense')}</h3>
                            {expenseCategories.map(cat => (
                                <CategoryItem key={cat.id} category={cat} />
                            ))}
                        </div>
                        <div className="md:border-l md:pl-8 border-slate-100 dark:border-slate-800">
                            <h3 className="font-semibold text-lg mb-4 text-muted-foreground">{common('income')}</h3>
                            {incomeCategories.map(cat => (
                                <CategoryItem key={cat.id} category={cat} />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Drawers */}
            <CreateCategoryDrawer
                open={createCategoryOpen}
                onOpenChange={setCreateCategoryOpen}
            />

            <CreateSubcategoryDrawer
                open={createSubcategoryOpen}
                onOpenChange={setCreateSubcategoryOpen}
                categories={categories}
            />

            {/* Edit Drawers */}
            {editingCategory && (
                <CreateCategoryDrawer
                    open={!!editingCategory}
                    onOpenChange={(open) => !open && setEditingCategory(null)}
                    categoryToEdit={editingCategory}
                />
            )}

            {editingSubcategory && (
                <CreateSubcategoryDrawer
                    open={!!editingSubcategory}
                    onOpenChange={(open) => !open && setEditingSubcategory(null)}
                    subcategoryToEdit={editingSubcategory}
                    categories={categories} // Passed just in case, though currently updateSubcategory doesn't allow changing category strictly in my implementation, but good to have
                />
            )}
        </>
    )
}

export default CategoriesCard
