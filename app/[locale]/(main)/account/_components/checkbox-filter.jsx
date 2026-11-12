"use client";

import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// A dropdown of checkboxes for filtering by several values at once.
// sections: [{ key, label, groups: [{ key, label?, items: [{ id, name }] }] }]
// selected: array of ids. Nothing selected means no filter.
const CheckboxFilter = ({ sections, selected, onChange, placeholder, summary, clearLabel }) => {
    const items = sections.flatMap((section) => section.groups.flatMap((group) => group.items));
    const selectedSet = new Set(selected);

    const toggle = (id) => {
        onChange(selectedSet.has(id) ? selected.filter((item) => item !== id) : [...selected, id]);
    };

    let triggerText = placeholder;
    if (selected.length === 1) {
        triggerText = items.find((item) => item.id === selected[0])?.name ?? placeholder;
    } else if (selected.length > 1) {
        triggerText = summary(selected.length);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="bg-white font-normal justify-between gap-2"
                    disabled={items.length === 0}
                >
                    <span className={selected.length === 0 ? "text-muted-foreground" : undefined}>
                        {triggerText}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1">
                <div className="max-h-72 overflow-y-auto">
                    {sections.map((section, sectionIndex) => (
                        <div key={section.key} className={sectionIndex > 0 ? "mt-1 border-t pt-1" : undefined}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {section.label}
                            </div>
                            {section.groups.map((group) => (
                                <div key={group.key}>
                                    {group.label && (
                                        <div className="pl-4 pr-2 py-1 text-xs italic text-muted-foreground">
                                            {group.label}
                                        </div>
                                    )}
                                    {group.items.map((item) => (
                                        <label
                                            key={item.id}
                                            className={`flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 text-sm hover:bg-accent ${group.label ? "pl-6" : "pl-2"}`}
                                        >
                                            <Checkbox
                                                checked={selectedSet.has(item.id)}
                                                onCheckedChange={() => toggle(item.id)}
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                {selected.length > 0 && (
                    <div className="mt-1 border-t pt-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center"
                            onClick={() => onChange([])}
                        >
                            {clearLabel}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

export default CheckboxFilter;
