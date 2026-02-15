/**
 * Frontend Library: API Utilities
 * Path: console/src/shared/lib/api.ts
 * Description: [관리자 기능] GraphQL 요청 및 공통 API 유틸리티
 */
// Placeholder for API client configuration
// You can use axios or fetch wrapper here

export const apiClient = {
    get: async (url: string) => {
        console.log(`GET ${url}`)
        return Promise.resolve({})
    },
    post: async (url: string, data: unknown) => {
        console.log(`POST ${url}`, data)
        return Promise.resolve({})
    }
}

export async function graphqlRequest(query: string, variables = {}) {
    const res = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` // 필요 시 활성화
        },
        body: JSON.stringify({ query, variables }),
    });
    const { data, errors } = await res.json();
    if (errors) throw new Error(errors[0].message);
    return data;
}

export const ADMIN_DASHBOARD_QUERIES = {
    GET_STATS: `
        query GetAdminDashboard {
            adminDashboardStats {
                totalUsers
                userTrend
                totalDentists
                dentistTrend
                newInquiries
                inquiryTrend
                weeklyUsage
                weeklyTrend
            }
            adminDailyUsage {
                label
                date
                count
            }
            adminWeeklyUsage {
                label
                count
            }
            adminRecentInquiries {
                id
                userName
                title
                date
                status
            }
        }
    `
};

export const ADMIN_MANAGEMENT_QUERIES = {
    GET_USERS: `
        query GetAdminUsers($keyword: String) {
            adminUsers(keyword: $keyword) {
                id
                displayId
                nickname
                email
                role
                status
                createdAt
            }
        }
    `,
    GET_DENTISTS: `
        query AdminDentists($keyword: String) {
            adminDentists(keyword: $keyword) {
                id
                name
                address
                phone
                isPartner
            }
        }
    `,
    GET_PRODUCTS: `
        query AdminProducts($keyword: String) {
            adminProducts(keyword: $keyword) {
                id
                category
                name
                price
                manufacturer
                imageUrl
            }
        }
    `,
    GET_INSURANCES: `
        query AdminInsurances($keyword: String) {
            adminInsuranceProducts(keyword: $keyword) {
                id
                category
                name
                price
                company
            }
        }
    `
};
