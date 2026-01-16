-- Add role column to Users table for role-based authentication
-- This migration adds role-based access control to the system

ALTER TABLE Users 
ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' NOT NULL;

-- Index the role column for faster queries
ALTER TABLE Users 
ADD INDEX idx_role (role);

-- Mark existing users as regular users (safety measure)
UPDATE Users SET role = 'user' WHERE role IS NULL;

-- Optional: If you have admin users in the Users table, mark them
-- UPDATE Users SET role = 'admin' WHERE user_id IN (SELECT user_id FROM admin_users);
