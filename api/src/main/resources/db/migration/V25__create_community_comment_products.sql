-- 댓글-상품 태그 (댓글에 연결된 제휴 상품)
CREATE TABLE community_comment_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_community_comment_products_comment FOREIGN KEY (comment_id) REFERENCES community_comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_comment_products_product FOREIGN KEY (product_id) REFERENCES partner_products (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_comment_products_comment_product UNIQUE (comment_id, product_id)
);

CREATE INDEX idx_community_comment_products_comment_id ON community_comment_products (comment_id);
CREATE INDEX idx_community_comment_products_product_id ON community_comment_products (product_id);
