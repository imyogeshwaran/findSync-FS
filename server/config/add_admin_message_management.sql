-- Add admin conversation management columns to Messages table
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deleted_by INT;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deletion_type ENUM('user', 'admin', 'system') DEFAULT NULL;

-- Add foreign key for deleted_by
ALTER TABLE Messages ADD CONSTRAINT fk_deleted_by 
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id) ON DELETE SET NULL;

-- Update existing records to track deletion type for already soft-deleted messages
UPDATE Messages SET deletion_type = 'user' WHERE is_deleted = TRUE AND deletion_type IS NULL;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_contact_id ON Messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_deleted_by ON Messages(deleted_by);
