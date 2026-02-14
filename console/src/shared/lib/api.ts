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
