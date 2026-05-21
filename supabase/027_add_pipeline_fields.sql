-- Add sudah_booking_fee and sudah_visit boolean fields to konsumen table
ALTER TABLE konsumen ADD COLUMN IF NOT EXISTS sudah_booking_fee boolean NOT NULL DEFAULT false;
ALTER TABLE konsumen ADD COLUMN IF NOT EXISTS sudah_visit       boolean NOT NULL DEFAULT false;
