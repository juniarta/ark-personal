use sqlx::SqlitePool;

use super::models::*;

// ─── Auction CRUD ───────────────────────────────────────────────────────────

pub async fn insert_auction(pool: &SqlitePool, auction: &Auction) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO auctions
           (id, title, category, source_link, source_type, source_post_id,
            duration_type, start_time, end_time, start_time_source,
            current_bid, bid_currency, min_increment, increment_currency,
            pickup_server, status, notes, raw_post_text, created_at, updated_at)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)"#,
    )
    .bind(&auction.id)
    .bind(&auction.title)
    .bind(&auction.category)
    .bind(&auction.source_link)
    .bind(&auction.source_type)
    .bind(&auction.source_post_id)
    .bind(&auction.duration_type)
    .bind(&auction.start_time)
    .bind(&auction.end_time)
    .bind(&auction.start_time_source)
    .bind(auction.current_bid)
    .bind(&auction.bid_currency)
    .bind(auction.min_increment)
    .bind(&auction.increment_currency)
    .bind(&auction.pickup_server)
    .bind(&auction.status)
    .bind(&auction.notes)
    .bind(&auction.raw_post_text)
    .bind(&auction.created_at)
    .bind(&auction.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_auction_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Auction>, sqlx::Error> {
    sqlx::query_as::<_, Auction>("SELECT * FROM auctions WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn get_active_auctions(pool: &SqlitePool) -> Result<Vec<Auction>, sqlx::Error> {
    sqlx::query_as::<_, Auction>(
        "SELECT * FROM auctions WHERE status = 'active' ORDER BY end_time ASC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_auctions_by_status(
    pool: &SqlitePool,
    status: &str,
) -> Result<Vec<Auction>, sqlx::Error> {
    sqlx::query_as::<_, Auction>(
        "SELECT * FROM auctions WHERE status = ?1 ORDER BY end_time ASC",
    )
    .bind(status)
    .fetch_all(pool)
    .await
}

pub async fn get_auctions_by_category(
    pool: &SqlitePool,
    category: &str,
) -> Result<Vec<Auction>, sqlx::Error> {
    sqlx::query_as::<_, Auction>(
        "SELECT * FROM auctions WHERE category = ?1 ORDER BY end_time ASC",
    )
    .bind(category)
    .fetch_all(pool)
    .await
}

pub async fn update_auction(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateAuctionPayload,
    updated_at: &str,
) -> Result<Option<Auction>, sqlx::Error> {
    // Build dynamic UPDATE — only update fields that are Some
    let existing = get_auction_by_id(pool, id).await?;
    let existing = match existing {
        Some(a) => a,
        None => return Ok(None),
    };

    let title = payload.title.as_deref().unwrap_or(&existing.title);
    let category = payload.category.as_ref().or(existing.category.as_ref());
    let current_bid = payload.current_bid.or(existing.current_bid);
    let bid_currency = payload.bid_currency.as_ref().or(existing.bid_currency.as_ref());
    let status = payload.status.as_deref().unwrap_or(&existing.status);
    let notes = payload.notes.as_ref().or(existing.notes.as_ref());
    let end_time = payload.end_time.as_deref().unwrap_or(&existing.end_time);

    sqlx::query(
        r#"UPDATE auctions SET
            title = ?1, category = ?2, current_bid = ?3, bid_currency = ?4,
            status = ?5, notes = ?6, end_time = ?7, updated_at = ?8
           WHERE id = ?9"#,
    )
    .bind(title)
    .bind(category)
    .bind(current_bid)
    .bind(bid_currency)
    .bind(status)
    .bind(notes)
    .bind(end_time)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_auction_by_id(pool, id).await
}

pub async fn delete_auction(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM auctions WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

// ─── Auction Reminders ──────────────────────────────────────────────────────

pub async fn insert_reminder(
    pool: &SqlitePool,
    reminder: &AuctionReminder,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO auction_reminders
           (id, auction_id, remind_before_m, remind_at, is_sent, sent_at, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
    )
    .bind(&reminder.id)
    .bind(&reminder.auction_id)
    .bind(reminder.remind_before_m)
    .bind(&reminder.remind_at)
    .bind(reminder.is_sent as i32)
    .bind(&reminder.sent_at)
    .bind(&reminder.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_pending_reminders(
    pool: &SqlitePool,
    now: &str,
) -> Result<Vec<AuctionReminder>, sqlx::Error> {
    let rows = sqlx::query_as::<_, AuctionReminderRow>(
        "SELECT * FROM auction_reminders WHERE is_sent = 0 AND remind_at <= ?1 ORDER BY remind_at ASC",
    )
    .bind(now)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(AuctionReminder::from).collect())
}

pub async fn mark_reminder_sent(
    pool: &SqlitePool,
    id: &str,
    sent_at: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE auction_reminders SET is_sent = 1, sent_at = ?1 WHERE id = ?2")
        .bind(sent_at)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_reminders_for_auction(
    pool: &SqlitePool,
    auction_id: &str,
) -> Result<Vec<AuctionReminder>, sqlx::Error> {
    let rows = sqlx::query_as::<_, AuctionReminderRow>(
        "SELECT * FROM auction_reminders WHERE auction_id = ?1 ORDER BY remind_at ASC",
    )
    .bind(auction_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(AuctionReminder::from).collect())
}

// ─── Expired Auctions ───────────────────────────────────────────────────────

pub async fn expire_past_auctions(
    pool: &SqlitePool,
    now: &str,
    updated_at: &str,
) -> Result<u64, sqlx::Error> {
    let result = sqlx::query(
        "UPDATE auctions SET status = 'expired', updated_at = ?1 WHERE status = 'active' AND end_time <= ?2",
    )
    .bind(updated_at)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

// ─── Alarm CRUD ─────────────────────────────────────────────────────────────

pub async fn insert_alarm(pool: &SqlitePool, alarm: &Alarm) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO alarms
           (id, label, alarm_type, trigger_at, duration_ms, is_active, repeat_rule, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
    )
    .bind(&alarm.id)
    .bind(&alarm.label)
    .bind(&alarm.alarm_type)
    .bind(&alarm.trigger_at)
    .bind(alarm.duration_ms)
    .bind(alarm.is_active as i32)
    .bind(&alarm.repeat_rule)
    .bind(&alarm.created_at)
    .bind(&alarm.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_alarms(pool: &SqlitePool) -> Result<Vec<Alarm>, sqlx::Error> {
    let rows = sqlx::query_as::<_, AlarmRow>("SELECT * FROM alarms ORDER BY created_at DESC")
        .fetch_all(pool)
        .await?;
    Ok(rows.into_iter().map(Alarm::from).collect())
}

pub async fn get_alarm_by_id(pool: &SqlitePool, id: &str) -> Result<Option<Alarm>, sqlx::Error> {
    let row = sqlx::query_as::<_, AlarmRow>("SELECT * FROM alarms WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(row.map(Alarm::from))
}

pub async fn update_alarm_record(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateAlarmPayload,
    updated_at: &str,
) -> Result<Option<Alarm>, sqlx::Error> {
    let existing = get_alarm_by_id(pool, id).await?;
    let existing = match existing {
        Some(a) => a,
        None => return Ok(None),
    };

    let label = payload.label.as_deref().unwrap_or(&existing.label);
    let trigger_at = payload.trigger_at.as_ref().or(existing.trigger_at.as_ref());
    let duration_ms = payload.duration_ms.or(existing.duration_ms);
    let is_active = payload.is_active.unwrap_or(existing.is_active) as i32;
    let repeat_rule = payload.repeat_rule.as_ref().or(existing.repeat_rule.as_ref());

    sqlx::query(
        r#"UPDATE alarms SET
            label = ?1, trigger_at = ?2, duration_ms = ?3,
            is_active = ?4, repeat_rule = ?5, updated_at = ?6
           WHERE id = ?7"#,
    )
    .bind(label)
    .bind(trigger_at)
    .bind(duration_ms)
    .bind(is_active)
    .bind(repeat_rule)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_alarm_by_id(pool, id).await
}

pub async fn delete_alarm_record(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM alarms WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn set_alarm_active(
    pool: &SqlitePool,
    id: &str,
    active: bool,
    updated_at: &str,
) -> Result<Option<Alarm>, sqlx::Error> {
    sqlx::query("UPDATE alarms SET is_active = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(active as i32)
        .bind(updated_at)
        .bind(id)
        .execute(pool)
        .await?;
    get_alarm_by_id(pool, id).await
}

// ─── Settings ───────────────────────────────────────────────────────────────

pub async fn get_setting(pool: &SqlitePool, key: &str) -> Result<Option<String>, sqlx::Error> {
    let row: Option<Setting> =
        sqlx::query_as::<_, Setting>("SELECT key, value FROM settings WHERE key = ?1")
            .bind(key)
            .fetch_optional(pool)
            .await?;
    Ok(row.map(|s| s.value))
}

pub async fn set_setting(
    pool: &SqlitePool,
    key: &str,
    value: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

// ─── Transmitter Server CRUD ────────────────────────────────────────────────

pub async fn insert_transmitter_server(
    pool: &SqlitePool,
    server: &TransmitterServer,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO transmitter_servers
           (id, server_name, server_id, map_name, cluster_id, is_pvp,
            timer_duration_s, is_running, started_at, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"#,
    )
    .bind(&server.id)
    .bind(&server.server_name)
    .bind(&server.server_id)
    .bind(&server.map_name)
    .bind(&server.cluster_id)
    .bind(server.is_pvp as i32)
    .bind(server.timer_duration_s)
    .bind(server.is_running as i32)
    .bind(&server.started_at)
    .bind(&server.created_at)
    .bind(&server.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_transmitter_servers(
    pool: &SqlitePool,
) -> Result<Vec<TransmitterServer>, sqlx::Error> {
    let rows = sqlx::query_as::<_, TransmitterServerRow>(
        "SELECT * FROM transmitter_servers ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(TransmitterServer::from).collect())
}

pub async fn get_transmitter_server_by_id(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<TransmitterServer>, sqlx::Error> {
    let row = sqlx::query_as::<_, TransmitterServerRow>(
        "SELECT * FROM transmitter_servers WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(TransmitterServer::from))
}

pub async fn update_transmitter_server(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateTransmitterPayload,
    updated_at: &str,
) -> Result<Option<TransmitterServer>, sqlx::Error> {
    let existing = get_transmitter_server_by_id(pool, id).await?;
    let existing = match existing {
        Some(s) => s,
        None => return Ok(None),
    };

    let server_name = payload.server_name.as_deref().unwrap_or(&existing.server_name);
    let server_id = payload.server_id.as_ref().or(existing.server_id.as_ref());
    let map_name = payload.map_name.as_ref().or(existing.map_name.as_ref());
    let cluster_id = payload.cluster_id.as_ref().or(existing.cluster_id.as_ref());
    let is_pvp = payload.is_pvp.unwrap_or(existing.is_pvp) as i32;
    let timer_duration_s = payload.timer_duration_s.unwrap_or(existing.timer_duration_s);

    sqlx::query(
        r#"UPDATE transmitter_servers SET
            server_name = ?1, server_id = ?2, map_name = ?3, cluster_id = ?4,
            is_pvp = ?5, timer_duration_s = ?6, updated_at = ?7
           WHERE id = ?8"#,
    )
    .bind(server_name)
    .bind(server_id)
    .bind(map_name)
    .bind(cluster_id)
    .bind(is_pvp)
    .bind(timer_duration_s)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_transmitter_server_by_id(pool, id).await
}

pub async fn delete_transmitter_server(
    pool: &SqlitePool,
    id: &str,
) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM transmitter_servers WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn start_transmitter_timer(
    pool: &SqlitePool,
    id: &str,
    now: &str,
) -> Result<Option<TransmitterServer>, sqlx::Error> {
    sqlx::query(
        "UPDATE transmitter_servers SET is_running = 1, started_at = ?1, updated_at = ?1 WHERE id = ?2",
    )
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    get_transmitter_server_by_id(pool, id).await
}

pub async fn stop_transmitter_timer(
    pool: &SqlitePool,
    id: &str,
    now: &str,
) -> Result<Option<TransmitterServer>, sqlx::Error> {
    sqlx::query(
        "UPDATE transmitter_servers SET is_running = 0, updated_at = ?1 WHERE id = ?2",
    )
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    get_transmitter_server_by_id(pool, id).await
}

pub async fn reset_transmitter_timer(
    pool: &SqlitePool,
    id: &str,
    now: &str,
) -> Result<Option<TransmitterServer>, sqlx::Error> {
    sqlx::query(
        "UPDATE transmitter_servers SET started_at = ?1, is_running = 1, updated_at = ?1 WHERE id = ?2",
    )
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;
    get_transmitter_server_by_id(pool, id).await
}

// ─── Category CRUD ─────────────────────────────────────────────────────────

pub async fn insert_category(pool: &SqlitePool, category: &Category) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO categories
           (id, name, icon, color, sort_order, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
    )
    .bind(&category.id)
    .bind(&category.name)
    .bind(&category.icon)
    .bind(&category.color)
    .bind(category.sort_order)
    .bind(&category.created_at)
    .bind(&category.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_categories(pool: &SqlitePool) -> Result<Vec<Category>, sqlx::Error> {
    sqlx::query_as::<_, Category>(
        "SELECT * FROM categories ORDER BY sort_order ASC, name ASC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_category_by_id(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<Category>, sqlx::Error> {
    sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn update_category(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateCategoryPayload,
    updated_at: &str,
) -> Result<Option<Category>, sqlx::Error> {
    let existing = get_category_by_id(pool, id).await?;
    let existing = match existing {
        Some(c) => c,
        None => return Ok(None),
    };

    let name = payload.name.as_deref().unwrap_or(&existing.name);
    let icon = payload.icon.as_ref().or(existing.icon.as_ref());
    let color = payload.color.as_ref().or(existing.color.as_ref());
    let sort_order = payload.sort_order.unwrap_or(existing.sort_order);

    sqlx::query(
        r#"UPDATE categories SET
            name = ?1, icon = ?2, color = ?3, sort_order = ?4, updated_at = ?5
           WHERE id = ?6"#,
    )
    .bind(name)
    .bind(icon)
    .bind(color)
    .bind(sort_order)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_category_by_id(pool, id).await
}

pub async fn delete_category(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM categories WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

// ─── Category Fields ───────────────────────────────────────────────────────

pub async fn insert_category_field(
    pool: &SqlitePool,
    field: &CategoryField,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO category_fields
           (id, category_id, field_name, field_type, options, is_required, sort_order, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"#,
    )
    .bind(&field.id)
    .bind(&field.category_id)
    .bind(&field.field_name)
    .bind(&field.field_type)
    .bind(&field.options)
    .bind(field.is_required as i32)
    .bind(field.sort_order)
    .bind(&field.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_fields_by_category(
    pool: &SqlitePool,
    category_id: &str,
) -> Result<Vec<CategoryField>, sqlx::Error> {
    let rows = sqlx::query_as::<_, CategoryFieldRow>(
        "SELECT * FROM category_fields WHERE category_id = ?1 ORDER BY sort_order ASC",
    )
    .bind(category_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(CategoryField::from).collect())
}

pub async fn delete_category_field(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM category_fields WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

// ─── Inventory Item CRUD ───────────────────────────────────────────────────

pub async fn insert_inventory_item(
    pool: &SqlitePool,
    item: &InventoryItem,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO inventory_items
           (id, category_id, auction_id, name, quantity, field_data, status,
            acquired_at, notes, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"#,
    )
    .bind(&item.id)
    .bind(&item.category_id)
    .bind(&item.auction_id)
    .bind(&item.name)
    .bind(item.quantity)
    .bind(&item.field_data)
    .bind(&item.status)
    .bind(&item.acquired_at)
    .bind(&item.notes)
    .bind(&item.created_at)
    .bind(&item.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_inventory_items(
    pool: &SqlitePool,
) -> Result<Vec<InventoryItem>, sqlx::Error> {
    sqlx::query_as::<_, InventoryItem>(
        "SELECT * FROM inventory_items ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_inventory_by_category(
    pool: &SqlitePool,
    category_id: &str,
) -> Result<Vec<InventoryItem>, sqlx::Error> {
    sqlx::query_as::<_, InventoryItem>(
        "SELECT * FROM inventory_items WHERE category_id = ?1 ORDER BY created_at DESC",
    )
    .bind(category_id)
    .fetch_all(pool)
    .await
}

pub async fn get_inventory_item_by_id(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<InventoryItem>, sqlx::Error> {
    sqlx::query_as::<_, InventoryItem>("SELECT * FROM inventory_items WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn update_inventory_item(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateInventoryItemPayload,
    updated_at: &str,
) -> Result<Option<InventoryItem>, sqlx::Error> {
    let existing = get_inventory_item_by_id(pool, id).await?;
    let existing = match existing {
        Some(i) => i,
        None => return Ok(None),
    };

    let name = payload.name.as_deref().unwrap_or(&existing.name);
    let quantity = payload.quantity.unwrap_or(existing.quantity);
    let field_data = payload.field_data.as_ref().or(existing.field_data.as_ref());
    let status = payload.status.as_deref().unwrap_or(&existing.status);
    let notes = payload.notes.as_ref().or(existing.notes.as_ref());

    sqlx::query(
        r#"UPDATE inventory_items SET
            name = ?1, quantity = ?2, field_data = ?3, status = ?4,
            notes = ?5, updated_at = ?6
           WHERE id = ?7"#,
    )
    .bind(name)
    .bind(quantity)
    .bind(field_data)
    .bind(status)
    .bind(notes)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_inventory_item_by_id(pool, id).await
}

pub async fn delete_inventory_item(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM inventory_items WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn search_inventory_items(
    pool: &SqlitePool,
    query: &str,
) -> Result<Vec<InventoryItem>, sqlx::Error> {
    let pattern = format!("%{}%", query);
    sqlx::query_as::<_, InventoryItem>(
        "SELECT * FROM inventory_items WHERE name LIKE ?1 OR notes LIKE ?1 ORDER BY created_at DESC",
    )
    .bind(&pattern)
    .fetch_all(pool)
    .await
}

pub async fn count_items_by_category(
    pool: &SqlitePool,
) -> Result<Vec<CategoryItemCount>, sqlx::Error> {
    sqlx::query_as::<_, CategoryItemCount>(
        "SELECT category_id, CAST(COUNT(*) AS INTEGER) as count FROM inventory_items GROUP BY category_id",
    )
    .fetch_all(pool)
    .await
}

// ─── Transaction CRUD ──────────────────────────────────────────────────────

pub async fn insert_transaction(
    pool: &SqlitePool,
    transaction: &Transaction,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO transactions
           (id, transaction_type, auction_id, inventory_item_id, description,
            ig_amount, ig_currency, real_amount, real_currency, counterparty,
            transaction_date, notes, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"#,
    )
    .bind(&transaction.id)
    .bind(&transaction.transaction_type)
    .bind(&transaction.auction_id)
    .bind(&transaction.inventory_item_id)
    .bind(&transaction.description)
    .bind(transaction.ig_amount)
    .bind(&transaction.ig_currency)
    .bind(transaction.real_amount)
    .bind(&transaction.real_currency)
    .bind(&transaction.counterparty)
    .bind(&transaction.transaction_date)
    .bind(&transaction.notes)
    .bind(&transaction.created_at)
    .bind(&transaction.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_all_transactions(pool: &SqlitePool) -> Result<Vec<Transaction>, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        "SELECT * FROM transactions ORDER BY transaction_date DESC",
    )
    .fetch_all(pool)
    .await
}

pub async fn get_transactions_by_type(
    pool: &SqlitePool,
    transaction_type: &str,
) -> Result<Vec<Transaction>, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        "SELECT * FROM transactions WHERE transaction_type = ?1 ORDER BY transaction_date DESC",
    )
    .bind(transaction_type)
    .fetch_all(pool)
    .await
}

pub async fn get_transactions_by_date_range(
    pool: &SqlitePool,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<Transaction>, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        "SELECT * FROM transactions WHERE transaction_date >= ?1 AND transaction_date <= ?2 ORDER BY transaction_date DESC",
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(pool)
    .await
}

pub async fn get_transaction_by_id(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<Transaction>, sqlx::Error> {
    sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn update_transaction(
    pool: &SqlitePool,
    id: &str,
    payload: &UpdateTransactionPayload,
    updated_at: &str,
) -> Result<Option<Transaction>, sqlx::Error> {
    let existing = get_transaction_by_id(pool, id).await?;
    let existing = match existing {
        Some(t) => t,
        None => return Ok(None),
    };

    let description = payload.description.as_deref().unwrap_or(&existing.description);
    let ig_amount = payload.ig_amount.or(existing.ig_amount);
    let ig_currency = payload.ig_currency.as_ref().or(existing.ig_currency.as_ref());
    let real_amount = payload.real_amount.or(existing.real_amount);
    let real_currency = payload.real_currency.as_ref().or(existing.real_currency.as_ref());
    let counterparty = payload.counterparty.as_ref().or(existing.counterparty.as_ref());
    let notes = payload.notes.as_ref().or(existing.notes.as_ref());

    sqlx::query(
        r#"UPDATE transactions SET
            description = ?1, ig_amount = ?2, ig_currency = ?3,
            real_amount = ?4, real_currency = ?5, counterparty = ?6,
            notes = ?7, updated_at = ?8
           WHERE id = ?9"#,
    )
    .bind(description)
    .bind(ig_amount)
    .bind(ig_currency)
    .bind(real_amount)
    .bind(real_currency)
    .bind(counterparty)
    .bind(notes)
    .bind(updated_at)
    .bind(id)
    .execute(pool)
    .await?;

    get_transaction_by_id(pool, id).await
}

pub async fn delete_transaction(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM transactions WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(result.rows_affected() > 0)
}

pub async fn get_expense_summary(pool: &SqlitePool) -> Result<ExpenseSummary, sqlx::Error> {
    let ig_totals = sqlx::query_as::<_, CurrencySummary>(
        r#"SELECT ig_currency as currency, COALESCE(SUM(ig_amount), 0.0) as total
           FROM transactions
           WHERE transaction_type IN ('buy', 'bid') AND ig_amount IS NOT NULL
           GROUP BY ig_currency"#,
    )
    .fetch_all(pool)
    .await?;

    let real_totals = sqlx::query_as::<_, CurrencySummary>(
        r#"SELECT real_currency as currency, COALESCE(SUM(real_amount), 0.0) as total
           FROM transactions
           WHERE transaction_type IN ('buy', 'bid') AND real_amount IS NOT NULL
           GROUP BY real_currency"#,
    )
    .fetch_all(pool)
    .await?;

    Ok(ExpenseSummary {
        ig_totals,
        real_totals,
    })
}

pub async fn get_income_summary(pool: &SqlitePool) -> Result<ExpenseSummary, sqlx::Error> {
    let ig_totals = sqlx::query_as::<_, CurrencySummary>(
        r#"SELECT ig_currency as currency, COALESCE(SUM(ig_amount), 0.0) as total
           FROM transactions
           WHERE transaction_type = 'sell' AND ig_amount IS NOT NULL
           GROUP BY ig_currency"#,
    )
    .fetch_all(pool)
    .await?;

    let real_totals = sqlx::query_as::<_, CurrencySummary>(
        r#"SELECT real_currency as currency, COALESCE(SUM(real_amount), 0.0) as total
           FROM transactions
           WHERE transaction_type = 'sell' AND real_amount IS NOT NULL
           GROUP BY real_currency"#,
    )
    .fetch_all(pool)
    .await?;

    Ok(ExpenseSummary {
        ig_totals,
        real_totals,
    })
}

pub async fn get_monthly_summary(
    pool: &SqlitePool,
) -> Result<Vec<MonthlySummaryRow>, sqlx::Error> {
    sqlx::query_as::<_, MonthlySummaryRow>(
        r#"SELECT
            strftime('%Y-%m', transaction_date) as month,
            COALESCE(SUM(CASE WHEN transaction_type IN ('buy', 'bid') THEN ig_amount ELSE 0 END), 0.0) as ig_expense,
            COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN ig_amount ELSE 0 END), 0.0) as ig_income,
            COALESCE(SUM(CASE WHEN transaction_type IN ('buy', 'bid') THEN real_amount ELSE 0 END), 0.0) as real_expense,
            COALESCE(SUM(CASE WHEN transaction_type = 'sell' THEN real_amount ELSE 0 END), 0.0) as real_income
           FROM transactions
           GROUP BY strftime('%Y-%m', transaction_date)
           ORDER BY month DESC"#,
    )
    .fetch_all(pool)
    .await
}
