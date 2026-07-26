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
