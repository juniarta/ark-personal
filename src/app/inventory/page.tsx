"use client";

import { useEffect, useState } from "react";
import { Plus, Package, Pencil, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInventoryStore } from "@/lib/store";
import { CategoryForm } from "@/components/CategoryForm";
import { InventoryItemForm } from "@/components/InventoryItemForm";
import { CategoryFieldManager } from "@/components/CategoryFieldManager";
import type { Category, InventoryItem } from "@/lib/types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  owned: "success",
  sold: "secondary",
  traded: "warning",
  lost: "destructive",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function InventoryPage() {
  const {
    categories,
    items,
    fields,
    loading,
    fetchCategories,
    fetchItemsByCategory,
    fetchCategoryFields,
    deleteCategory,
    deleteItem,
  } = useInventoryStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [fieldsDialogOpen, setFieldsDialogOpen] = useState(false);
  const [fieldsDialogCat, setFieldsDialogCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchItemsByCategory(selectedCategoryId);
      fetchCategoryFields(selectedCategoryId);
    }
  }, [selectedCategoryId, fetchItemsByCategory, fetchCategoryFields]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  // Item counts per category
  const itemCountMap: Record<string, number> = {};
  items.forEach((item) => {
    if (!itemCountMap[item.category_id]) itemCountMap[item.category_id] = 0;
    if (item.category_id === selectedCategoryId) itemCountMap[item.category_id]++;
  });

  async function handleDeleteCategory(id: string) {
    if (!confirm("Delete this category and all its items?")) return;
    setDeletingCat(id);
    try {
      await deleteCategory(id);
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    } finally {
      setDeletingCat(null);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    setDeletingItem(id);
    try {
      await deleteItem(id);
    } finally {
      setDeletingItem(null);
    }
  }

  function openCategoryEdit(cat: Category) {
    setEditCategory(cat);
    setCatFormOpen(true);
  }

  function openItemEdit(item: InventoryItem) {
    setEditItem(item);
    setItemFormOpen(true);
  }

  function openFieldsDialog(cat: Category) {
    setFieldsDialogCat(cat);
    setFieldsDialogOpen(true);
    fetchCategoryFields(cat.id);
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setEditCategory(null);
              setCatFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {categories.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No categories yet.
              <br />
              Create one to get started.
            </p>
          )}
          {categories.map((cat) => {
            const isActive = cat.id === selectedCategoryId;
            return (
              <div key={cat.id} className="group relative">
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <span className="text-base shrink-0">{cat.icon ?? "📦"}</span>
                  <span className="flex-1 truncate font-medium">{cat.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={
                      cat.color
                        ? { backgroundColor: cat.color + "33", color: cat.color }
                        : {}
                    }
                  >
                    {isActive ? items.length : "—"}
                  </span>
                </button>
                {/* Actions shown on hover */}
                <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); openFieldsDialog(cat); }}
                    title="Manage fields"
                  >
                    <Settings2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); openCategoryEdit(cat); }}
                    title="Edit category"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    disabled={deletingCat === cat.id}
                    title="Delete category"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-y-auto p-6">
        {!selectedCategory ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">No Category Selected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a category from the sidebar or create a new one to view items.
            </p>
            <Button
              variant="outline"
              onClick={() => { setEditCategory(null); setCatFormOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Category
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCategory.icon ?? "📦"}</span>
                <div>
                  <h1 className="text-xl font-bold">{selectedCategory.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditItem(null);
                  setItemFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <Separator />

            {/* Items table */}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">No items in this category.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditItem(null);
                      setItemFormOpen(true);
                    }}
                  >
                    Add your first item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">Qty</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Acquired</th>
                      <th className="px-4 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">
                          {item.name}
                          {item.notes && (
                            <span className="ml-2 text-xs text-muted-foreground">— {item.notes}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{item.quantity}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={STATUS_VARIANTS[item.status] ?? "secondary"} className="capitalize text-[10px]">
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {formatDate(item.acquired_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openItemEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItem === item.id}
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
          </div>
        )}
      </main>

      {/* Category Form Dialog */}
      <CategoryForm
        open={catFormOpen}
        onOpenChange={(v) => {
          setCatFormOpen(v);
          if (!v) setEditCategory(null);
        }}
        editCategory={editCategory}
        onSuccess={fetchCategories}
      />

      {/* Item Form Dialog */}
      {selectedCategory && (
        <InventoryItemForm
          open={itemFormOpen}
          onOpenChange={(v) => {
            setItemFormOpen(v);
            if (!v) setEditItem(null);
          }}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          fields={fields}
          editItem={editItem}
          onSuccess={() => {
            if (selectedCategoryId) fetchItemsByCategory(selectedCategoryId);
          }}
        />
      )}

      {/* Fields Manager Dialog */}
      <Dialog
        open={fieldsDialogOpen}
        onOpenChange={(v) => {
          setFieldsDialogOpen(v);
          if (!v) setFieldsDialogCat(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {fieldsDialogCat?.icon ?? "📦"} {fieldsDialogCat?.name ?? ""} — Custom Fields
            </DialogTitle>
          </DialogHeader>
          {fieldsDialogCat && (
            <CategoryFieldManager
              categoryId={fieldsDialogCat.id}
              fields={selectedCategoryId === fieldsDialogCat.id ? fields : []}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
