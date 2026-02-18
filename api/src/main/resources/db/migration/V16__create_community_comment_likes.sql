-- 댓글 좋아요 (1인 1댓글당 1회, 중복/무한 좋아요 방지)
CREATE TABLE community_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    comment_id UUID NOT NULL,
    CONSTRAINT fk_community_comment_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_comment_likes_comment FOREIGN KEY (comment_id) REFERENCES community_comments (id) ON DELETE CASCADE,
    CONSTRAINT uq_community_comment_likes_user_comment UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_community_comment_likes_comment_id ON community_comment_likes (comment_id);
CREATE INDEX idx_community_comment_likes_user_id ON community_comment_likes (user_id);
