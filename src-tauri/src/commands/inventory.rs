use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;

const VALID_FIELD_TYPES: &[&str] = &["text", "number", "dropdown", "date", "boolean"];

// ─── Category Commands ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_category(
    db: State<'_, DbPool>,
    payload: CreateCategoryPayload,
) -> Result<Category, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let category = Category {
        id,
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        sort_order: payload.sort_order.unwrap_or(0),
        created_at: now.clone(),
        updated_at: now,
    };

    repository::insert_category(&db, &category)
        .await
        .map_err(|e| format!("Failed to create category: {}", e))?;

    Ok(category)
}

#[tauri::command]
pub async fn get_categories(db: State<'_, DbPool>) -> Result<Vec<Category>, String> {
    repository::get_all_categories(&db)
        .await
        .map_err(|e| format!("Failed to get categories: {}", e))
}

#[tauri::command]
pub async fn update_category(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateCategoryPayload,
) -> Result<Category, String> {
    let now = Utc::now().to_rfc3339();
    repository::update_category(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update category: {}", e))?
        .ok_or_else(|| format!("Category not found: {}", id))
}

#[tauri::command]
pub async fn delete_category(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_category(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete category: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Category not found: {}", id))
    }
}

// ─── Category Field Commands ───────────────────────────────────────────────

#[tauri::command]
pub async fn add_category_field(
    db: State<'_, DbPool>,
    payload: CreateCategoryFieldPayload,
) -> Result<CategoryField, String> {
    // Validate field_type
    if !VALID_FIELD_TYPES.contains(&payload.field_type.as_str()) {
        return Err(format!(
            "Invalid field_type '{}'. Must be one of: {}",
            payload.field_type,
            VALID_FIELD_TYPES.join(", ")
        ));
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let field = CategoryField {
        id,
        category_id: payload.category_id,
        field_name: payload.field_name,
        field_type: payload.field_type,
        options: payload.options,
        is_required: payload.is_required.unwrap_or(false),
        sort_order: payload.sort_order.unwrap_or(0),
        created_at: now,
    };

    repository::insert_category_field(&db, &field)
        .await
        .map_err(|e| format!("Failed to add category field: {}", e))?;

    Ok(field)
}

#[tauri::command]
pub async fn get_category_fields(
    db: State<'_, DbPool>,
    category_id: String,
) -> Result<Vec<CategoryField>, String> {
    repository::get_fields_by_category(&db, &category_id)
        .await
        .map_err(|e| format!("Failed to get category fields: {}", e))
}

#[tauri::command]
pub async fn remove_category_field(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_category_field(&db, &id)
        .await
        .map_err(|e| format!("Failed to remove category field: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Category field not found: {}", id))
    }
}

// ─── Inventory Item Commands ───────────────────────────────────────────────

#[tauri::command]
pub async fn create_inventory_item(
    db: State<'_, DbPool>,
    payload: CreateInventoryItemPayload,
) -> Result<InventoryItem, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let item = InventoryItem {
        id,
        category_id: payload.category_id,
        auction_id: payload.auction_id,
        name: payload.name,
        quantity: payload.quantity.unwrap_or(1),
        field_data: payload.field_data,
        status: payload.status.unwrap_or_else(|| "owned".to_string()),
        acquired_at: payload.acquired_at,
        notes: payload.notes,
        created_at: now.clone(),
        updated_at: now,
    };

    repository::insert_inventory_item(&db, &item)
        .await
        .map_err(|e| format!("Failed to create inventory item: {}", e))?;

    Ok(item)
}

#[tauri::command]
pub async fn get_inventory_items(db: State<'_, DbPool>) -> Result<Vec<InventoryItem>, String> {
    repository::get_all_inventory_items(&db)
        .await
        .map_err(|e| format!("Failed to get inventory items: {}", e))
}

#[tauri::command]
pub async fn get_inventory_by_category(
    db: State<'_, DbPool>,
    category_id: String,
) -> Result<Vec<InventoryItem>, String> {
    repository::get_inventory_by_category(&db, &category_id)
        .await
        .map_err(|e| format!("Failed to get inventory by category: {}", e))
}

#[tauri::command]
pub async fn update_inventory_item(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateInventoryItemPayload,
) -> Result<InventoryItem, String> {
    let now = Utc::now().to_rfc3339();
    repository::update_inventory_item(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update inventory item: {}", e))?
        .ok_or_else(|| format!("Inventory item not found: {}", id))
}

#[tauri::command]
pub async fn delete_inventory_item(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_inventory_item(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete inventory item: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Inventory item not found: {}", id))
    }
}

#[tauri::command]
pub async fn search_inventory(
    db: State<'_, DbPool>,
    query: String,
) -> Result<Vec<InventoryItem>, String> {
    repository::search_inventory_items(&db, &query)
        .await
        .map_err(|e| format!("Failed to search inventory: {}", e))
}
