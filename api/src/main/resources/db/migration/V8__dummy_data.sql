-- 🧪 V8__dummy_data.sql
-- 관리자 테스트를 위한 시스템 전반의 더미 데이터 삽입

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. 사용자 데이터 (UUID 부여)
-- ADMIN: admin_test
INSERT INTO users (id, username, status, nickname, email, created_at, role_id)
VALUES (gen_random_uuid(), 'admin_test', 'ACTIVE', '관리자', 'admin@denticheck.com', NOW() - INTERVAL '30 days', 2);

-- USERS: user1 ~ user5
INSERT INTO users (id, username, status, nickname, email, created_at, role_id)
VALUES 
(gen_random_uuid(), 'user1', 'ACTIVE', '홍길동', 'user1@example.com', NOW() - INTERVAL '10 days', 1),
(gen_random_uuid(), 'user2', 'ACTIVE', '이순신', 'user2@example.com', NOW() - INTERVAL '8 days', 1),
(gen_random_uuid(), 'user3', 'ACTIVE', '강감찬', 'user3@example.com', NOW() - INTERVAL '5 days', 1),
(gen_random_uuid(), 'user4', 'ACTIVE', '유관순', 'user4@example.com', NOW() - INTERVAL '3 days', 1),
(gen_random_uuid(), 'user5', 'ACTIVE', '김유신', 'user5@example.com', NOW() - INTERVAL '1 days', 1);

-- 2. 제휴 치과 데이터
INSERT INTO hospitals (id, name, address, phone, created_at)
VALUES 
(gen_random_uuid(), '서울중앙치과의원', '서울특별시 중구 세종대로 110', '02-123-4567', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), '강남바른치과', '서울특별시 강남구 테헤란로 123', '02-555-7777', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), '부산해운대치과', '부산광역시 해운대구 우동 456', '051-789-0000', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), '대구시티치과', '대구광역시 중구 공평로 789', '053-111-2222', NOW() - INTERVAL '5 days');

-- 3. 일별 통계 데이터 (최근 7일간의 추세)
-- 그래프 시각화 확인을 위해 어제부터 거꾸로 7일 데이터 삽입
INSERT INTO admin_daily_stats (stats_date, total_users, total_dentists, new_inquiries, weekly_usage, user_trend)
VALUES 
(CURRENT_DATE - INTERVAL '1 days', 1250, 4, 3, 450, 2.5),
(CURRENT_DATE - INTERVAL '2 days', 1220, 4, 5, 430, 1.2),
(CURRENT_DATE - INTERVAL '3 days', 1205, 3, 2, 410, 0.8),
(CURRENT_DATE - INTERVAL '4 days', 1195, 3, 4, 390, 1.5),
(CURRENT_DATE - INTERVAL '5 days', 1178, 3, 1, 380, 2.1),
(CURRENT_DATE - INTERVAL '6 days', 1154, 2, 6, 360, 0.5),
(CURRENT_DATE - INTERVAL '7 days', 1148, 2, 2, 340, 1.1);

-- 4. 제휴 상품 데이터
INSERT INTO partner_products (category, name, price, manufacturer)
VALUES 
('칫솔류', '전동칫솔 9000 Pro', 120000, '오랄-C'),
('칫솔류', '이중미세모 칫솔 (12개입)', 15000, '덴티굿'),
('치약 및 세정제', '불소 1450ppm 고함량 치약', 8500, '메디케어'),
('치약 및 세정제', '화이트닝 화이트 치약', 9000, '클린스마일'),
('치간, 혀 및 구강', '치간칫솔 SSS 믹스', 4500, '자이덴'),
('치간, 혀 및 구강', '민트 무왁스 치실 50m', 3500, '덴탈프로'),
('특수케어', '시린이 보호 가글 500ml', 7000, '센소케어'),
('특수케어', '교정용 왁스 6입', 12000, '오쏘라인');

-- 5. 제휴 보험 데이터
INSERT INTO insurance_products (category, name, price, company)
VALUES 
('치아보험', '든든한 치아보장보험', 25000, 'A+화재'),
('치아보험', '임플란트 집중보험', 35000, 'B-생명'),
('어린이보험', '우리아이 첫치아보험', 18000, 'C-보험'),
('종합보험', '구강종합 실손보장', 42000, 'D-손해보험');

-- 6. 관리자 문의 내역
INSERT INTO admin_inquiries (nickname, email, title, content, status, created_at)
VALUES 
('홍길동', 'user1@example.com', '회원 탈퇴는 어떻게 하나요?', '가입 후 사용을 안하게 되어 탈퇴하고 싶습니다.', 'PENDING', NOW() - INTERVAL '2 hours'),
('이순신', 'user2@example.com', '임플란트 제휴 할인이 궁금합니다.', '제휴 치과에서 임플란트 시술 시 할인이 적용되나요?', 'OPEN', NOW() - INTERVAL '5 hours'),
('강감찬', 'user3@example.com', '어플 오류 제보합니다.', '진단 결과 화면에서 이미지가 깨져 보입니다.', 'ANSWERED', NOW() - INTERVAL '1 days'),
('유관순', 'user4@example.com', '비밀번호를 잊어버렸어요.', '이메일 인증이 안와서 문의 드립니다.', 'PENDING', NOW() - INTERVAL '1 days'),
('김유신', 'user5@example.com', '보험 가입 상담 요청', '어떤 보험이 가장 저렴한가요?', 'OPEN', NOW() - INTERVAL '2 days'),
('jiwon88', 'jiwon@example.com', '앱 사용 중 오류가 발생합니다', '사진 업로드가 안 되네요.', 'PENDING', NOW() - INTERVAL '1 hour'),
('dentist_lee', 'lee@hospital.com', '제휴 문의 드립니다', '서울 강남구 치과입니다.', 'RESOLVED', NOW() - INTERVAL '1 day');

-- 7. 추가 제휴 상품 데이터 (Merged from seed)
INSERT INTO partner_products (category, name, price, manufacturer)
VALUES
('칫솔류', '프리미엄 미세모 칫솔', 4500, '덴티케어'),
('치약 및 세정제', '프로폴리스 치약', 12000, '내추럴허브'),
('특수케어', '구강 유산균 타블렛', 35000, '바이오덴트');

-- 8. 추가 제휴 보험 데이터 (Merged from seed)
INSERT INTO insurance_products (category, name, price, company)
VALUES
('치아보험', '든든한 치아안심 보험', 25000, '대한생명'),
('종합보험', '우리가족 구강케어 보험', 40000, '미래화재');
