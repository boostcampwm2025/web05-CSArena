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

  @ManyToOne(() => Category, (category) => category.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => CategoryQuestion, (cq) => cq.category)
  categoryQuestions: CategoryQuestion[];
}
