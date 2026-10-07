import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const res = exception.getResponse() as any;
    if (res && res.message && Array.isArray(res.message)) {
      const errors: Record<string, string[]> = {};
      res.message.forEach((m: string) => {
        const [key, ...rest] = m.split(':');
        if (rest.length) {
          errors[key.trim()] = [rest.join(':').trim()];
        } else {
          errors.general = errors.general || [];
          errors.general.push(m);
        }
      });
      return response.status(status).json({
        status: false,
        message: 'Please correct the highlighted fields.',
        errors,
      });
    }
    return response.status(status).json({
      status: false,
      message: res?.message || 'Bad request',
      errors: res?.errors || {},
    });
  }
}
