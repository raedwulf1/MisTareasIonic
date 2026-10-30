import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/modal-controller';
import { Platform } from '@ionic/angular/platform';

import { CATEGORY_COLORS, Category } from '../../core/models/todo.models';
import { CategoryEditorComponent } from './category-editor.component';

describe('CategoryEditorComponent', () => {
  let fixture: ComponentFixture<CategoryEditorComponent>;
  let el: HTMLElement;
  const modal = { dismiss: vi.fn() };

  async function render(category: Category | null = null): Promise<void> {
    fixture = TestBed.createComponent(CategoryEditorComponent);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  function button(text: string): HTMLElement & { disabled: boolean } {
    return Array.from(el.querySelectorAll('ion-button')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLElement & { disabled: boolean };
  }

  async function typeName(value: string): Promise<void> {
    const input = el.querySelector('ion-input') as HTMLElement & { value: string };
    input.value = value;
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const swatches = () => Array.from(el.querySelectorAll<HTMLElement>('.swatch'));

  beforeEach(() => {
    localStorage.clear();
    modal.dismiss.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: ModalController, useValue: modal },
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
  });

  it('en modo creación muestra el título "Nueva" y Guardar deshabilitado', async () => {
    await render();
    expect(el.querySelector('ion-title')?.textContent).toContain('Nueva');
    expect(button('Guardar').disabled).toBe(true);
  });

  it('en modo edición muestra "Editar" con el nombre y el color de la categoría', async () => {
    await render({ id: 'x', name: 'Casa', color: CATEGORY_COLORS[3] });
    expect(el.querySelector('ion-title')?.textContent).toContain('Editar');
    expect((el.querySelector('ion-input') as HTMLElement & { value: string }).value).toBe('Casa');
    expect(swatches()[3].classList).toContain('selected');
  });

  it('muestra una muestra por cada color disponible', async () => {
    await render();
    expect(swatches()).toHaveLength(CATEGORY_COLORS.length);
  });

  it('al crear, preselecciona el siguiente color de la paleta', async () => {
    await render();
    // El store trae 3 categorías por defecto → el siguiente color es el índice 3.
    expect(swatches()[3].classList).toContain('selected');
    expect(swatches()[3].getAttribute('aria-checked')).toBe('true');
  });

  it('tocar una muestra cambia el color seleccionado', async () => {
    await render();
    swatches()[5].click();
    fixture.detectChanges();
    expect(swatches()[5].classList).toContain('selected');
    expect(swatches()[3].classList).not.toContain('selected');
  });

  it('muestra un error y deshabilita Guardar si el nombre ya existe', async () => {
    await render();
    await typeName('trabajo');
    expect(el.querySelector('.error')?.textContent).toContain('Ya existe una categoría');
    expect(button('Guardar').disabled).toBe(true);
  });

  it('al editar, su propio nombre no cuenta como duplicado', async () => {
    await render({ id: 'trabajo', name: 'Trabajo', color: CATEGORY_COLORS[1] });
    expect(el.querySelector('.error')).toBeNull();
  });

  it('guardar devuelve nombre recortado y color con rol "save"', async () => {
    await render();
    await typeName('  Gimnasio ');
    swatches()[2].click();
    button('Guardar').click();
    expect(modal.dismiss).toHaveBeenCalledWith(
      { name: 'Gimnasio', color: CATEGORY_COLORS[2] },
      'save',
    );
  });

  it('guardar con nombre vacío no cierra el modal', async () => {
    await render();
    fixture.componentInstance.save();
    expect(modal.dismiss).not.toHaveBeenCalled();
  });

  it('cancelar cierra el modal con rol "cancel"', async () => {
    await render();
    button('Cancelar').click();
    expect(modal.dismiss).toHaveBeenCalledWith(null, 'cancel');
  });
});
