import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Category, CategoryQuestion, Question } from '../entity';
import { SEED_CATEGORIES, SEED_QUESTIONS } from './seed-data';

@Injectable()
export class QuizSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(CategoryQuestion)
    private readonly categoryQuestionRepository: Repository<CategoryQuestion>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'production');

    if (nodeEnv !== 'development') {
      return;
    }

    await this.seed();
  }

  async seed() {
    try {
      const count = await this.categoryRepository.count();

      if (count > 0) {
        // eslint-disable-next-line no-console
        console.log('[QuizSeed] Data already exists. Skipping seed.');

        return;
      }

      // eslint-disable-next-line no-console
      console.log('[QuizSeed] Starting seed process...');

      const queryRunner = this.categoryRepository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const categoryMap = await this.seedCategories(queryRunner);
        // eslint-disable-next-line no-console
        console.log(`[QuizSeed] Created ${categoryMap.size} categories (parents + children)`);

        const { questionMap, questionCategoryMap } = await this.seedQuestions(queryRunner);
        // eslint-disable-next-line no-console
        console.log(`[QuizSeed] Created ${questionMap.size} questions`);

        const categoryQuestionCount = await this.seedCategoryQuestions(
          queryRunner,
          categoryMap,
          questionMap,
          questionCategoryMap,
        );
        // eslint-disable-next-line no-console
        console.log(`[QuizSeed] Created ${categoryQuestionCount} category-question links`);

        await queryRunner.commitTransaction();
        // eslint-disable-next-line no-console
        console.log('[QuizSeed] Seed completed successfully!');
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[QuizSeed] Seed failed:', errorMessage);

      if (error instanceof Error && error.stack) {
        // eslint-disable-next-line no-console
        console.error('[QuizSeed] Stack trace:', error.stack);
      }
    }
  }

  private async seedCategories(queryRunner: QueryRunner): Promise<Map<string, Category>> {
    const categoryMap = new Map<string, Category>();

    for (const seedCategory of SEED_CATEGORIES) {
      const parentCategory = queryRunner.manager.create(Category, {
        name: seedCategory.name,
        parentId: null,
      });
      const savedParent = await queryRunner.manager.save(Category, parentCategory);
      categoryMap.set(seedCategory.name, savedParent);

      if (seedCategory.children) {
        for (const childSeedCategory of seedCategory.children) {
          const childCategory = queryRunner.manager.create(Category, {
            name: childSeedCategory.name,
            parentId: savedParent.id,
          });
          const savedChild = await queryRunner.manager.save(Category, childCategory);
          const categoryPath = `${seedCategory.name}>${childSeedCategory.name}`;
          categoryMap.set(categoryPath, savedChild);
        }
      }
    }

    return categoryMap;
  }

  private async seedQuestions(queryRunner: QueryRunner): Promise<{
    questionMap: Map<number, Question>;
    questionCategoryMap: Map<number, string>;
  }> {
    const questionMap = new Map<number, Question>();
    const questionCategoryMap = new Map<number, string>();

    for (const seedQuestion of SEED_QUESTIONS) {
      const question = queryRunner.manager.create(Question, {
        questionType: seedQuestion.questionType,
        content: seedQuestion.content,
        correctAnswer: seedQuestion.correctAnswer,
        explanation: seedQuestion.explanation,
        difficulty: seedQuestion.difficulty,
        isActive: true,
        usageCount: 0,
        qualityScore: 100,
        modelName: 'seed',
      });
      const savedQuestion = await queryRunner.manager.save(Question, question);
      questionMap.set(savedQuestion.id, savedQuestion);

      const categoryPath = seedQuestion.categoryPath.join('>');
      questionCategoryMap.set(savedQuestion.id, categoryPath);
    }

    return { questionMap, questionCategoryMap };
  }

  private async seedCategoryQuestions(
    queryRunner: QueryRunner,
    categoryMap: Map<string, Category>,
    questionMap: Map<number, Question>,
    questionCategoryMap: Map<number, string>,
  ): Promise<number> {
    let count = 0;

    for (const [questionId] of questionMap.entries()) {
      const categoryPath = questionCategoryMap.get(questionId);

      if (!categoryPath) {
        // eslint-disable-next-line no-console
        console.warn(`[QuizSeed] Category path not found for question ID: ${questionId}`);
        continue;
      }

      const category = categoryMap.get(categoryPath);

      if (!category) {
        // eslint-disable-next-line no-console
        console.warn(`[QuizSeed] Category not found for path: ${categoryPath}`);
        continue;
      }

      const categoryQuestion = queryRunner.manager.create(CategoryQuestion, {
        categoryId: category.id,
        questionId: questionId,
      });
      await queryRunner.manager.save(CategoryQuestion, categoryQuestion);
      count++;
    }

    return count;
  }
}
