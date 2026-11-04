"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateCategoryDrawer from "@/components/create-category-drawer";
import CreateSubcategoryDrawer from "@/components/create-subcategory-drawer";
import { categoryLabel } from "@/lib/system-categories";
import { categoriesFor } from "./choices";

// Select values that open a drawer instead of being chosen
const NEW_CATEGORY = "__newCategory";
const NEW_SUBCATEGORY = "__newSubcategory";

/**
 * Category and subcategory selects for one group or row, with "New category…" and "New subcategory…" opening the same
 * drawers as the transaction form. Like there, a category created in a drawer is saved right away.
 * choice: { value: "none" | "skip" | "cat:<id>", subcategoryId }. onCategoryCreated / onSubcategoryCreated add the new
 * one to the wizard's list.
 */
export default function CategoryPicker({ type, choice, onChange, categories, onCategoryCreated, onSubcategoryCreated, allowSkip = false, size = "default" }) {
    const t = useTranslations("CsvImport");
    const tCategories = useTranslations("SystemCategories");
    const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
    const [subcategoryDrawerOpen, setSubcategoryDrawerOpen] = useState(false);

    const options = categoriesFor(categories, type);
    const selected = choice.value.startsWith("cat:") ? options.find((category) => `cat:${category.id}` === choice.value) : null;
    const subcategories = selected?.subCategories ?? [];

    const changeCategory = (value) => {
        if (value === NEW_CATEGORY) setCategoryDrawerOpen(true);
        else onChange({ value, subcategoryId: null });
    };
    const changeSubcategory = (value) => {
        if (value === NEW_SUBCATEGORY) setSubcategoryDrawerOpen(true);
        else onChange({ ...choice, subcategoryId: value === "none" ? null : value });
    };

    return (
        <div className="grid min-w-44 gap-2 sm:grid-cols-2">
            <Select value={choice.value} onValueChange={changeCategory}>
                <SelectTrigger size={size} className="w-full bg-background">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">{t("noCategoryChoice")}</SelectItem>
                    <SelectSeparator />
                    {options.map((category) => (
                        <SelectItem key={category.id} value={`cat:${category.id}`}>
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                            {categoryLabel(category, tCategories)}
                        </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={NEW_CATEGORY}>{t("newCategoryChoice")}</SelectItem>
                    {allowSkip && <SelectItem value="skip">{t("skipChoice")}</SelectItem>}
                </SelectContent>
            </Select>

            {selected && (
                <Select value={choice.subcategoryId ?? "none"} onValueChange={changeSubcategory}>
                    <SelectTrigger size={size} className="w-full bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t("noSubcategory")}</SelectItem>
                        {subcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>
                        ))}
                        <SelectSeparator />
                        <SelectItem value={NEW_SUBCATEGORY}>{t("newSubcategoryChoice")}</SelectItem>
                    </SelectContent>
                </Select>
            )}

            <CreateCategoryDrawer
                open={categoryDrawerOpen}
                onOpenChange={setCategoryDrawerOpen}
                initialType={type}
                onCategoryCreated={(category) => {
                    onCategoryCreated(category);
                    // The drawer lets you switch the type. A category of the other type is added to the list but not chosen
                    if (category.type === type) onChange({ value: `cat:${category.id}`, subcategoryId: null });
                }}
            >
                <span className="hidden" />
            </CreateCategoryDrawer>
            {selected && (
                <CreateSubcategoryDrawer
                    categoryId={selected.id}
                    open={subcategoryDrawerOpen}
                    onOpenChange={setSubcategoryDrawerOpen}
                    onSubcategoryCreated={(subcategory) => {
                        onSubcategoryCreated(subcategory);
                        onChange({ ...choice, subcategoryId: subcategory.id });
                    }}
                >
                    <span className="hidden" />
                </CreateSubcategoryDrawer>
            )}
        </div>
    );
}
