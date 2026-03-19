"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useInventoryStore } from "@/lib/store";
import type { Category } from "@/lib/types";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: Category | null;
  onSuccess?: () => void;
}

export function CategoryForm({ open, onOpenChange, editCategory, onSuccess }: CategoryFormProps) {
  const { createCategory, updateCategory } = useInventoryStore();
  const [name, setName] = useState(editCategory?.name ?? "");
  const [icon, setIcon] = useState(editCategory?.icon ?? "");
  const [color, setColor] = useState(editCategory?.color ?? PRESET_COLORS[4]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editCategory;

  function resetForm() {
    setName("");
    setIcon("");
    setColor(PRESET_COLORS[4]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && editCategory) {
        await updateCategory(editCategory.id, {
          name: name.trim(),
          icon: icon.trim() || undefined,
          color: color || undefined,
        });
      } else {
        await createCategory({
          name: name.trim(),
          icon: icon.trim() || undefined,
          color: color || undefined,
        });
      }
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  // Sync form when editCategory changes
  function handleOpenChange(val: boolean) {
    if (val && editCategory) {
      setName(editCategory.name);
      setIcon(editCategory.icon ?? "");
      setColor(editCategory.color ?? PRESET_COLORS[4]);
    } else if (!val) {
      resetForm();
    }
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weapons"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-icon">Icon (emoji)</Label>
            <Input
              id="cat-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. ⚔️"
              maxLength={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                    outline: color === c ? "2px solid rgba(255,255,255,0.4)" : "none",
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer bg-transparent border border-input"
                title="Custom color"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-secondary/50">
            <span className="text-lg">{icon || "📦"}</span>
            <span
              className="text-sm font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: color + "33", color: color }}
            >
              {name || "Category Name"}
            </span>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
