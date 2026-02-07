export default (): IAppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origin: process.env.CORS_ORIGIN || '*',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '86400', 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10),
  },
  mongodb: {
    uri: (process.env.MONGODB_URI || 'mongodb://localhost:27017/tet-holiday').trim(),
  },
});

export interface IAppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  cors: {
    enabled: boolean;
    origin: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: number;
    refreshSecret: string;
    refreshExpiresIn: number;
  };
  mongodb: {
    uri: string;
  };
}
