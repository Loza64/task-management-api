import { Task } from '../domain/task.entity';
import { TaskRepository } from '../domain/task.repository';
import { CreateTaskDto } from './create-task.dto';

export class CreateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  execute(input: CreateTaskDto): Promise<Task> {
    const task = new Task();
    task.title = input.title;
    task.description = input.description || null;

    return this.taskRepository.save(task);
  }
}
