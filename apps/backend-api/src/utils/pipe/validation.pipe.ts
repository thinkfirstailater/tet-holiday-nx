import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  const errorQueue: { parentField?: string; error: ValidationError }[] = errors.map((error) => ({ error }));

  while (errorQueue.length) {
    const item = errorQueue.pop();
    if (!item) break;

    const { parentField, error } = item;
    if (error.constraints) {
      messages.push(
        ...Object.values(error.constraints).map((constraint) =>
          parentField ? `${parentField}.${constraint}` : constraint
        )
      );
    }

    if (error.children) {
      errorQueue.push(
        ...error.children.map((e) => ({
          error: e,
          parentField: parentField ? `${parentField}.${error.property}` : error.property,
        }))
      );
    }
  }

  return messages;
}

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  async transform(value: never, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value, {
      excludeExtraneousValues: true,
    });
    const errors = await validate(object, { forbidUnknownValues: false });
    
    if (errors.length > 0) {
      const messages = formatValidationErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
