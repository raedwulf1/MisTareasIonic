import { Category } from '../../domain/entities/category';
import { CategoryDto } from '../dtos/category.dto';

/** Convierte entre la categoría del dominio y su formato persistido. */
export const CategoryMapper = {
  toDto(category: Category): CategoryDto {
    return { id: category.id, name: category.name, color: category.color };
  },

  /** `null` si el registro guardado está dañado (sin `id` o nombre válidos). */
  toDomain(raw: unknown): Category | null {
    if (typeof raw !== 'object' || raw === null) {
      return null;
    }
    const r = raw as Record<string, unknown>;
    if (typeof r['id'] !== 'string' || typeof r['name'] !== 'string') {
      return null;
    }
    return {
      id: r['id'],
      name: r['name'],
      color: typeof r['color'] === 'string' ? r['color'] : '#5f6b7a',
    };
  },

  /**
   * Lista persistida → categorías (descarta registros dañados). Devuelve `null` si lo
   * guardado no es una lista, para que el repositorio use las categorías por defecto;
   * una lista vacía es válida (el usuario eliminó todas).
   */
  toDomainList(raw: unknown): Category[] | null {
    if (!Array.isArray(raw)) {
      return null;
    }
    return raw.flatMap((item) => CategoryMapper.toDomain(item) ?? []);
  },

  toDtoList(categories: readonly Category[]): CategoryDto[] {
    return categories.map(CategoryMapper.toDto);
  },
};
