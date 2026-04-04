-- ============================================================
-- DishaSetu Database Migration: 005_add_miro_support.sql
-- Add support for Miro board integration per floor
-- ============================================================

-- Add miro_board_id to floors table
ALTER TABLE floors ADD COLUMN IF NOT EXISTS miro_board_id TEXT;
ALTER TABLE floors ADD COLUMN IF NOT EXISTS last_miro_sync TIMESTAMP WITH TIME ZONE;
