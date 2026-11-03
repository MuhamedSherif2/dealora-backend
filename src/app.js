import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { language } from './middlewares/language.js';
import { apiLimiter } from './middlewares/rateLimiters.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.set('trust proxy', 1); // behind Render / Railway / Nginx
app.use(helmet());
app.use(cors({ origin: env.clientUrls, credentials: true }));
if (env.nodeEnv !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // blocks NoSQL injection ($ and . in keys)
app.use(language);

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
