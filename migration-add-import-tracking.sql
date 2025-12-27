-- Migration: Add import tracking to accounts table
-- Run this in Supabase SQL Editor to add import tracking features

-- Add new columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS last_import_date DATE,
ADD COLUMN IF NOT EXISTS import_source TEXT,
ADD COLUMN IF NOT EXISTS auto_import_enabled BOOLEAN DEFAULT true;

-- Update existing accounts with default import sources
UPDATE accounts 
SET import_source = 'leumi_csv', auto_import_enabled = true 
WHERE name = 'Leumi Bank Account' AND import_source IS NULL;

UPDATE accounts 
SET import_source = 'phoenix_csv', auto_import_enabled = true 
WHERE name = 'Phoenix Savings' AND import_source IS NULL;

UPDATE accounts 
SET import_source = 'ibi_csv', auto_import_enabled = true 
WHERE name = 'Fiverr Vested' AND import_source IS NULL;

-- Set auto_import_enabled to false for accounts that don't need imports
UPDATE accounts 
SET auto_import_enabled = false 
WHERE type IN ('crypto', 'retirement') AND auto_import_enabled IS NULL;

