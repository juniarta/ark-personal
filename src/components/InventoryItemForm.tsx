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
import { useInventoryStore } from "@/lib/store";
import type { InventoryItem, CategoryField } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "sold", label: "Sold" },
  { value: "traded", label: "Traded" },
  { value: "lost", label: "Lost" },
];

interface InventoryItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName?: string;
  fields: CategoryField[];
  editItem?: InventoryItem | null;
  onSuccess?: () => void;
}

export function InventoryItemForm({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  fields,
  editItem,
  onSuccess,
}: InventoryItemFormProps) {
  const { createItem, updateItem } = useInventoryStore();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("owned");
  const [notes, setNotes] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [fieldData, setFieldData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editItem;

  useEffect(() => {
    if (open && editItem) {
      setName(editItem.name);
      setQuantity(String(editItem.quantity));
      setStatus(editItem.status);
      setNotes(editItem.notes ?? "");
      setAcquiredAt(editItem.acquired_at ?? "");
      try {
        setFieldData(editItem.field_data ? JSON.parse(editItem.field_data) : {});
      } catch {
        setFieldData({});
      }
    } else if (open && !editItem) {
      setName("");
      setQuantity("1");
      setStatus("owned");
      setNotes("");
      setAcquiredAt("");
      setFieldData({});
    }
    setError(null);
  }, [open, editItem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fieldDataStr =
        Object.keys(fieldData).length > 0 ? JSON.stringify(fieldData) : undefined;
      if (isEdit && editItem) {
        await updateItem(editItem.id, {
          name: name.trim(),
          quantity: parseInt(quantity) || 1,
          status,
          notes: notes.trim() || undefined,
          field_data: fieldDataStr,
        });
      } else {
        await createItem({
          category_id: categoryId,
          name: name.trim(),
          quantity: parseInt(quantity) || 1,
          status,
          notes: notes.trim() || undefined,
          acquired_at: acquiredAt || undefined,
          field_data: fieldDataStr,
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

  function renderDynamicField(field: CategoryField) {
    const val = fieldData[field.field_name] ?? "";
    const setValue = (v: string) =>
      setFieldData((prev) => ({ ...prev, [field.field_name]: v }));

    if (field.field_type === "boolean") {
      return (
        <div key={field.id} className="flex items-center gap-2">
          <input
            id={`dyn-${field.id}`}
            type="checkbox"
            checked={val === "true"}
            onChange={(e) => setValue(e.target.checked ? "true" : "false")}
            className="w-4 h-4 accent-primary"
          />
          <Label htmlFor={`dyn-${field.id}`} className="cursor-pointer">
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        </div>
      );
    }

    if (field.field_type === "dropdown") {
      let opts: string[] = [];
      try {
        opts = field.options ? JSON.parse(field.options) : [];
      } catch {
        opts = [];
      }
      return (
        <div key={field.id} className="space-y-1.5">
          <Label>
            {field.field_name}
            {field.is_required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Select value={val} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1.5">
        <Label htmlFor={`dyn-${field.id}`}>
          {field.field_name}
          {field.is_required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Input
          id={`dyn-${field.id}`}
          type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
          value={val}
          onChange={(e) => setValue(e.target.value)}
          required={field.is_required}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Item" : `Add Item${categoryName ? ` to ${categoryName}` : ""}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-qty">Quantity</Label>
              <Input
                id="item-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="item-acquired">Acquired Date</Label>
              <Input
                id="item-acquired"
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
              />
            </div>
          )}

          {/* Dynamic fields */}
          {fields.length > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Custom Fields
              </p>
              {fields.map(renderDynamicField)}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="item-notes">Notes</Label>
            <Input
              id="item-notes"
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
              {saving ? "Saving..." : isEdit ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
