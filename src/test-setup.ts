import { beforeEach } from 'vitest';

/**
 * Aísla las preferencias de espacios entre tests.
 *
 * Los tests que verifican la persistencia pueden
 * escribir en localStorage después de esta limpieza.
 */
beforeEach((): void => {
  const keys: string[] = [];

  for (let index: number = 0; index < localStorage.length; index++) {
    const key: string | null = localStorage.key(index);

    if (key !== null && key.startsWith('gastos.selected-space.v1.')) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    localStorage.removeItem(key);
  }
});
