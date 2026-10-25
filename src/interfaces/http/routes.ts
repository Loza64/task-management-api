import { Router } from 'express';
import { Container } from '../../composition-root';
import { buildTaskRouter } from '../../modules/task/infrastructure/http/task.routes';

export const buildApiRouter = (container: Container): Router => {
  const router = Router();

  router.use('/tasks', buildTaskRouter(container.taskController));

  return router;
};
