CREATE TABLE dentals (
    id UUID PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    source_key VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(30),
    address TEXT NOT NULL,
    sido_code VARCHAR(20),
    sigungu_code VARCHAR(20),
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    business_status VARCHAR(30),
    rating_avg NUMERIC(3, 2) DEFAULT 0 NOT NULL,
    rating_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_affiliate BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT uk_dentals_source_key UNIQUE (source_key)
);

-- 16) dental_likes
CREATE TABLE dental_likes (
    user_id UUID NOT NULL,
    dental_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, dental_id),
    CONSTRAINT fk_dental_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dental_likes_dental FOREIGN KEY (dental_id) REFERENCES dentals (id) ON DELETE CASCADE
);

-- 17) dental_visits
CREATE TABLE dental_visits (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    dental_id UUID NOT NULL,
    visited_at DATE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    verify_method TEXT DEFAULT 'manual' NOT NULL,
    verify_payload_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT fk_dental_visits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dental_visits_dental FOREIGN KEY (dental_id) REFERENCES dentals (id) ON DELETE CASCADE
);

-- 18) dental_reviews
CREATE TABLE dental_reviews (
    id UUID PRIMARY KEY,
    visit_id UUID NOT NULL,
    user_id UUID NOT NULL,
    dental_id UUID NOT NULL,
    rating SMALLINT NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    tags_json JSONB,
    is_anonymous BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT uk_dental_reviews_visit_id UNIQUE (visit_id),
    CONSTRAINT fk_dental_reviews_visit FOREIGN KEY (visit_id) REFERENCES dental_visits (id) ON DELETE CASCADE,
    CONSTRAINT fk_dental_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dental_reviews_dental FOREIGN KEY (dental_id) REFERENCES dentals (id) ON DELETE CASCADE
);
