import Joi from 'joi';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PREFIX: string;
  HAPI_BASE_URL: string;
  HAPI_AUTH_BEARER_TOKEN: string;
  CQL_TRANSLATOR_BASE_URL: string;
  DEPENDENCY_TIMEOUT_MS: number;
  CORS_ORIGINS: string;
  ANONYMOUS_CLASSROOM_ENABLED: boolean;
  ANONYMOUS_SESSION_SECRET: string;
  ANONYMOUS_SESSION_COOKIE_NAME: string;
  ANONYMOUS_SESSION_COOKIE_SECURE: boolean;
  ANONYMOUS_SESSION_COOKIE_SAMESITE: 'Lax' | 'Strict' | 'None';
  ANONYMOUS_SESSION_TTL_HOURS: number;
  CLASSROOM_DEFAULT_ID: string;
}

const environmentSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string()
    .pattern(/^[a-z0-9/-]+$/)
    .default('api/v1'),
  HAPI_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  HAPI_AUTH_BEARER_TOKEN: Joi.string().allow('').default(''),
  CQL_TRANSLATOR_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  DEPENDENCY_TIMEOUT_MS: Joi.number().integer().min(250).max(30000).default(5000),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  ANONYMOUS_CLASSROOM_ENABLED: Joi.boolean().default(true),
  ANONYMOUS_SESSION_SECRET: Joi.string()
    .min(32)
    .default('rce-cql-local-anonymous-session-secret-change-me'),
  ANONYMOUS_SESSION_COOKIE_NAME: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .default('rce_session'),
  ANONYMOUS_SESSION_COOKIE_SECURE: Joi.boolean().default(false),
  ANONYMOUS_SESSION_COOKIE_SAMESITE: Joi.string().valid('Lax', 'Strict', 'None').default('Lax'),
  ANONYMOUS_SESSION_TTL_HOURS: Joi.number().integer().min(1).max(168).default(8),
  CLASSROOM_DEFAULT_ID: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+$/)
    .default('demo-aula'),
}).unknown(true);

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const result = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
    stripUnknown: false,
  });

  if (result.error) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`);
  }

  return result.value;
}
