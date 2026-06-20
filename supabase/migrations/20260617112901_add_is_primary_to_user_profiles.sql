ALTER TABLE user_profiles ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

-- Mark the first user as primary (earliest created_at)
UPDATE user_profiles SET is_primary = true
WHERE id = (
  SELECT id FROM user_profiles ORDER BY created_at ASC LIMIT 1
);
