import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type CreateCategoryFormModel from '@model/categories/create-category-form.model';

export default function createCategoryFormSchema(
  path: SchemaPathTree<CreateCategoryFormModel>,
): void {
  required(path.name, {
    message: 'El nombre de la categoría es obligatorio.',
  });

  validate(path.name, ({ value }) => {
    const name: string = value().trim();

    if (name.length === 0) {
      return {
        kind: 'blankName',
        message: 'El nombre no puede contener solamente espacios.',
      };
    }

    if (Array.from(name).length > 100) {
      return {
        kind: 'nameTooLong',
        message: 'El nombre no puede superar los 100 caracteres.',
      };
    }

    return undefined;
  });
}
