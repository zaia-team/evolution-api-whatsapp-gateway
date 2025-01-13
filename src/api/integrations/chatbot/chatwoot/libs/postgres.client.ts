import { Chatwoot, configService } from '@config/env.config';
import { Logger } from '@config/logger.config';
import postgresql from 'pg';

const { Pool } = postgresql;

class Postgres {
  private logger = new Logger('Postgres');
  private pool: postgresql.Pool | null = null;
  private connected = false;

  getConnection(connectionString: string): postgresql.Pool | null {
    if (this.connected && this.pool) {
      return this.pool;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pool.on('error', (err) => {
        this.logger.error(`Postgres pool error: ${err.message}`);
        this.connected = false;
      });

      this.pool.on('connect', () => {
        this.connected = true;
        this.logger.log('New client connected to postgres pool');
      });

      this.connected = true;
      return this.pool;
    } catch (error) {
      this.connected = false;
      this.logger.error(`Postgres connect exception caught: ${error}`);
      return null;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.connected = false;
        this.pool = null;
        this.logger.log('Postgres connection pool closed');
      } catch (error) {
        this.logger.error(`Error closing postgres connection: ${error}`);
      }
    }
  }

  getChatwootConnection(): postgresql.Pool | null {
    const uri = configService.get<Chatwoot>('CHATWOOT').IMPORT.DATABASE.CONNECTION.URI;
    return this.getConnection(uri);
  }
}

export const postgresClient = new Postgres();

// Add cleanup on process termination
process.on('SIGINT', async () => {
  await postgresClient.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await postgresClient.closeConnection();
  process.exit(0);
});
