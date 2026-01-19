import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entity';

@Controller('quiz')
export class QuizController {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  @Get('categories')
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
