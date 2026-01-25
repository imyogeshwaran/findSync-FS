-- Add delivery status tracking to Messages table
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS delivery_status ENUM('pending', 'sent', 'delivered', 'read') DEFAULT 'pending';
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL;

-- Add indexes for faster queries (safe to run even if columns exist)
ALTER TABLE Messages ADD INDEX IF NOT EXISTS idx_delivery_status (delivery_status);
ALTER TABLE Messages ADD INDEX IF NOT EXISTS idx_contact_delivery (contact_id, delivery_status);
