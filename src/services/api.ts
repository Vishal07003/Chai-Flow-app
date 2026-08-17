/**
 * API Client Service Layer
 * ChaiFlow / ClientManageApp
 *
 * Configured as an HTTP abstraction layer.
 * Currently resolves mock responses using Promises.
 * To connect to a live backend, update BASE_URL and replace mock resolves with fetch/axios calls.
 */

const BASE_URL = 'https://api.chaiflow.in/v1';
const MOCK_DELAY_MS = 200;

export const apiClient = {
  baseUrl: BASE_URL,

  async get<T>(endpoint: string, fallbackData?: T): Promise<T> {
    // Interface ready for: const res = await fetch(`${BASE_URL}${endpoint}`); return res.json();
    return new Promise(resolve =>
      setTimeout(() => resolve(fallbackData as T), MOCK_DELAY_MS),
    );
  },

  async post<T>(endpoint: string, body: any, fallbackResponse?: T): Promise<T> {
    return new Promise(resolve =>
      setTimeout(
        () => resolve(fallbackResponse ?? (body as T)),
        MOCK_DELAY_MS,
      ),
    );
  },

  async put<T>(endpoint: string, body: any, fallbackResponse?: T): Promise<T> {
    return new Promise(resolve =>
      setTimeout(
        () => resolve(fallbackResponse ?? (body as T)),
        MOCK_DELAY_MS,
      ),
    );
  },

  async delete<T>(endpoint: string, fallbackResponse?: T): Promise<T> {
    return new Promise(resolve =>
      setTimeout(
        () => resolve(fallbackResponse ?? ({ success: true } as T)),
        MOCK_DELAY_MS,
      ),
    );
  },
};

export default apiClient;
