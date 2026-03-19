"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useExpenseStore } from "@/lib/store";
import { useAuctionStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";

const TRANSACTION_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "bid", label: "Bid" },
  { value: "trade", label: "Trade" },
];

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTransaction?: Transaction | null;
  onSuccess?: () => void;
}

export function TransactionForm({
  open,
  onOpenChange,
  editTransaction,
  onSuccess,
}: TransactionFormProps) {
  const { createTransaction, updateTransaction } = useExpenseStore();
  const { auctions } = useAuctionStore();

  const [txType, setTxType] = useState("buy");
  const [description, setDescription] = useState("");
  const [igAmount, setIgAmount] = useState("");
  const [igCurrency, setIgCurrency] = useState("");
  const [realAmount, setRealAmount] = useState("");
  const [realCurrency, setRealCurrency] = useState("USD");
  const [counterparty, setCounterparty] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [auctionId, setAuctionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editTransaction;

  useEffect(() => {
    if (open && editTransaction) {
      setTxType(editTransaction.transaction_type);
      setDescription(editTransaction.description);
      setIgAmount(editTransaction.ig_amount !== null ? String(editTransaction.ig_amount) : "");
      setIgCurrency(editTransaction.ig_currency ?? "");
      setRealAmount(editTransaction.real_amount !== null ? String(editTransaction.real_amount) : "");
      setRealCurrency(editTransaction.real_currency ?? "USD");
      setCounterparty(editTransaction.counterparty ?? "");
      setTxDate(editTransaction.transaction_date.slice(0, 10));
      setNotes(editTransaction.notes ?? "");
      setAuctionId(editTransaction.auction_id ?? "");
    } else if (open && !editTransaction) {
      setTxType("buy");
      setDescription("");
      setIgAmount("");
      setIgCurrency("");
      setRealAmount("");
      setRealCurrency("USD");
      setCounterparty("");
      setTxDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setAuctionId("");
    }
    setError(null);
  }, [open, editTransaction]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!txDate) {
      setError("Date is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && editTransaction) {
        await updateTransaction(editTransaction.id, {
          description: description.trim(),
          ig_amount: igAmount ? parseFloat(igAmount) : undefined,
          ig_currency: igCurrency.trim() || undefined,
          real_amount: realAmount ? parseFloat(realAmount) : undefined,
          real_currency: realCurrency.trim() || undefined,
          counterparty: counterparty.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await createTransaction({
          transaction_type: txType,
          description: description.trim(),
          ig_amount: igAmount ? parseFloat(igAmount) : undefined,
          ig_currency: igCurrency.trim() || undefined,
          real_amount: realAmount ? parseFloat(realAmount) : undefined,
          real_currency: realCurrency.trim() || undefined,
          counterparty: counterparty.trim() || undefined,
          transaction_date: txDate,
          notes: notes.trim() || undefined,
          auction_id: auctionId || undefined,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={txType} onValueChange={setTxType} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Description</Label>
            <Input
              id="tx-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this transaction for?"
              autoFocus
            />
          </div>

          {/* In-game amount */}
          <div className="space-y-1.5">
            <Label>In-Game Amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min={0}
                value={igAmount}
                onChange={(e) => setIgAmount(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
              <Input
                value={igCurrency}
                onChange={(e) => setIgCurrency(e.target.value)}
                placeholder="Currency (e.g. HEX)"
                className="w-36"
              />
            </div>
          </div>

          {/* Real money */}
          <div className="space-y-1.5">
            <Label>Real Money Amount</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={realAmount}
                onChange={(e) => setRealAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Input
                value={realCurrency}
                onChange={(e) => setRealCurrency(e.target.value)}
                placeholder="USD"
                className="w-24"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-counterparty">Counterparty</Label>
            <Input
              id="tx-counterparty"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="Player name or entity"
            />
          </div>

          {!isEdit && auctions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Linked Auction (optional)</Label>
              <Select value={auctionId} onValueChange={setAuctionId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {auctions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes</Label>
            <Input
              id="tx-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
