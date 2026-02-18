-- 답글(대댓글) 지원: 부모 댓글 ID 추가 (NULL이면 최상위 댓글)
ALTER TABLE community_comments
    ADD COLUMN parent_comment_id UUID NULL,
    ADD CONSTRAINT fk_community_comments_parent
        FOREIGN KEY (parent_comment_id) REFERENCES community_comments (id) ON DELETE CASCADE;

CREATE INDEX idx_community_comments_parent_id ON community_comments (parent_comment_id);
