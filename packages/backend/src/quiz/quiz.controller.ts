import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entity';

@ApiTags('quiz')
@Controller('quiz')
export class QuizController {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  @Get('categories')
  @ApiOperation({
    summary: '전체 카테고리 목록 조회',
    description: '모든 카테고리(대분류/소분류)를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '카테고리 목록 조회 성공',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: '데이터베이스' },
          parentId: { type: 'number', nullable: true, example: null },
          parent: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getCategories() {
    const categories = await this.categoryRepository.find({
      relations: ['parent'],
      order: {
        parentId: 'ASC',
        name: 'ASC',
      },
    });

    return categories;
  }
}
