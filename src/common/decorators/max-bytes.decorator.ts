import { ValidateBy, type ValidationOptions } from 'class-validator';

export const MaxBytes = (max: number, options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'maxBytes',
      constraints: [max],
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value) <= max,
      },
    },
    options,
  );
