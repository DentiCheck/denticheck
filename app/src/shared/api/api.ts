import axios from 'axios';
import { BASE_URL } from '../lib/constants';

// Android Emulator uses 10.0.2.2 for localhost, but if we use adb reverse, localhost works.
// For physical devices, we need the LAN IP.
// Defaults to localhost:8080 as per existing setup.

const api = axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface ReviewResponse {
    id: string;
    dentalId: string;
    userId: string;
    userName: string;
    rating: number;
    content: string;
    imageUrls: string[];
    likeCount: number;
    isLiked: boolean;
    createdAt: string;
}

export interface ReviewListResponse {
    content: ReviewResponse[];
    pageable: any;
    totalElements: number;
    totalPages: number;
    last: boolean;
    size: number;
    number: number;
}

export const fetchReviews = async (dentalId: string, page = 0, size = 20): Promise<ReviewListResponse> => {
    try {
        const response = await api.get(`/dentals/${dentalId}/reviews`);
        // Backend returns List<DentalReviewResponse>, frontend expects ReviewListResponse with pagination
        // We need to map the fields as well (username -> userName, tags -> imageUrls)
        const content = response.data.map((item: any) => ({
            id: item.id,
            dentalId: item.dentalId,
            userId: item.userId,
            userName: item.username || 'Anonymous', // Map username
            rating: item.rating,
            content: item.content,
            imageUrls: item.tags || [], // Map tags to imageUrls for now
            likeCount: 0, // Mock
            isLiked: false, // Mock
            createdAt: item.createdAt,
        }));

        return {
            content,
            pageable: {},
            totalElements: content.length,
            totalPages: 1,
            last: true,
            size: content.length,
            number: 0,
        };
    } catch (error) {
        console.error('Error fetching reviews:', error);
        throw error;
    }
};

export const createReview = async (dentalId: string, rating: number, content: string, imageUrls: string[] = []) => {
    try {
        // Authenticated request - in a real app, we'd add the token to headers.
        // For now, relying on potential session or cookie if configured, or just open access if SecurityConfig permits.
        // (Note: SecurityConfig requires auth for non-GET, except whitelisted. We might need to handle auth header here later)
        const response = await api.post(`/dentals/${dentalId}/reviews`, {
            rating,
            content,
            tags: imageUrls // Map imageUrls to tags
        });
        return response.data;
    } catch (error) {
        console.error('Error creating review:', error);
        throw error;
    }
};

export const deleteReview = async (dentalId: string, reviewId: string): Promise<void> => {
    try {
        await api.delete(`/dentals/${dentalId}/reviews/${reviewId}`);
    } catch (error) {
        console.error('Error deleting review:', error);
        throw error;
    }
};
