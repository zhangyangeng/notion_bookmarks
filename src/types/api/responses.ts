export interface ApiResponse<T> {
    data: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    results: T[];
    hasMore: boolean;
    nextCursor?: string;
}
