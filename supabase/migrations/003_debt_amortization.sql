-- Migration 003: Debt Amortization Tracking
-- Add columns to track loan origination and term for amortization schedule comparison

-- Add origination_date column (when the debt was first taken out)
ALTER TABLE debts ADD COLUMN origination_date DATE;

-- Add term_months column (original loan term in months)
ALTER TABLE debts ADD COLUMN term_months INTEGER;

-- Both columns are nullable for backward compatibility with existing debts
-- Only amortizing debts (mortgage, auto, student, personal, etc.) need these fields
-- Credit cards, BNPL, and similar revolving debts don't have amortization schedules

-- No RLS changes needed - existing RLS policies will cover these new columns
