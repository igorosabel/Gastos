import type CreateSpaceFormModel from '@model/spaces/create-space-form.model';

export default function createSpaceFormInitialValue(): CreateSpaceFormModel {
  return {
    name: '',
  };
}
