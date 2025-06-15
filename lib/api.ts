// Clean re-export module following 2025 best practices
export { api } from './api-client';
export { buildApiUrl, getApiBaseUrl, apiConfig, testAPIConnection } from './api-config';
export type {
  APIResponse,
  ImageDescribeResponse,
  CartoonizeImageResponse,
  OTPResponse,
  UploadImageResponse,
  JobStatusResponse,
} from './api-client';