import { ChangeTaskStatusUseCase } from './modules/task/application/change-task-status.use-case';
import { CompleteTaskUseCase } from './modules/task/application/complete-task.use-case';
import { CreateTaskUseCase } from './modules/task/application/create-task.use-case';
import { DeleteTaskUseCase } from './modules/task/application/delete-task.use-case';
import { FindAllTasksUseCase } from './modules/task/application/find-all-tasks.use-case';
import { FindTaskByIdUseCase } from './modules/task/application/find-task-by-id.use-case';
import { UpdateTaskUseCase } from './modules/task/application/update-task.use-case';
import { TaskController } from './modules/task/infrastructure/http/task.controller';
import { MongooseTaskRepository } from './modules/task/infrastructure/persistence/mongoose-task.repository';

export const buildContainer = () => {
  const taskRepository = new MongooseTaskRepository();
  const changeTaskStatusUseCase = new ChangeTaskStatusUseCase(taskRepository);

  const taskController = new TaskController(
    new CreateTaskUseCase(taskRepository),
    new UpdateTaskUseCase(taskRepository),
    changeTaskStatusUseCase,
    new CompleteTaskUseCase(changeTaskStatusUseCase),
    new DeleteTaskUseCase(taskRepository),
    new FindAllTasksUseCase(taskRepository),
    new FindTaskByIdUseCase(taskRepository),
  );

  return { taskController };
};

export type Container = ReturnType<typeof buildContainer>;
