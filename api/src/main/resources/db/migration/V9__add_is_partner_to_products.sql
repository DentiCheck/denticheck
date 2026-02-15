-- DB Migration: Add Partner Status
-- Path: api/src/main/resources/db/migration/V9__add_is_partner_to_products.sql
-- Description: [관리자 기능] 치과, 상품, 보험 테이블에 제휴 여부(is_partner) 컬럼 추가
ALTER TABLE partner_products ADD COLUMN is_partner BOOLEAN DEFAULT TRUE;
ALTER TABLE insurance_products ADD COLUMN is_partner BOOLEAN DEFAULT TRUE;
ALTER TABLE hospitals ADD COLUMN is_partner BOOLEAN DEFAULT TRUE;
