import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CategoryQuestion } from './category-question.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true, name: 'parent_id' })
  parentId: number | null;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_leaf' })
  isLeaf: boolean;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'int', default: 0, name: 'question_count' })
  questionCount: number;

  @ManyToOne(() => Category, (category) => category.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => CategoryQuestion, (cq) => cq.category)
  categoryQuestions: CategoryQuestion[];
}
