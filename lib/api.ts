// Simplified API module - re-exports from clean modules
export { api } from './api-client';
export { buildApiUrl, getApiBaseUrl, apiConfig } from './api-config';
export type {
  APIResponse,
  ImageDescribeResponse,
  CartoonizeImageResponse,
  OTPResponse,
  UploadImageResponse,
  JobStatusResponse,
} from './api-client';