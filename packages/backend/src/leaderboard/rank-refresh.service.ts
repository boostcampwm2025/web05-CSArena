import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RankRefreshService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RankRefreshService.name);
  private readonly REFRESH_INTERVAL_MS = 60000;
  private intervalId: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.createExpressionIndexes();
    await this.createViewsIfNotExist();
    await this.refresh();
    this.intervalId = setInterval(() => {
      void this.refresh();
    }, this.REFRESH_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async createExpressionIndexes(): Promise<void> {
    await this.dataSource.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_ranking ON user_statistics (
        tier_point DESC,
        (CASE WHEN win_count + lose_count > 0
              THEN win_count * 1.0 / (win_count + lose_count)
              ELSE 0 END) DESC,
        (win_count + lose_count) DESC
      )
    `);

    await this.dataSource.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_single_ranking ON user_statistics (
        exp_point DESC,
        (CASE WHEN solved_count > 0
              THEN correct_count * 1.0 / solved_count
              ELSE 0 END) DESC,
        solved_count DESC
      )
    `);

    await this.dataSource.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_tier_point
        ON user_statistics (tier_point DESC)
    `);

    await this.dataSource.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_stats_exp_point
        ON user_statistics (exp_point DESC)
    `);

    this.logger.log('Leaderboard expression indexes ensured');
  }

  private async createViewsIfNotExist(): Promise<void> {
    await this.dataSource.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_multi_rank AS
      SELECT
        user_id,
        CAST(RANK() OVER (
          ORDER BY
            tier_point DESC,
            CASE WHEN win_count + lose_count > 0
                 THEN win_count * 1.0 / (win_count + lose_count)
                 ELSE 0 END DESC,
            (win_count + lose_count) DESC
        ) AS INTEGER) AS rank
      FROM user_statistics
    `);

    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_multi_rank_user
        ON mv_multi_rank (user_id)
    `);

    await this.dataSource.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_single_rank AS
      SELECT
        user_id,
        CAST(RANK() OVER (
          ORDER BY
            exp_point DESC,
            CASE WHEN solved_count > 0
                 THEN correct_count * 1.0 / solved_count
                 ELSE 0 END DESC,
            solved_count DESC
        ) AS INTEGER) AS rank
      FROM user_statistics
    `);

    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_single_rank_user
        ON mv_single_rank (user_id)
    `);

    this.logger.log('Rank materialized views initialized');
  }

  private async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    const lockResult = await this.dataSource.query<{ acquired: boolean }[]>(
      `SELECT pg_try_advisory_lock(hashtext('rank_refresh')) AS acquired`,
    );

    if (!lockResult[0]?.acquired) {
      return;
    }

    this.isRefreshing = true;

    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_multi_rank');
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_single_rank');
    } catch (error) {
      this.logger.error(`Rank view refresh failed: ${(error as Error).message}`);
    } finally {
      this.isRefreshing = false;
      await this.dataSource.query(`SELECT pg_advisory_unlock(hashtext('rank_refresh'))`);
    }
  }
}
