import { AppError } from '../../../shared/errors/AppError';
import { TaskRepository } from '../domain/task.repository';

export class DeleteTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(id: string): Promise<void> {
    const deleted = await this.taskRepository.delete(id);
    if (!deleted) {
      throw new AppError('Tarea no encontrada', 404);
    }
  }
}
