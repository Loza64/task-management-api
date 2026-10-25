
import { Task, TaskStatus } from '../domain/task.entity';
import { TaskRepository } from '../domain/task.repository';
import { ChangeTaskStatusUseCase } from './change-task-status.use-case';
import { CompleteTaskUseCase } from './complete-task.use-case';
import { CreateTaskUseCase } from './create-task.use-case';
import { DeleteTaskUseCase } from './delete-task.use-case';
import { FindTaskByIdUseCase } from './find-task-by-id.use-case';
import { UpdateTaskUseCase } from './update-task.use-case';

const ID = '507f1f77bcf86cd799439011';
const makeTask = (status = TaskStatus.PENDING) =>
  Object.assign(new Task(), { id: ID, title: 'Escribir informe', status });

describe('task business rules', () => {
  const taskRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<TaskRepository>;

  beforeEach(() => {
    jest.resetAllMocks();
    taskRepository.save.mockImplementation(async (task) => task);
  });

  describe('CreateTaskUseCase', () => {
    it('creates a pending task and stores an empty description as null', async () => {
      const task = await new CreateTaskUseCase(taskRepository).execute({ title: 'Nueva', description: '' });

      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.description).toBeNull();
      expect(taskRepository.save).toHaveBeenCalledWith(task);
    });
  });

  describe('FindTaskByIdUseCase', () => {
    it('404 when the task does not exist', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(new FindTaskByIdUseCase(taskRepository).execute(ID)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('UpdateTaskUseCase', () => {
    const useCase = new UpdateTaskUseCase(taskRepository);

    it('400 when no field is sent', async () => {
      await expect(useCase.execute(ID, {})).rejects.toMatchObject({ statusCode: 400 });
      expect(taskRepository.findById).not.toHaveBeenCalled();
    });

    it('404 when the task does not exist', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(ID, { title: 'Otro' })).rejects.toMatchObject({ statusCode: 404 });
      expect(taskRepository.save).not.toHaveBeenCalled();
    });

    it('updates the fields without touching the status', async () => {
      taskRepository.findById.mockResolvedValue(makeTask(TaskStatus.IN_PROGRESS));

      const updated = await useCase.execute(ID, { title: 'Otro título', description: null });

      expect(updated.title).toBe('Otro título');
      expect(updated.description).toBeNull();
      expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('ChangeTaskStatusUseCase', () => {
    const useCase = new ChangeTaskStatusUseCase(taskRepository);

    it('404 when the task does not exist', async () => {
      taskRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(ID, TaskStatus.IN_PROGRESS)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('409 when the task already has that status', async () => {
      taskRepository.findById.mockResolvedValue(makeTask(TaskStatus.IN_PROGRESS));

      await expect(useCase.execute(ID, TaskStatus.IN_PROGRESS)).rejects.toMatchObject({ statusCode: 409 });
      expect(taskRepository.save).not.toHaveBeenCalled();
    });

    it('moves the task to the new status', async () => {
      taskRepository.findById.mockResolvedValue(makeTask());

      const updated = await useCase.execute(ID, TaskStatus.IN_PROGRESS);

      expect(updated.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('CompleteTaskUseCase', () => {
    const useCase = new CompleteTaskUseCase(new ChangeTaskStatusUseCase(taskRepository));

    it('completes the task and records completedAt', async () => {
      taskRepository.findById.mockResolvedValue(makeTask(TaskStatus.IN_PROGRESS));

      const completed = await useCase.execute(ID);

      expect(completed.status).toBe(TaskStatus.COMPLETED);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('409 when the task is already completed', async () => {
      taskRepository.findById.mockResolvedValue(makeTask(TaskStatus.COMPLETED));

      await expect(useCase.execute(ID)).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('DeleteTaskUseCase', () => {
    const useCase = new DeleteTaskUseCase(taskRepository);

    it('404 when the task does not exist', async () => {
      taskRepository.delete.mockResolvedValue(false);

      await expect(useCase.execute(ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('deletes an existing task', async () => {
      taskRepository.delete.mockResolvedValue(true);

      await expect(useCase.execute(ID)).resolves.toBeUndefined();
      expect(taskRepository.delete).toHaveBeenCalledWith(ID);
    });
  });
});
