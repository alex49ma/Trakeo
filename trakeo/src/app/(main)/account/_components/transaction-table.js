"use client";

import React, { useMemo, useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Clock, MoreHorizontal, RefreshCw, Search, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import useFetch from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { BarLoader } from 'react-spinners';
import { bulkDeleteTransactions } from "@/actions/accounts";

const TransactionTable = ({ transactions }) => {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState([]);
    const [sortConfig, setSortConfig] = useState({ field: "date", direction: "desc" });

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [accountFilter, setAccountFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [subcategoryFilter, setSubcategoryFilter] = useState("");
    const [recurringFilter, setRecurringFilter] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const {
        loading: deleteLoading,
        fetchData: deleteFn,
        data: deleted,
    } = useFetch(bulkDeleteTransactions);

    const handleBulkDelete = async () => {
        if (!window.confirm("Are you sure you want to delete these transactions?")) return;
        deleteFn(selectedIds);
        setSelectedIds([]);
    }

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, accountFilter, categoryFilter, subcategoryFilter, recurringFilter]);

    // Clear selection when items per page changes
    useEffect(() => {
        setSelectedIds([]);
        setCurrentPage(1);
    }, [itemsPerPage]);

    useEffect(() => {
        if (deleted && !deleteLoading) {
            if (deleted.success) {
                toast.success("Transactions deleted successfully");
            } else {
                toast.error("Error deleting transactions: " + deleted.error);
            }
        }
    }, [deleted, deleteLoading]);

    const RECURRING_INTERVALS = {
        DAILY: "Daily",
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
        YEARLY: "Yearly",
        CUSTOM: "Custom"
    }

    const filteredAndSortedTransactions = useMemo(() => {
        let results = [...transactions];

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            results = results.filter((transaction) =>
                (transaction.description || "").toLowerCase().includes(searchLower)
            );
        }

        if (typeFilter) {
            results = results.filter((transaction) => transaction.type === typeFilter);
        }

        if (accountFilter) {
            results = results.filter((transaction) => transaction.accountId === accountFilter);
        }

        if (categoryFilter) {
            results = results.filter((transaction) => transaction.categoryId === categoryFilter);
        }

        if (subcategoryFilter) {
            results = results.filter((transaction) => transaction.subcategoryId === subcategoryFilter);
        }

        if (recurringFilter) {
            results = results.filter((transaction) => { return recurringFilter === "true" ? transaction.isRecurring : transaction.isRecurring === false });
        }

        results.sort((a, b) => {
            let comparison = 0;
            switch (sortConfig.field) {
                case "date":
                    comparison = new Date(a.date) - new Date(b.date);
                    break;
                case "amount":
                    comparison = a.amount - b.amount;
                    break;
                case "category":
                    const aName = a.subcategory ? a.subcategory.name : a.category.name;
                    const bName = b.subcategory ? b.subcategory.name : b.category.name;
                    comparison = aName.localeCompare(bName);
                    break;
                default:
                    comparison = 0;
            }
            return sortConfig.direction === "asc" ? comparison : -comparison;
        })

        return results;

    }, [transactions, searchTerm, typeFilter, accountFilter, categoryFilter, subcategoryFilter, recurringFilter, sortConfig]);

    const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

    const handleSort = (field) => {
        setSortConfig(current => ({
            field,
            direction: current.field === field && current.direction === "asc" ? "desc" : "asc"
        }));
    }

    const handleSelect = (id) => {
        setSelectedIds(current => {
            if (current.includes(id)) {
                return current.filter((item) => item !== id);
            } else {
                return [...current, id];
            }
        });
    }

    const handleSelectAll = () => {
        setSelectedIds(current => {
            if (current.length === paginatedTransactions.length) {
                return [];
            } else {
                return paginatedTransactions.map((transaction) => transaction.id);
            }
        });
    }

    const handleClearFilters = () => {
        setSearchTerm("");
        setTypeFilter("");
        setAccountFilter("");
        setCategoryFilter("");
        setSubcategoryFilter("");
        setRecurringFilter("");
    };



    return (
        <div className="space-y-4">
            {deleteLoading && (<BarLoader className="mt-4" width={"100%"} color="#FFCC80" />)}
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="pl-8"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={accountFilter} onValueChange={setAccountFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODO">TODO</SelectItem>
                            <SelectItem value="TODO">TODO</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from(new Map(transactions.map(t => [t.category.id, t.category.name])).entries()).map(([id, name]) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Subcategories" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from(new Map(
                                transactions
                                    .filter(t => t.subcategory)
                                    .map(t => [t.subcategory.id, t.subcategory.name])
                            ).entries()).map(([id, name]) => (
                                <SelectItem key={id} value={id}>{name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={recurringFilter} onValueChange={(value) => setRecurringFilter(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Transaction Regimes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">Recurring</SelectItem>
                            <SelectItem value="false">Non-recurring</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                            >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Selected ({selectedIds.length})
                            </Button>
                        </div>
                    )}

                    {(searchTerm || typeFilter || accountFilter || categoryFilter || subcategoryFilter || recurringFilter) && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilters}
                            title="Clear filters"
                        >
                            <X className="h-4 w-5" />
                        </Button>
                    )}
                </div>

            </div>

            {/* Transactions */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={selectedIds.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                                    onCheckedChange={handleSelectAll} />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                                <div className="flex items-center">
                                    Date {sortConfig.field === "date" && (
                                        sortConfig.direction === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center">Description</div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                                <div className="flex items-center">
                                    Category {sortConfig.field === "category" && (
                                        sortConfig.direction === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                    )}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
                                <div className="flex items-center justify-end w-full">Amount {sortConfig.field === "amount" && (
                                    sortConfig.direction === "asc" ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                                )}</div>
                            </TableHead>
                            <TableHead>
                                <div className="flex items-center">Recurring</div>
                            </TableHead>
                            <TableHead>

                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    No transactions found
                                </TableCell>
                            </TableRow>
                        ) : (paginatedTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>
                                    <Checkbox onCheckedChange={() => handleSelect(transaction.id)} checked={selectedIds.includes(transaction.id)} />
                                </TableCell>
                                <TableCell className="font-medium">
                                    {format(transaction.date, "PP")}
                                </TableCell>
                                <TableCell>
                                    {transaction.description}
                                </TableCell>
                                <TableCell className="capitalize">
                                    <div className="flex flex-col gap-1">
                                        <span style={{
                                            backgroundColor: transaction.category.color
                                        }}
                                            className="px-2 py-1 rounded-sm text-white text-xs w-fit"
                                        >
                                            {transaction.subcategory ? transaction.subcategory.name : transaction.category.name}
                                        </span>
                                        {transaction.subcategory && (
                                            <span className="text-[10px] text-muted-foreground ml-1">
                                                {transaction.category.name}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium" style={{ color: transaction.type === "EXPENSE" ? "red" : "green" }}>
                                    {transaction.type === "EXPENSE" ? "-" : "+"}
                                    {transaction.amount.toFixed(2)}€
                                </TableCell>
                                <TableCell>
                                    {transaction.isRecurring ?
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Badge className="gap-1 bg-orange-100 text-orange-600 hover:bg-orange-200 hover:text-orange-700" variant="outline"><RefreshCw className="w-3 h-3" />
                                                    {RECURRING_INTERVALS[transaction.recurringInterval]}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-sm">
                                                    <div className="font-medium">
                                                        Next Date:
                                                    </div>
                                                    <div>
                                                        {format(transaction.nextRecurringDate, "PP")}
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip> : <Badge className="gap-1" variant="outline"><Clock className="w-3 h-3" />One time</Badge>}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="w-8 h-8 p-0">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.push(`/transaction/create?edit=${transaction.id}`)}
                                            >Edit</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => deleteFn([transaction.id])}
                                            >Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of{" "}
                        {filteredAndSortedTransactions.length} transactions
                    </div>
                    <div className="flex flex-wrap items-center gap-4 order-1 sm:order-2">
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => setItemsPerPage(Number(value))}
                        >
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder={`${itemsPerPage} per page`} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 per page</SelectItem>
                                <SelectItem value="20">20 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                                <SelectItem value="100">100 per page</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page =>
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1
                                    )
                                    .map((page, index, array) => (
                                        <React.Fragment key={page}>
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className="text-muted-foreground px-1">...</span>
                                            )}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className={`h-8 w-8 p-0 ${currentPage === page ? "bg-orange-100 text-orange-600 hover:bg-orange-200 border-orange-200" : ""}`}
                                            >
                                                {page}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TransactionTable