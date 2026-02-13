ALTER TABLE chat_sessions
ADD COLUMN title VARCHAR(255),
ADD COLUMN last_message_at TIMESTAMP,
ADD COLUMN last_message_preview VARCHAR(255);

-- Create partial unique index for single active session per user/channel
CREATE UNIQUE INDEX ux_chat_sessions_active ON chat_sessions (user_id, channel)
WHERE
    ended_at IS NULL;

-- Add new columns to ai_chat_messages
ALTER TABLE ai_chat_messages
ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
ADD COLUMN payload JSONB;