"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventoryStore } from "@/lib/store";
import type { CategoryField } from "@/lib/types";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
];

const FIELD_TYPE_VARIANT: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
  text: "secondary",
  number: "default",
  dropdown: "warning",
  date: "outline",
  boolean: "success",
};

interface CategoryFieldManagerProps {
  categoryId: string;
  fields: CategoryField[];
}

export function CategoryFieldManager({ categoryId, fields }: CategoryFieldManagerProps) {
  const { addField, removeField } = useInventoryStore();
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [options, setOptions] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldName.trim()) {
      setError("Field name is required");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const optionsJson =
        fieldType === "dropdown" && options.trim()
          ? JSON.stringify(options.split(",").map((o) => o.trim()).filter(Boolean))
          : undefined;
      await addField({
        category_id: categoryId,
        field_name: fieldName.trim(),
        field_type: fieldType,
        options: optionsJson,
        is_required: isRequired,
        sort_order: fields.length,
      });
      setFieldName("");
      setFieldType("text");
      setOptions("");
      setIsRequired(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeField(id);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Custom Fields
      </h3>

      {/* Existing fields */}
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">No custom fields yet.</p>
      ) : (
        <div className="space-y-1.5">
          {fields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-secondary/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{f.field_name}</span>
                {f.is_required && (
                  <span className="text-[10px] text-destructive font-semibold">*</span>
                )}
                <Badge variant={FIELD_TYPE_VARIANT[f.field_type] ?? "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                  {f.field_type}
                </Badge>
                {f.options && (
                  <span className="text-xs text-muted-foreground truncate">
                    {(() => {
                      try {
                        return (JSON.parse(f.options) as string[]).join(", ");
                      } catch {
                        return f.options;
                      }
                    })()}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(f.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add field form */}
      <form onSubmit={handleAddField} className="space-y-3 border border-dashed border-border rounded-md p-3">
        <p className="text-xs font-medium text-muted-foreground">Add Field</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="Field name"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {fieldType === "dropdown" && (
          <div className="space-y-1">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Option1, Option2, Option3"
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="field-required"
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary"
          />
          <Label htmlFor="field-required" className="text-xs cursor-pointer">Required</Label>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" size="sm" disabled={adding} className="h-7 text-xs w-full">
          <Plus className="h-3 w-3 mr-1" />
          {adding ? "Adding..." : "Add Field"}
        </Button>
      </form>
    </div>
  );
}
