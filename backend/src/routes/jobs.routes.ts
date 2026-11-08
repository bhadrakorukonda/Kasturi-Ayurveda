import { Router } from 'express';
import { runJobs } from '../controllers/jobs.controller';

const router = Router();

// Called by the GitHub Actions schedule (.github/workflows/scheduled-jobs.yml).
router.post('/run', runJobs);

export default router;
