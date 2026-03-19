"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseStore } from "@/lib/store";
import { useAuctionStore } from "@/lib/store";
import { TransactionForm } from "@/components/TransactionForm";
import type { Transaction } from "@/lib/types";

const TX_TYPE_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  buy: "destructive",
  sell: "success",
  bid: "warning",
  trade: "secondary",
};

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString()} ${currency ?? ""}`.trim();
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function ExpensesPage() {
  const {
    transactions,
    summary,
    monthlySummary,
    loading,
    fetchTransactions,
    fetchByType,
    fetchProfitLoss,
    fetchMonthlySummary,
    deleteTransaction,
  } = useExpenseStore();
  const { fetchActiveAuctions } = useAuctionStore();

  const [typeFilter, setTypeFilter] = useState("all");
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeFilter === "all") {
      fetchTransactions();
    } else {
      fetchByType(typeFilter);
    }
  }, [typeFilter, fetchTransactions, fetchByType]);

  useEffect(() => {
    fetchProfitLoss();
    fetchMonthlySummary();
    fetchActiveAuctions();
  }, [fetchProfitLoss, fetchMonthlySummary, fetchActiveAuctions]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(tx: Transaction) {
    setEditTx(tx);
    setTxFormOpen(true);
  }

  // Summary calculations
  const igExpenseTotal =
    summary?.ig_expenses.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const igIncomeTotal =
    summary?.ig_income.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const realExpenseTotal =
    summary?.real_expenses.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const realIncomeTotal =
    summary?.real_income.reduce((sum, c) => sum + c.total, 0) ?? 0;

  const igNetPL = igIncomeTotal - igExpenseTotal;
  const realNetPL = realIncomeTotal - realExpenseTotal;

  // Monthly chart max values
  const maxIg = Math.max(
    1,
    ...monthlySummary.map((m) => Math.max(m.ig_expense, m.ig_income))
  );
  const maxReal = Math.max(
    1,
    ...monthlySummary.map((m) => Math.max(m.real_expense, m.real_income))
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track trades, purchases, and income</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditTx(null);
            setTxFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Transaction
        </Button>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Tab 1: Transactions */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="bid">Bid</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : transactions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">No transactions found.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditTx(null);
                    setTxFormOpen(true);
                  }}
                >
                  Add your first transaction
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-32">In-Game</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Real Money</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Counterparty</th>
                    <th className="px-4 py-2.5 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={TX_TYPE_VARIANTS[tx.transaction_type] ?? "secondary"}
                          className="capitalize text-[10px]"
                        >
                          {tx.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {tx.description}
                        {tx.notes && (
                          <span className="ml-2 text-xs text-muted-foreground">— {tx.notes}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">
                        {formatAmount(tx.ig_amount, tx.ig_currency)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">
                        {formatAmount(tx.real_amount, tx.real_currency)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {tx.counterparty ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(tx)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Summary */}
        <TabsContent value="summary" className="space-y-6 mt-4">
          {/* P/L cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  IG Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {igExpenseTotal.toLocaleString()}
                </p>
                <div className="mt-1 space-y-0.5">
                  {summary?.ig_expenses.map((c) => (
                    <p key={c.currency} className="text-xs text-muted-foreground">
                      {c.total.toLocaleString()} {c.currency}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  IG Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">
                  {igIncomeTotal.toLocaleString()}
                </p>
                <div className="mt-1 space-y-0.5">
                  {summary?.ig_income.map((c) => (
                    <p key={c.currency} className="text-xs text-muted-foreground">
                      {c.total.toLocaleString()} {c.currency}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  Real Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {realExpenseTotal.toLocaleString()}
                </p>
                <div className="mt-1 space-y-0.5">
                  {summary?.real_expenses.map((c) => (
                    <p key={c.currency} className="text-xs text-muted-foreground">
                      {c.total.toLocaleString()} {c.currency}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  Real Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">
                  {realIncomeTotal.toLocaleString()}
                </p>
                <div className="mt-1 space-y-0.5">
                  {summary?.real_income.map((c) => (
                    <p key={c.currency} className="text-xs text-muted-foreground">
                      {c.total.toLocaleString()} {c.currency}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net P/L */}
          <div className="grid grid-cols-2 gap-4">
            <Card className={igNetPL >= 0 ? "border-green-700/40" : "border-destructive/40"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net In-Game P/L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${igNetPL >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {igNetPL >= 0 ? "+" : ""}{igNetPL.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className={realNetPL >= 0 ? "border-green-700/40" : "border-destructive/40"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Real Money P/L
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${realNetPL >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {realNetPL >= 0 ? "+" : ""}{realNetPL.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly bar chart */}
          {monthlySummary.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Monthly Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* In-game chart */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">In-Game</p>
                    <div className="space-y-2">
                      {monthlySummary.slice(-6).map((m) => (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                          <div className="flex-1 space-y-1">
                            {m.ig_expense > 0 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 rounded-sm bg-destructive/70"
                                  style={{ width: `${(m.ig_expense / maxIg) * 100}%`, minWidth: "4px" }}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  -{m.ig_expense.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {m.ig_income > 0 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 rounded-sm bg-green-600/70"
                                  style={{ width: `${(m.ig_income / maxIg) * 100}%`, minWidth: "4px" }}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  +{m.ig_income.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Real money chart */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Real Money</p>
                    <div className="space-y-2">
                      {monthlySummary.slice(-6).map((m) => (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16 shrink-0">{m.month}</span>
                          <div className="flex-1 space-y-1">
                            {m.real_expense > 0 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 rounded-sm bg-orange-600/70"
                                  style={{ width: `${(m.real_expense / maxReal) * 100}%`, minWidth: "4px" }}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  -{m.real_expense.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {m.real_income > 0 && (
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 rounded-sm bg-blue-600/70"
                                  style={{ width: `${(m.real_income / maxReal) * 100}%`, minWidth: "4px" }}
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  +{m.real_income.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={txFormOpen}
        onOpenChange={(v) => {
          setTxFormOpen(v);
          if (!v) setEditTx(null);
        }}
        editTransaction={editTx}
        onSuccess={() => {
          if (typeFilter === "all") {
            fetchTransactions();
          } else {
            fetchByType(typeFilter);
          }
          fetchProfitLoss();
          fetchMonthlySummary();
        }}
      />
    </div>
  );
}
