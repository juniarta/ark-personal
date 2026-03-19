use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::models::*;
use crate::db::repository;
use crate::db::DbPool;

const VALID_TRANSACTION_TYPES: &[&str] = &["buy", "sell", "bid", "trade"];

#[tauri::command]
pub async fn create_transaction(
    db: State<'_, DbPool>,
    payload: CreateTransactionPayload,
) -> Result<Transaction, String> {
    // Validate transaction_type
    if !VALID_TRANSACTION_TYPES.contains(&payload.transaction_type.as_str()) {
        return Err(format!(
            "Invalid transaction_type '{}'. Must be one of: {}",
            payload.transaction_type,
            VALID_TRANSACTION_TYPES.join(", ")
        ));
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    let transaction = Transaction {
        id,
        transaction_type: payload.transaction_type,
        auction_id: payload.auction_id,
        inventory_item_id: payload.inventory_item_id,
        description: payload.description,
        ig_amount: payload.ig_amount,
        ig_currency: payload.ig_currency,
        real_amount: payload.real_amount,
        real_currency: payload.real_currency,
        counterparty: payload.counterparty,
        transaction_date: payload.transaction_date,
        notes: payload.notes,
        created_at: now.clone(),
        updated_at: now,
    };

    repository::insert_transaction(&db, &transaction)
        .await
        .map_err(|e| format!("Failed to create transaction: {}", e))?;

    Ok(transaction)
}

#[tauri::command]
pub async fn get_transactions(db: State<'_, DbPool>) -> Result<Vec<Transaction>, String> {
    repository::get_all_transactions(&db)
        .await
        .map_err(|e| format!("Failed to get transactions: {}", e))
}

#[tauri::command]
pub async fn get_transactions_by_type(
    db: State<'_, DbPool>,
    transaction_type: String,
) -> Result<Vec<Transaction>, String> {
    repository::get_transactions_by_type(&db, &transaction_type)
        .await
        .map_err(|e| format!("Failed to get transactions by type: {}", e))
}

#[tauri::command]
pub async fn get_transactions_by_date_range(
    db: State<'_, DbPool>,
    start_date: String,
    end_date: String,
) -> Result<Vec<Transaction>, String> {
    repository::get_transactions_by_date_range(&db, &start_date, &end_date)
        .await
        .map_err(|e| format!("Failed to get transactions by date range: {}", e))
}

#[tauri::command]
pub async fn update_transaction(
    db: State<'_, DbPool>,
    id: String,
    payload: UpdateTransactionPayload,
) -> Result<Transaction, String> {
    let now = Utc::now().to_rfc3339();
    repository::update_transaction(&db, &id, &payload, &now)
        .await
        .map_err(|e| format!("Failed to update transaction: {}", e))?
        .ok_or_else(|| format!("Transaction not found: {}", id))
}

#[tauri::command]
pub async fn delete_transaction(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    let deleted = repository::delete_transaction(&db, &id)
        .await
        .map_err(|e| format!("Failed to delete transaction: {}", e))?;

    if deleted {
        Ok(())
    } else {
        Err(format!("Transaction not found: {}", id))
    }
}

#[tauri::command]
pub async fn get_expense_summary(db: State<'_, DbPool>) -> Result<ExpenseSummary, String> {
    repository::get_expense_summary(&db)
        .await
        .map_err(|e| format!("Failed to get expense summary: {}", e))
}

#[tauri::command]
pub async fn get_income_summary(db: State<'_, DbPool>) -> Result<ExpenseSummary, String> {
    repository::get_income_summary(&db)
        .await
        .map_err(|e| format!("Failed to get income summary: {}", e))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyProfitLoss {
    pub currency: Option<String>,
    pub income: f64,
    pub expense: f64,
    pub profit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitLossSummary {
    pub ig: Vec<CurrencyProfitLoss>,
    pub real: Vec<CurrencyProfitLoss>,
}

#[tauri::command]
pub async fn get_profit_loss(db: State<'_, DbPool>) -> Result<ProfitLossSummary, String> {
    let income = repository::get_income_summary(&db)
        .await
        .map_err(|e| format!("Failed to get income summary: {}", e))?;
    let expenses = repository::get_expense_summary(&db)
        .await
        .map_err(|e| format!("Failed to get expense summary: {}", e))?;

    // Compute profit/loss per ig_currency
    let mut ig_map: std::collections::HashMap<Option<String>, (f64, f64)> =
        std::collections::HashMap::new();
    for s in &income.ig_totals {
        ig_map.entry(s.currency.clone()).or_default().0 += s.total;
    }
    for s in &expenses.ig_totals {
        ig_map.entry(s.currency.clone()).or_default().1 += s.total;
    }
    let ig: Vec<CurrencyProfitLoss> = ig_map
        .into_iter()
        .map(|(currency, (inc, exp))| CurrencyProfitLoss {
            currency,
            income: inc,
            expense: exp,
            profit: inc - exp,
        })
        .collect();

    // Compute profit/loss per real_currency
    let mut real_map: std::collections::HashMap<Option<String>, (f64, f64)> =
        std::collections::HashMap::new();
    for s in &income.real_totals {
        real_map.entry(s.currency.clone()).or_default().0 += s.total;
    }
    for s in &expenses.real_totals {
        real_map.entry(s.currency.clone()).or_default().1 += s.total;
    }
    let real: Vec<CurrencyProfitLoss> = real_map
        .into_iter()
        .map(|(currency, (inc, exp))| CurrencyProfitLoss {
            currency,
            income: inc,
            expense: exp,
            profit: inc - exp,
        })
        .collect();

    Ok(ProfitLossSummary { ig, real })
}

#[tauri::command]
pub async fn get_monthly_summary(
    db: State<'_, DbPool>,
) -> Result<Vec<MonthlySummaryRow>, String> {
    repository::get_monthly_summary(&db)
        .await
        .map_err(|e| format!("Failed to get monthly summary: {}", e))
}
