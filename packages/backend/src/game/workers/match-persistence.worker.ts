import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MATCH_PERSISTENCE_QUEUE } from '../queues/queue.constants';
import { MatchPersistenceJobData, MatchPersistenceService } from '../match-persistence.service';

@Processor(MATCH_PERSISTENCE_QUEUE)
export class MatchPersistenceWorker extends WorkerHost {
  private readonly logger = new Logger(MatchPersistenceWorker.name);

  constructor(private readonly matchPersistence: MatchPersistenceService) {
    super();
  }

  async process(job: Job<MatchPersistenceJobData>): Promise<void> {
    const { snapshot, finalResult } = job.data;
    this.logger.log(
      `매치 재시도 저장 - room=${snapshot.roomId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 5})`,
    );
    await this.matchPersistence.saveMatchFromSnapshot(snapshot, finalResult);
  }
}
