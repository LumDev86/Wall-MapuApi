import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? '',
  port: parseInt(process.env.MAIL_PORT ?? '0', 10),
  user: process.env.MAIL_USER ?? '',
  pass: process.env.MAIL_PASS ?? '',
  from: process.env.MAIL_FROM ?? 'no-reply@example.com',
}));
