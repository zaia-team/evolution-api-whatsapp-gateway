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
        max: 50,
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

  getChatwootConnection(): postgresql.Pool | null {
    const uri = configService.get<Chatwoot>('CHATWOOT').IMPORT.DATABASE.CONNECTION.URI;
    return this.getConnection(uri);
  }
}

export const postgresClient = new Postgres();
