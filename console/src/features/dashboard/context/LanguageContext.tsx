/**
 * Frontend Context: Language Provider
 * Path: console/src/features/dashboard/context/LanguageContext.tsx
 * Description: [관리자 기능] 다국어(KO/EN) 지원 컨텍스트
 * - 전역 언어 상태 관리 및 번역 함수(t) 제공
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ko' | 'en';

interface LanguageContextType {
    lang: Language;
    toggleLang: () => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Language>('ko');

    const toggleLang = () => {
        setLang(prev => prev === 'ko' ? 'en' : 'ko');
    };

    const translations: Record<string, Record<Language, string>> = {
        'PENDING': { ko: '대기', en: 'Pending' },
        'OPEN': { ko: '처리중', en: 'In Progress' },
        'ANSWERED': { ko: '완료', en: 'Completed' },
        'RESOLVED': { ko: '해결됨', en: 'Resolved' }, // Added RESOLVED
        'CLOSED': { ko: '종료', en: 'Closed' },

        // Dummy Data Titles for Demo
        '회원 탈퇴는 어떻게 하나요?': { ko: '회원 탈퇴는 어떻게 하나요?', en: 'How do I delete my account?' },
        '임플란트 제휴 할인이 궁금합니다.': { ko: '임플란트 제휴 할인이 궁금합니다.', en: 'Inquiry about implant partnership discounts.' },
        '어플 오류 제보합니다.': { ko: '어플 오류 제보합니다.', en: 'Reporting an app error.' },
        '비밀번호를 잊어버렸어요.': { ko: '비밀번호를 잊어버렸어요.', en: 'I forgot my password.' },
        '보험 가입 상담 요청': { ko: '보험 가입 상담 요청', en: 'Request for insurance consultation' },
        '앱 사용 중 오류가 발생합니다': { ko: '앱 사용 중 오류가 발생합니다', en: 'An error occurs while using the app' },
        '제휴 문의 드립니다': { ko: '제휴 문의 드립니다', en: 'Partnership Inquiry' },

        'total_users': { ko: '총 이용자', en: 'Total Users' },
        'partner_dentists': { ko: '제휴 치과', en: 'Partner Dentists' },
        'new_inquiries': { ko: '신규 문의', en: 'New Inquiries' },
        'weekly_usage': { ko: '최근 이용', en: 'Weekly Usage' },
        'daily_usage_title': { ko: '일일 이용자 현황', en: 'Daily User Trends' },
        'weekly_usage_title': { ko: '주간 이용자 현황', en: 'Weekly User Trends' },
        'recent_inquiries_title': { ko: '최근 문의 현황', en: 'Recent Inquiries' },
        'add_button': { ko: '추가', en: 'Add' },
        // Layout & Sidebar
        'admin_system': { ko: '관리자 시스템', en: 'Admin System' },
        'menu_dashboard': { ko: '대시보드', en: 'Dashboard' },
        'menu_users': { ko: '회원 관리', en: 'User Management' },
        'menu_dentists': { ko: '제휴 치과 관리', en: 'Dentist Management' },
        'menu_products': { ko: '제휴 상품 관리', en: 'Product Management' },
        'menu_insurances': { ko: '제휴 보험 상품 관리', en: 'Insurance Management' },
        // Dashboard Stats
        'stat_total_users': { ko: '총 이용자', en: 'Total Users' },
        'stat_partner_dentists': { ko: '제휴 치과', en: 'Partner Dentists' },
        'stat_new_inquiries': { ko: '신규 문의', en: 'New Inquiries' },
        'stat_recent_usage': { ko: '최근 이용', en: 'Recent Usage' },
        // Table Headers
        'th_id': { ko: 'ID', en: 'ID' },
        'th_user': { ko: '사용자', en: 'User' },
        'th_title': { ko: '제목', en: 'Title' },
        'th_date': { ko: '날짜', en: 'Date' },
        'th_status': { ko: '상태', en: 'Status' },
        // Empty States
        'no_inquiries': { ko: '최근 문의 내역이 없습니다.', en: 'No recent inquiries found.' },
        'loading_dentists': { ko: '제휴 치과 목록 준비 중...', en: 'Loading dentist list...' },
        'loading_products': { ko: '제휴 상품 목록 준비 중...', en: 'Loading product list...' },
        'loading_insurances': { ko: '제휴 보험 상품 목록 준비 중...', en: 'Loading insurance list...' },
        'loading_users': { ko: '회원 관리 테이블 준비 중...', en: 'Loading user list...' },
        // Page Descriptions
        'desc_users': { ko: '회원 정보를 관리하고 계정 상태를 확인하세요', en: 'Manage user information and account status.' },
        'desc_dentists': { ko: '제휴 치과 정보와 광고 노출을 관리하세요', en: 'Manage partner dentists and ad exposure.' },
        'desc_products': { ko: '제휴 상품 정보와 광고 노출을 관리하세요', en: 'Manage partner products and ad exposure.' },
        'desc_insurances': { ko: '제휴 보험 상품 정보와 광고 노출을 관리하세요', en: 'Manage insurance products and ad exposure.' },
        // Buttons
        'btn_add_dentist': { ko: '+ 치과 추가', en: '+ Add Dentist' },
        'btn_add_product': { ko: '+ 상품 추가', en: '+ Add Product' },
        'btn_add_insurance': { ko: '+ 보험 상품 추가', en: '+ Add Insurance' },
        'btn_edit': { ko: '수정', en: 'Edit' },
        'btn_delete': { ko: '삭제', en: 'Delete' },

        // Table Headers - Common
        'th_category': { ko: '카테고리', en: 'Category' },
        'th_product_name': { ko: '제품명', en: 'Product Name' },
        'th_manufacturer': { ko: '제조사', en: 'Manufacturer' },
        'th_price': { ko: '가격', en: 'Price' },
        'th_action': { ko: '관리', en: 'Action' },
        'th_hospital_name': { ko: '병원명', en: 'Hospital Name' },
        'th_address': { ko: '주소', en: 'Address' },
        'th_phone': { ko: '전화번호', en: 'Phone' },
        'th_partner': { ko: '제휴여부', en: 'Partner' },
        'th_company': { ko: '보험사', en: 'Company' },
        'th_nickname': { ko: '닉네임', en: 'Nickname' },
        'th_email': { ko: '이메일', en: 'Email' },
        'th_role': { ko: '권한', en: 'Role' },
        'th_user_status': { ko: '계정상태', en: 'Account Status' },
        'th_created_at': { ko: '가입일', en: 'Joined At' },

        // Empty States
        'no_products': { ko: '등록된 제휴 상품이 없습니다.', en: 'No products found.' },
        'no_dentists': { ko: '등록된 제휴 치과가 없습니다.', en: 'No dentists found.' },
        'no_insurances': { ko: '등록된 제휴 보험이 없습니다.', en: 'No insurance products found.' },
        'no_users': { ko: '가입된 회원이 없습니다.', en: 'No users found.' },

        // Roles & Status
        'ADMIN': { ko: '관리자', en: 'Admin' },
        'USER': { ko: '일반', en: 'User' },
        'ACTIVE': { ko: '활성', en: 'Active' },
        'SUSPENDED': { ko: '정지', en: 'Suspended' },
        'Partner': { ko: '제휴', en: 'Partner' },

        // Categories
        'cat_toothbrush': { ko: '칫솔류', en: 'Toothbrushes' },
        'cat_paste': { ko: '치약 및 세정제', en: 'Toothpaste & Cleaners' },
        'cat_interdental': { ko: '치간, 혀 및 구강', en: 'Interdental & Oral' },
        'cat_special': { ko: '특수케어', en: 'Special Care' },
        'cat_etc': { ko: '기타', en: 'Etc' },

        // Partnership Actions & Status
        'btn_partner_on': { ko: '제휴', en: 'Partner' },
        'btn_partner_off': { ko: '미제휴', en: 'Unpartner' },
        'status_partnered': { ko: '제휴', en: 'Partner' },
        'status_unpartnered': { ko: '미제휴', en: 'Unpartnered' },
        'msg_update_success': { ko: '상태가 변경되었습니다.', en: 'Status updated successfully.' },
        'msg_update_fail': { ko: '상태 변경에 실패했습니다.', en: 'Failed to update status.' },
        'confirm_delete': { ko: '삭제하시겠습니까?', en: 'Are you sure you want to delete?' },
        'msg_delete_success': { ko: '삭제되었습니다.', en: 'Deleted successfully.' },
        'msg_delete_fail': { ko: '삭제 중 오류가 발생했습니다.', en: 'Error occurred during deletion.' },
        'msg_add_success': { ko: '추가되었습니다.', en: 'Added successfully.' },
        'msg_save_success': { ko: '저장되었습니다.', en: 'Saved successfully.' },
        'msg_save_fail': { ko: '저장에 실패했습니다.', en: 'Failed to save.' },
        'msg_upload_prepare': { ko: '이미지 파일 업로드 기능은 준비 중입니다. URL을 입력해주세요.', en: 'Image upload is under development. Please enter a URL.' },

        // Modal Titles
        'modal_add_dentist': { ko: '제휴 치과 추가', en: 'Add Partner Dentist' },
        'modal_edit_dentist': { ko: '제휴 치과 수정', en: 'Edit Partner Dentist' },
        'modal_add_product': { ko: '제휴 상품 추가', en: 'Add Partner Product' },
        'modal_edit_product': { ko: '제휴 상품 수정', en: 'Edit Partner Product' },
        'modal_add_insurance': { ko: '제휴 보험 추가', en: 'Add Partner Insurance' },
        'modal_edit_insurance': { ko: '제휴 보험 수정', en: 'Edit Partner Insurance' },

        // Form Labels
        'label_hospital_name': { ko: '병원명', en: 'Hospital Name' },
        'label_address': { ko: '주소', en: 'Address' },
        'label_phone': { ko: '전화번호', en: 'Phone' },
        'label_description': { ko: '설명', en: 'Description' },
        'label_homepage': { ko: '홈페이지 URL', en: 'Homepage URL' },
        'label_category': { ko: '카테고리', en: 'Category' },
        'label_product_name': { ko: '제품명', en: 'Product Name' },
        'label_insurance_name': { ko: '보험명', en: 'Insurance Name' },
        'label_price': { ko: '가격', en: 'Price' },
        'label_manufacturer': { ko: '제조회사', en: 'Manufacturer' },
        'label_company': { ko: '보험회사', en: 'Insurance Company' },
        'label_image_url': { ko: '상품 이미지 URL', en: 'Product Image URL' },
        'placeholder_image_url': { ko: 'https://example.com/image.jpg', en: 'https://example.com/image.jpg' },
        'btn_file_attach': { ko: '파일 첨부', en: 'Attach File' },
        'btn_save': { ko: '저장', en: 'Save' },
        'btn_saving': { ko: '저장 중...', en: 'Saving...' },
        'btn_cancel': { ko: '취소', en: 'Cancel' },

        // Filter Options
        'filter_all': { ko: '전체', en: 'All' },
        'filter_name': { ko: '명칭', en: 'Name' },
        'filter_address': { ko: '주소', en: 'Address' },
    };

    const t = (key: string) => {
        return translations[key]?.[lang] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
