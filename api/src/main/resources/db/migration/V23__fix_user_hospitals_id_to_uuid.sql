-- V23__fix_user_hospitals_id_to_uuid.sql
-- user_hospitals 테이블의 id 컬럼을 BIGINT에서 UUID로 변경

-- 1. 기존 데이터가 있다면 백업 (선택사항)
-- CREATE TABLE user_hospitals_backup AS SELECT * FROM user_hospitals;

-- 2. 외래키 제약조건 제거
ALTER TABLE user_hospitals DROP CONSTRAINT IF EXISTS fk_user_hospitals_user;
ALTER TABLE user_hospitals DROP CONSTRAINT IF EXISTS fk_user_hospitals_hospital;
ALTER TABLE user_hospitals DROP CONSTRAINT IF EXISTS pk_user_hospitals;
ALTER TABLE user_hospitals DROP CONSTRAINT IF EXISTS uq_user_hospitals_user_hospital;

-- 3. 기존 테이블 삭제 후 재생성 (UUID로)
DROP TABLE IF EXISTS user_hospitals;

CREATE TABLE user_hospitals (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    last_visit_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_user_hospitals PRIMARY KEY (id),
    CONSTRAINT fk_user_hospitals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_hospitals_hospital FOREIGN KEY (hospital_id) REFERENCES dentals (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_hospitals_user_hospital UNIQUE (user_id, hospital_id)
);

-- 4. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_user_hospitals_user_id ON user_hospitals (user_id);
CREATE INDEX IF NOT EXISTS idx_user_hospitals_hospital_id ON user_hospitals (hospital_id);
