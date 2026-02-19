-- 게시글-상품 태그 (게시글에 연결된 제휴 상품)
CREATE TABLE community_post_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    product_id BIGINT NOT NULL,
    CONSTRAINT fk_community_post_products_post FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_community_post_products_product FOREIGN KEY (product_id) REFERENCES partner_products (id) ON DELETE CASCADE,
    CONSTRAINT uk_community_post_products_post_product UNIQUE (post_id, product_id)
);

CREATE INDEX idx_community_post_products_post_id ON community_post_products (post_id);
CREATE INDEX idx_community_post_products_product_id ON community_post_products (product_id);
