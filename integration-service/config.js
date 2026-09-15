import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  externalApiUrl: process.env.EXTERNAL_API_URL || 'http://localhost:9000/api',
  auth: {
    username: process.env.EXTERNAL_AUTH_USERNAME || 'integration-service',
    password: process.env.EXTERNAL_AUTH_PASSWORD || 'password',
  },
  timeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
};
