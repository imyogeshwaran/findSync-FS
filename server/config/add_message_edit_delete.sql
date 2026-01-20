-- Add edit and delete functionality to Messages table
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP NULL;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS original_message TEXT;

-- Create index for deleted messages query
CREATE INDEX IF NOT EXISTS idx_is_deleted ON Messages(is_deleted);
