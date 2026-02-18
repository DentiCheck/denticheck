-- 🧭 V22__migrate_hospitals_to_dentals.sql
-- 기존 hospitals 테이블의 데이터를 dentals 테이블로 이전하고 스키마를 보정합니다.

-- 1. dentals 테이블에 누락된 컬럼 추가 (Entity 필드와 동기화)
ALTER TABLE dentals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dentals ADD COLUMN IF NOT EXISTS homepage_url VARCHAR(500);

-- 2. hospitals -> dentals 데이터 마이그레이션
-- 기존에 존재하지 않는 데이터만 삽입 (ID 중복 가드)
INSERT INTO dentals (
    id, source, source_key, name, phone, address, 
    lat, lng, description, homepage_url, 
    created_at, updated_at, rating_avg, rating_count, is_affiliate
)
SELECT 
    h.id, 
    'MIGRATION' as source, 
    'HOSP_MIG_' || h.id as source_key,
    h.name, 
    h.phone, 
    COALESCE(h.address, '주소 정보 없음') as address,
    CAST(h.latitude AS NUMERIC(10, 7)) as lat,
    CAST(h.longitude AS NUMERIC(10, 7)) as lng,
    h.description,
    h.homepage_url,
    COALESCE(h.created_at, NOW()) as created_at,
    COALESCE(h.updated_at, NOW()) as updated_at,
    0.00 as rating_avg,
    0 as rating_count,
    false as is_affiliate
FROM hospitals h
WHERE NOT EXISTS (
    SELECT 1 FROM dentals d WHERE d.id = h.id
)
ON CONFLICT (source_key) DO NOTHING;

-- 3. user_hospitals (즐겨찾기) -> dental_likes 데이터 마이그레이션
INSERT INTO dental_likes (user_id, dental_id, created_at)
SELECT 
    uh.user_id, 
    uh.hospital_id as dental_id, 
    COALESCE(uh.created_at, NOW()) as created_at
FROM user_hospitals uh
WHERE uh.is_favorite = true
AND EXISTS (SELECT 1 FROM users u WHERE u.id = uh.user_id)
AND EXISTS (SELECT 1 FROM dentals d WHERE d.id = uh.hospital_id)
ON CONFLICT (user_id, dental_id) DO NOTHING;
