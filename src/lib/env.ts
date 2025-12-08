/**
 * Environment Variable Validation Utility
 * 
 * This module provides utilities to validate and access environment variables
 * in a type-safe manner. It helps ensure all required configuration is present
 * before the application starts.
 */

// Define all environment variables used in the application
export interface EnvironmentVariables {
  // Required - Supabase
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  
  // Optional - Google APIs
  VITE_GOOGLE_CLIENT_ID?: string;
  VITE_GOOGLE_CLIENT_SECRET?: string;
  VITE_GOOGLE_API_KEY?: string;
  
  // Optional - Microsoft Azure / Teams
  VITE_MS_CLIENT_ID?: string;
  VITE_MS_CLIENT_SECRET?: string;
  VITE_MS_TENANT_ID?: string;
  
  // Optional - Zoom
  VITE_ZOOM_CLIENT_ID?: string;
  VITE_ZOOM_CLIENT_SECRET?: string;
  VITE_ZOOM_ACCOUNT_ID?: string;
  
  // Optional - Backend URLs
  VITE_API_URL?: string;
  VITE_WS_URL?: string;
  
  // Optional - Pinata IPFS
  VITE_PINATA_API_KEY?: string;
  VITE_PINATA_API_SECRET?: string;
  VITE_PINATA_JWT?: string;
  
  // Optional - Blockchain
  VITE_POLYGON_RPC_URL?: string;
  VITE_POLYGON_CHAIN_ID?: string;
  
  // Optional - DeepFace
  VITE_DEEPFACE_API_URL?: string;
  
  // Optional - Sigstore
  VITE_REKOR_URL?: string;
}

// Required environment variables that must be set
const REQUIRED_ENV_VARS: (keyof EnvironmentVariables)[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Optional environment variables with their default values
const OPTIONAL_ENV_DEFAULTS: Partial<EnvironmentVariables> = {
  VITE_API_URL: 'http://localhost:5000',
  VITE_WS_URL: 'ws://localhost:5000',
  VITE_DEEPFACE_API_URL: 'http://localhost:5000', // DeepFace server default port
  VITE_REKOR_URL: 'https://rekor.sigstore.dev',
  VITE_POLYGON_CHAIN_ID: '137',
};

/**
 * Get an environment variable value
 * @param key - The environment variable key
 * @param defaultValue - Optional default value if not set
 * @returns The environment variable value or default
 */
export function getEnvVar(key: keyof EnvironmentVariables, defaultValue?: string): string | undefined {
  const value = import.meta.env[key];
  return value || defaultValue || OPTIONAL_ENV_DEFAULTS[key];
}

/**
 * Get a required environment variable, throws if not set
 * @param key - The environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is not set
 */
export function getRequiredEnvVar(key: keyof EnvironmentVariables): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      'Please check your .env file configuration.'
    );
  }
  return value;
}

/**
 * Validate all required environment variables are set
 * @returns Object with validation result and any missing variables
 */
export function validateEnvironment(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }
  
  // Check for common optional variables that improve functionality
  const recommendedOptional: (keyof EnvironmentVariables)[] = [
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_API_URL',
    'VITE_WS_URL',
  ];
  
  for (const key of recommendedOptional) {
    if (!import.meta.env[key]) {
      warnings.push(`${key} not set - some features may not work`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Log environment validation results to console (development only)
 */
export function logEnvironmentStatus(): void {
  if (import.meta.env.DEV) {
    const { valid, missing, warnings } = validateEnvironment();
    
    if (!valid) {
      console.error('❌ Missing required environment variables:', missing);
    } else {
      console.log('✅ All required environment variables are set');
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ Environment warnings:', warnings);
    }
  }
}

/**
 * Get all environment variables as a typed object
 * Only returns values that are set
 */
export function getEnvironment(): Partial<EnvironmentVariables> {
  const env: Partial<EnvironmentVariables> = {};
  
  // Get all VITE_ prefixed variables
  for (const key of Object.keys(import.meta.env)) {
    if (key.startsWith('VITE_')) {
      (env as Record<string, string>)[key] = import.meta.env[key];
    }
  }
  
  return env;
}

// Feature availability checks
export const features = {
  /**
   * Check if Google integration is available
   */
  hasGoogleIntegration(): boolean {
    return !!(
      import.meta.env.VITE_GOOGLE_CLIENT_ID &&
      import.meta.env.VITE_GOOGLE_API_KEY
    );
  },
  
  /**
   * Check if Microsoft Teams integration is available
   */
  hasMicrosoftIntegration(): boolean {
    return !!(
      import.meta.env.VITE_MS_CLIENT_ID &&
      import.meta.env.VITE_MS_CLIENT_SECRET &&
      import.meta.env.VITE_MS_TENANT_ID
    );
  },
  
  /**
   * Check if Zoom integration is available
   */
  hasZoomIntegration(): boolean {
    return !!(
      import.meta.env.VITE_ZOOM_CLIENT_ID &&
      import.meta.env.VITE_ZOOM_CLIENT_SECRET &&
      import.meta.env.VITE_ZOOM_ACCOUNT_ID
    );
  },
  
  /**
   * Check if blockchain/IPFS integration is available
   */
  hasBlockchainIntegration(): boolean {
    return !!(
      import.meta.env.VITE_PINATA_JWT &&
      import.meta.env.VITE_POLYGON_RPC_URL
    );
  },
  
  /**
   * Check if face recognition is available
   */
  hasFaceRecognition(): boolean {
    return !!import.meta.env.VITE_DEEPFACE_API_URL;
  },
  
  /**
   * Check if backend API is configured
   */
  hasBackendAPI(): boolean {
    return !!import.meta.env.VITE_API_URL;
  },
  
  /**
   * Check if WebSocket is configured
   */
  hasWebSocket(): boolean {
    return !!import.meta.env.VITE_WS_URL;
  },
};
