-- 댓글-치과 태그 (댓글에 연결된 치과)
CREATE TABLE community_comment_dentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    dental_id UUID NOT NULL,
    CONSTRAINT fk_community_comment_dentals_comment FOREIGN KEY (comment_id) REFERENCES community_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_comment_dentals_dental FOREIGN KEY (dental_id) REFERENCES dentals (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_comment_dentals UNIQUE (comment_id, dental_id)
);

CREATE INDEX idx_community_comment_dentals_comment_id ON community_comment_dentals (comment_id);
CREATE INDEX idx_community_comment_dentals_dental_id ON community_comment_dentals (dental_id);
